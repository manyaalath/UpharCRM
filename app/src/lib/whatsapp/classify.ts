// Classify an inbound WhatsApp reply into a workflow branch.
// Works for both interactive button payloads and free text (EN + common Hindi).

export type ReplyClass = 'positive' | 'negative' | 'unknown';

const NEGATIVE = [
  'not received', 'not_received', 'no', 'not got', 'nahi mila', 'nahi', 'issue',
  'problem', 'complaint', 'missing', 'wrong', 'damaged', 'n',
];
const POSITIVE = [
  'received', 'received it', 'yes', 'got it', 'confirm', 'confirmed', 'ok', 'okay',
  'mil gaya', 'mila', 'haan', 'ha', 'y', 'done', 'thanks',
];

export function classifyReply(text?: string, buttonPayload?: string): ReplyClass {
  const s = (buttonPayload || text || '').trim().toLowerCase();
  if (!s) return 'unknown';

  // Check negative first — "not received" contains "received".
  if (NEGATIVE.some((k) => s === k || s.includes(k))) return 'negative';
  if (POSITIVE.some((k) => s === k || s.includes(k))) return 'positive';
  return 'unknown';
}
