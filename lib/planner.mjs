// Deterministic prototype planner. It neither calls an LLM nor contacts services.
export const demoBusy = [
  { start: '2026-10-13T13:00:00Z', end: '2026-10-13T14:00:00Z' },
  { start: '2026-10-13T15:00:00Z', end: '2026-10-13T15:30:00Z' },
  { start: '2026-10-13T17:00:00Z', end: '2026-10-13T18:00:00Z' }
];

export function findFreeSlots(busy, start, end, durationMinutes = 30, bufferMinutes = 10) {
  const lo = Date.parse(start), hi = Date.parse(end);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo >= hi || durationMinutes <= 0 || bufferMinutes < 0) {
    throw new Error('Invalid scheduling window');
  }
  const buffer = bufferMinutes * 60000, duration = durationMinutes * 60000;
  const intervals = busy.map(b => [Date.parse(b.start) - buffer, Date.parse(b.end) + buffer]);
  if (intervals.some(([a, b]) => !Number.isFinite(a) || !Number.isFinite(b) || a > b)) throw new Error('Invalid busy interval');
  const sorted = intervals.filter(([a, b]) => b > lo && a < hi).sort((a, b) => a[0] - b[0]);
  const gaps = [];
  let cursor = lo;
  for (const [a, b] of sorted) {
    if (a > cursor) gaps.push([cursor, Math.min(a, hi)]);
    cursor = Math.max(cursor, b);
    if (cursor >= hi) break;
  }
  if (cursor < hi) gaps.push([cursor, hi]);
  return gaps.filter(([a, b]) => b - a >= duration).slice(0, 3)
    .map(([a]) => ({ start: new Date(a).toISOString(), end: new Date(a + duration).toISOString() }));
}

export function planRequest(text) {
  const input = text.toLowerCase();
  const base = { source: 'Your request', evidence: ['Prototype rules matched your text. No external account was read.'], executionMode: 'simulation', requiresApproval: true };
  const scheduling = /\b(schedule|meeting|calendar|book|focus)\b/.test(input);
  const followup = /\b(email|message|follow.?up|reply|send)\b/.test(input);
  const brief = /\b(brief|summar|digest)\b/.test(input);
  // Multi-intent requests require clarification instead of silently dropping work.
  if ([scheduling, followup, brief].filter(Boolean).length > 1) {
    return { ...base, kind: 'clarify', title: 'Separate this into individual tasks', blocked: true, risk: 'Review', explanation: 'This prototype handles one intent at a time. Submit scheduling, messaging, and briefing requests separately.', steps: [], slots: [] };
  }
  if (scheduling) {
    const slots = findFreeSlots(demoBusy, '2026-10-13T13:00:00Z', '2026-10-13T21:00:00Z');
    return { ...base, kind: 'schedule', title: 'Find a meeting slot', risk: 'Calendar write', explanation: 'Finds free gaps in the fixed demo calendar, allowing a 10-minute buffer. Approval simulates a booking in the first gap.', evidence: [...base.evidence, 'Fixed sample: October 13, 2026, 9 AM–5 PM America/New_York.'], slots, steps: ['Read sample calendar', 'Find and rank available gaps', 'Request your approval', 'Simulate booking the first slot'] };
  }
  if (followup) {
    return { ...base, kind: 'followup', title: 'Prepare a follow-up', risk: 'External message', explanation: 'Draft first, then request approval. This demo does not infer recipients or send messages.', slots: [], draft: 'Hi — following up on our conversation. Could you share an update when you have a moment? Thanks!', steps: ['Read your request', 'Create a sample draft', 'Request your approval', 'Simulate sending the displayed draft'] };
  }
  if (brief) {
    return { ...base, kind: 'brief', title: 'Prepare a daily brief', risk: 'Local output', explanation: 'Assembles a sample brief from local fixture data. A production brief would cite connected sources.', slots: [], draft: 'Sample brief: 3 calendar blocks today. Review your pending approvals before starting new automations.', steps: ['Read sample activity', 'Assemble the sample brief', 'Request your approval', 'Save a simulated brief result'] };
  }
  return { ...base, kind: 'clarify', title: 'More detail needed', blocked: true, risk: 'Review', explanation: 'Try “schedule a meeting”, “draft a follow-up email”, or “prepare my daily brief”. Custom requests need a production planner.', slots: [], steps: [] };
}
