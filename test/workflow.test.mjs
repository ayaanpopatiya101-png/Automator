import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findFreeSlots, planRequest } from '../lib/planner.mjs';
import { makeServer } from '../server.mjs';

test('scheduler merges overlapping blocks and respects buffers and duration', () => {
  const busy = [{ start: '2026-10-13T09:00Z', end: '2026-10-13T10:00Z' }, { start: '2026-10-13T09:30Z', end: '2026-10-13T11:00Z' }];
  assert.deepEqual(findFreeSlots(busy, '2026-10-13T09:00Z', '2026-10-13T12:00Z'), [{ start: '2026-10-13T11:10:00.000Z', end: '2026-10-13T11:40:00.000Z' }]);
  assert.deepEqual(findFreeSlots(busy, '2026-10-13T09:00Z', '2026-10-13T11:30Z'), []);
  assert.throws(() => findFreeSlots([], 'bad', 'bad'), /Invalid/);
});

test('planner clarifies unsupported and mixed intents without claiming real integration', () => {
  assert.equal(planRequest('buy a computer').blocked, true);
  assert.equal(planRequest('schedule a meeting and send an email').blocked, true);
  assert.equal(planRequest('Schedule a meeting').executionMode, 'simulation');
  assert.equal(planRequest('Draft a follow-up email').requiresApproval, true);
});

test('API requires approval, persists work, rejects unsafe mutations, and recovers without duplicating results', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'automator-test-'));
  const file = join(dir, 'state.json');
  let server = await makeServer(file);
  const start = async () => { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); return `http://127.0.0.1:${server.address().port}`; };
  let base = await start();
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(dir, { recursive: true, force: true }); });
  const post = async (path, data, extraHeaders = {}) => {
    const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extraHeaders }, body: JSON.stringify(data) });
    return { status: response.status, body: await response.json() };
  };
  assert.equal((await fetch(base + '/api/health')).status, 200);
  assert.match(await (await fetch(base)).text(), /Command center/);
  assert.equal((await fetch(base + '/missing')).status, 404);
  assert.equal((await post('/api/tasks', null)).status, 400);
  assert.equal((await post('/api/tasks', { text: 'meeting', key: 'x' }, { Origin: 'https://other.example' })).status, 403);
  const special = await post('/api/tasks', { text: 'meeting', key: '__proto__' });
  assert.equal(special.status, 201);
  assert.equal((await post('/api/tasks', { text: 'meeting', key: '__proto__' })).body.id, special.body.id);
  const request = { text: 'Schedule a meeting', key: 'integration-1' };
  const created = await post('/api/tasks', request);
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.equal((await post('/api/tasks', request)).body.id, id);
  assert.equal((await post('/api/tasks', { ...request, text: 'Draft an email' })).status, 409);
  assert.equal((await post(`/api/tasks/${id}/run`, {})).status, 409);
  assert.equal((await post(`/api/tasks/${id}/approve`, {})).body.status, 'approved');
  await post('/api/connectors/calendar', { enabled: false });
  assert.equal((await post(`/api/tasks/${id}/run`, {})).body.status, 'failed');
  await post('/api/connectors/calendar', { enabled: true });
  const results = await Promise.all([post(`/api/tasks/${id}/run`, {}), post(`/api/tasks/${id}/run`, {})]);
  assert.ok(results.every(r => r.body.status === 'completed'));
  let state = await (await fetch(base + '/api/state')).json();
  assert.equal(state.events.filter(e => e.taskId === id && e.type === 'completed').length, 1);
  assert.equal(state.tasks.find(task => task.id === id).attempts, 2);
  const mail = (await post('/api/tasks', { text: 'Draft a follow-up email', key: 'mail-1' })).body;
  assert.equal((await post(`/api/tasks/${mail.id}/reject`, {})).body.status, 'rejected');
  assert.equal((await post(`/api/tasks/${mail.id}/run`, {})).status, 409);
  const brief = (await post('/api/tasks', { text: 'Prepare a daily brief', key: 'brief-1' })).body;
  await post(`/api/tasks/${brief.id}/approve`, {});
  assert.equal((await post(`/api/tasks/${brief.id}/run`, {})).body.status, 'completed');
  await new Promise(resolve => server.close(resolve));
  server = await makeServer(file); base = await start();
  state = await (await fetch(base + '/api/state')).json();
  assert.equal(state.tasks.find(task => task.id === id).status, 'completed');
  assert.equal((await post('/api/tasks', request)).body.id, id);
});
