export function friendlyBriefingConversationError(value: unknown): string {
  const message = value instanceof Error ? value.message : String(value ?? '');
  const normalized = message.toLowerCase();

  if (/rate|too many|settle|shortly/.test(normalized)) {
    return 'Let this one settle, then ask me again shortly.';
  }
  if (/unauthor|session|sign.?in|jwt/.test(normalized)) {
    return 'Your session has gone quiet. Sign in again, then ask me once more.';
  }
  if (/timeout|timed out|network|fetch|failed to send|edge function/.test(normalized)) {
    return "I couldn't reach the briefing just then. Your question is still here.";
  }
  if (/not ready|not found/.test(normalized)) {
    return "This briefing isn't ready for questions yet.";
  }
  return 'I lost the thread for a moment. Your question is still here.';
}
