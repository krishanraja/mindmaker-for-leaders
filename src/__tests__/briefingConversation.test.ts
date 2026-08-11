import { describe, expect, it } from 'vitest';
import { friendlyBriefingConversationError } from '@/lib/briefingConversation';

describe('friendlyBriefingConversationError', () => {
  it('turns transport errors into a human, recoverable message', () => {
    expect(friendlyBriefingConversationError(new Error('Failed to send a request to the Edge Function')))
      .toBe("I couldn't reach the briefing just then. Your question is still here.");
  });

  it('keeps rate limits and expired sessions specific', () => {
    expect(friendlyBriefingConversationError('Too many requests'))
      .toBe('Let this one settle, then ask me again shortly.');
    expect(friendlyBriefingConversationError('Unauthorized JWT'))
      .toBe('Your session has gone quiet. Sign in again, then ask me once more.');
  });

  it('never exposes an unknown technical error', () => {
    expect(friendlyBriefingConversationError('database connection refused'))
      .toBe('I lost the thread for a moment. Your question is still here.');
  });
});
