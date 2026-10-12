const $ = selector => document.querySelector(selector);
const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
const statusLabels = { awaiting_approval: 'Needs approval', approved: 'Ready to simulate', completed: 'Simulation complete', failed: 'Needs recovery', rejected: 'Declined', needs_details: 'Needs details' };
let state;
async function api(path, data) {
  const response = await fetch(path, data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}
function notify(text, error = false) { $('#notification').textContent = text; $('#notification').classList.toggle('error', error); }
async function refresh() { state = await api('/api/state'); render(); }
async function action(button, fn) {
  button.disabled = true;
  try { await fn(); await refresh(); notify('Workspace updated.'); }
  catch (error) { notify(error.message, true); }
  finally { button.disabled = false; }
}
function control(text, className, handler) { const button = el('button', className, text); button.type = 'button'; button.addEventListener('click', () => action(button, handler)); return button; }
function formatSlot(slot) {
  const format = date => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }).format(new Date(date));
  return `${format(slot.start)}–${format(slot.end)} ET`;
}
function render() {
  $('#stat-queue').textContent = state.tasks.filter(t => !['completed', 'rejected'].includes(t.status)).length;
  $('#stat-approval').textContent = state.tasks.filter(t => t.status === 'awaiting_approval').length;
  $('#stat-completed').textContent = state.tasks.filter(t => t.status === 'completed').length;
  $('#task-count').textContent = `${state.tasks.length} task${state.tasks.length === 1 ? '' : 's'}`;
  const list = $('#task-list'); list.replaceChildren();
  if (!state.tasks.length) {
    const empty = el('div', 'empty-state'); empty.append(el('div', 'empty-icon', '↗'), el('h3', '', 'Your next move starts here'), el('p', '', 'Create a plan above to see its steps, evidence, and approval controls.')); list.append(empty);
  }
  for (const task of state.tasks) {
    const card = el('article', 'task-card');
    const head = el('div', 'task-head'); const title = el('div', 'task-title'); title.append(el('span', 'task-symbol', task.kind === 'schedule' ? '◷' : task.kind === 'followup' ? '✉' : '✦'), el('h3', '', task.title)); head.append(title, el('span', `status status-${task.status}`, statusLabels[task.status]));
    card.append(head, el('p', 'request-copy', task.request), el('p', 'explanation', task.explanation));
    if (task.slots.length) { const slots = el('div', 'slots'); task.slots.forEach((slot, i) => slots.append(el('span', i === 0 ? 'slot selected' : 'slot', `${formatSlot(slot)}${i === 0 ? ' · Proposed' : ''}`))); card.append(slots); }
    if (task.draft) card.append(el('blockquote', 'draft', task.draft));
    const details = el('details', 'plan-details'); details.append(el('summary', '', 'View plan & evidence'));
    const steps = el('ol'); task.steps.forEach(step => steps.append(el('li', '', step))); details.append(steps);
    task.evidence.forEach(item => details.append(el('p', 'evidence', item))); card.append(details);
    if (task.result) card.append(el('div', 'result', task.result));
    const bottom = el('div', 'task-bottom'); bottom.append(el('span', 'risk', `Scope: ${task.risk}`)); const buttons = el('div', 'task-buttons');
    const act = verb => () => api(`/api/tasks/${task.id}/${verb}`, {});
    if (task.status === 'awaiting_approval') buttons.append(control('Decline', 'secondary', act('reject')), control('Approve plan', 'primary', act('approve')));
    if (['approved', 'failed'].includes(task.status)) buttons.append(control('Cancel', 'secondary', act('reject')), control(task.status === 'failed' ? 'Retry simulation' : 'Run simulation', 'primary', act('run')));
    bottom.append(buttons); card.append(bottom); list.append(card);
  }
  const connectors = $('#connector-list'); connectors.replaceChildren();
  for (const [name, enabled] of Object.entries(state.connectors)) {
    const row = el('div', 'connector'); const icon = el('span', `connector-icon ${name}`, name === 'calendar' ? '◷' : '✉'); const label = el('div', 'connector-label'); label.append(el('strong', '', name === 'calendar' ? 'Calendar fixture' : 'Mail simulation'), el('small', enabled ? 'Available locally' : 'Paused · execution will fail'));
    row.append(icon, label, control(enabled ? 'Pause' : 'Restore', 'connector-button', () => api(`/api/connectors/${name}`, { enabled: !enabled }))); connectors.append(row);
  }
  const events = $('#event-list'); events.replaceChildren();
  if (!state.events.length) events.append(el('p', 'empty-activity', 'Your decisions and results will appear here.'));
  for (const event of state.events.slice(0, 6)) {
    const row = el('div', 'event'); const content = el('div'); content.append(el('strong', '', event.type.replaceAll('_', ' ')), el('p', '', event.detail), el('small', '', new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).format(new Date(event.at)) + ' ET')); row.append(el('span', 'event-dot'), content); events.append(row);
  }
}
$('#request-form').addEventListener('submit', async event => {
  event.preventDefault();
  const text = $('#request').value.trim(); if (!text) return;
  await action($('#plan-button'), async () => { await api('/api/tasks', { text, key: crypto.randomUUID() }); $('#request').value = ''; });
});
document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => { $('#request').value = button.dataset.prompt; $('#request').focus(); }));
refresh().catch(error => notify(`Unable to load workspace: ${error.message}`, true));
