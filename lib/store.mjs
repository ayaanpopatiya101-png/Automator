import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { planRequest } from './planner.mjs';

export async function createStore(file) {
  let state;
  try { state = JSON.parse(await readFile(file, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    state = { tasks: [], events: [], connectors: { calendar: true, mail: true }, requests: {} };
  }
  const save = async () => {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file + '.tmp', JSON.stringify(state, null, 2), { mode: 0o600 });
    await rename(file + '.tmp', file);
  };
  const log = (taskId, type, detail) => state.events.unshift({ id: randomUUID(), taskId, type, detail, at: new Date().toISOString() });
  // Serialize all mutations: approval, execution, persistence, and idempotency.
  let queue = Promise.resolve();
  function mutate(fn) {
    const work = queue.then(async () => {
      const before = structuredClone(state);
      try { const result = fn(); await save(); return structuredClone(result); }
      catch (error) { state = before; throw error; }
    });
    queue = work.catch(() => {});
    return work;
  }
  return {
    async snapshot() { await queue; return structuredClone(state); },
    create(text, key) {
      return mutate(() => {
        if (Object.hasOwn(state.requests, key)) {
          const prior = state.tasks.find(t => t.id === state.requests[key]);
          if (prior.request !== text) throw new Error('Request key already used for different content');
          return prior;
        }
        const plan = planRequest(text);
        const task = { id: randomUUID(), request: text, ...plan, status: plan.blocked ? 'needs_details' : 'awaiting_approval', createdAt: new Date().toISOString(), attempts: 0 };
        state.tasks.unshift(task);
        Object.defineProperty(state.requests, key, { value: task.id, enumerable: true, writable: true, configurable: true });
        log(task.id, 'planned', plan.explanation);
        return task;
      });
    },
    act(id, action) {
      return mutate(() => {
        const task = state.tasks.find(t => t.id === id);
        if (!task) throw new Error('Task not found');
        if (action === 'reject') {
          if (!['awaiting_approval', 'approved', 'failed'].includes(task.status)) throw new Error('This task cannot be rejected');
          task.status = 'rejected'; log(id, 'rejected', 'You declined the proposed action.');
        } else if (action === 'approve') {
          if (task.status !== 'awaiting_approval') throw new Error('This task is not waiting for approval');
          task.status = 'approved'; log(id, 'approved', 'You approved the displayed simulation plan.');
        } else if (action === 'run') {
          if (task.status === 'completed') return task; // repeated executions cannot duplicate a result
          if (!['approved', 'failed'].includes(task.status)) throw new Error('Approve the plan before running it');
          task.attempts++;
          const connector = task.kind === 'schedule' ? 'calendar' : task.kind === 'followup' ? 'mail' : null;
          if (connector && !state.connectors[connector]) {
            task.status = 'failed'; log(id, 'failed', `${connector} demo connector is paused. Restore it and retry the approved plan.`);
          } else {
            task.status = 'completed'; task.result = task.kind === 'schedule' ? `Simulated booking: ${task.slots[0].start}` : `Simulated output: ${task.draft}`;
            task.completedAt = new Date().toISOString(); log(id, 'completed', task.result);
          }
        } else throw new Error('Unknown action');
        return task;
      });
    },
    connector(name, enabled) {
      return mutate(() => {
        if (!Object.hasOwn(state.connectors, name)) throw new Error('Unknown connector');
        state.connectors[name] = enabled;
        log(null, 'connector', `${name} demo connector ${enabled ? 'restored' : 'paused'}.`);
        return state.connectors;
      });
    }
  };
}
