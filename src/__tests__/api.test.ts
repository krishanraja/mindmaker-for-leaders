/**
 * API Layer Tests
 *
 * Tests invokeEdgeFunction error handling, timeout behavior,
 * transcribeAudio, and various api methods.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Supabase mock setup ---

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
  },
}));

// Import after mock is set up
import { invokeEdgeFunction, api } from '@/lib/api';

describe('invokeEdgeFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return data on successful invocation', async () => {
    mockInvoke.mockResolvedValue({
      data: { result: 'success' },
      error: null,
    });

    const result = await invokeEdgeFunction<{ result: string }>('test-function', { key: 'value' });

    expect(result).toEqual({ result: 'success' });
    expect(mockInvoke).toHaveBeenCalledWith('test-function', { body: { key: 'value' } });
  });

  it('should throw with error message when invocation returns an error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Function not found' },
    });

    await expect(invokeEdgeFunction('missing-function')).rejects.toThrow('Function not found');
  });

  it('should extract error detail from error.context.json() when available', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        message: 'FunctionsHttpError',
        context: {
          json: vi.fn().mockResolvedValue({ error: 'Detailed error from edge function' }),
        },
      },
    });

    await expect(invokeEdgeFunction('failing-function')).rejects.toThrow(
      'Detailed error from edge function'
    );
  });

  it('should fall back to error.message when context.json() throws', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        message: 'FunctionsHttpError',
        context: {
          json: vi.fn().mockRejectedValue(new Error('Not parseable')),
        },
      },
    });

    await expect(invokeEdgeFunction('failing-function')).rejects.toThrow('FunctionsHttpError');
  });

  it('should fall back to generic message when error has no message', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {},
    });

    await expect(invokeEdgeFunction('some-function')).rejects.toThrow(
      'Failed to call some-function'
    );
  });

  it('should time out when the function takes too long', async () => {
    // Make invoke hang indefinitely
    mockInvoke.mockReturnValue(new Promise(() => {}));

    // Use a very short timeout so the test doesn't actually wait long
    await expect(invokeEdgeFunction('slow-function', undefined, 50)).rejects.toThrow(
      'slow-function timed out after 0.05s'
    );
  });

  it('should call invoke without body when no payload is provided', async () => {
    mockInvoke.mockResolvedValue({
      data: { ok: true },
      error: null,
    });

    await invokeEdgeFunction('no-payload-function');

    expect(mockInvoke).toHaveBeenCalledWith('no-payload-function', { body: undefined });
  });
});

describe('api.transcribeAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock crypto.randomUUID for sessionId generation
    vi.stubGlobal('crypto', {
      ...crypto,
      randomUUID: vi.fn(() => 'mock-uuid-1234'),
    });
  });

  it('should send audio blob as FormData and return transcript', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        transcript: 'Hello world',
        confidence: 0.95,
        duration_seconds: 3.2,
        provider: 'whisper',
      },
      error: null,
    });

    const blob = new Blob(['fake-audio-data'], { type: 'audio/webm' });
    const result = await api.transcribeAudio(blob);

    expect(result.transcript).toBe('Hello world');
    expect(result.confidence).toBe(0.95);
    expect(result.provider).toBe('whisper');

    // Verify FormData was passed
    const callArgs = mockInvoke.mock.calls[0];
    expect(callArgs[0]).toBe('voice-transcribe');
    const body = callArgs[1].body;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('sessionId')).toBe('mock-uuid-1234');
    expect(body.get('audio')).toBeInstanceOf(Blob);
  });

  it('should use provided sessionId instead of generating one', async () => {
    mockInvoke.mockResolvedValue({
      data: { transcript: 'test', confidence: 1.0 },
      error: null,
    });

    const blob = new Blob(['audio'], { type: 'audio/webm' });
    await api.transcribeAudio(blob, 'custom-session-id');

    const body = mockInvoke.mock.calls[0][1].body as FormData;
    expect(body.get('sessionId')).toBe('custom-session-id');
  });

  it('should throw with error details on failure', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Transcription failed',
        context: {
          json: vi.fn().mockResolvedValue({
            error: 'Audio too short',
            fallback_available: true,
          }),
        },
      },
    });

    const blob = new Blob(['audio'], { type: 'audio/webm' });

    try {
      await api.transcribeAudio(blob);
      expect.fail('Should have thrown');
    } catch (err) {
      const e = err as { message?: string; fallbackAvailable?: boolean };
      expect(e.message).toBe('Audio too short');
      expect(e.fallbackAvailable).toBe(true);
    }
  });

  it('should set fallbackAvailable to false when not in error body', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Server error',
        context: {
          json: vi.fn().mockResolvedValue({ error: 'Internal error' }),
        },
      },
    });

    const blob = new Blob(['audio'], { type: 'audio/webm' });

    try {
      await api.transcribeAudio(blob);
      expect.fail('Should have thrown');
    } catch (err) {
      const e = err as { message?: string; fallbackAvailable?: boolean };
      expect(e.message).toBe('Internal error');
      expect(e.fallbackAvailable).toBe(false);
    }
  });

  it('should time out after the transcription timeout', async () => {
    mockInvoke.mockReturnValue(new Promise(() => {}));

    const blob = new Blob(['audio'], { type: 'audio/webm' });

    // The transcription timeout (150s) is too long to wait on in real time, so
    // we drive it with fake timers and advance past it.
    vi.useFakeTimers();

    const promise = api.transcribeAudio(blob);
    const expectation = expect(promise).rejects.toThrow('voice-transcribe timed out after 150s');

    // Advance past the 150s transcription timeout.
    await vi.advanceTimersByTimeAsync(151_000);
    await expectation;

    vi.useRealTimers();
  });
});

describe('api convenience methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('crypto', {
      ...crypto,
      randomUUID: vi.fn(() => 'mock-uuid-5678'),
    });
  });

  it('submitAssessment should call create-leader-assessment with correct payload', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, assessmentId: 'a1', leaderId: 'l1' },
      error: null,
    });

    const answers = { q1: 'answer1', q2: 'answer2' };
    const result = await api.submitAssessment(answers, 'session-abc');

    expect(result.success).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('create-leader-assessment', {
      body: {
        assessmentData: answers,
        sessionId: 'session-abc',
        source: 'quiz',
      },
    });
  });

  it('submitAssessment should generate sessionId when not provided', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, assessmentId: 'a1', leaderId: 'l1' },
      error: null,
    });

    await api.submitAssessment({ q1: 'a' });

    const callBody = mockInvoke.mock.calls[0][1].body;
    expect(callBody.sessionId).toBe('mock-uuid-5678');
  });

  it('getWeeklyAction should call with userId', async () => {
    mockInvoke.mockResolvedValue({
      data: { action: { title: 'Do something' } },
      error: null,
    });

    const result = await api.getWeeklyAction('user-1');

    expect(result.action.title).toBe('Do something');
    expect(mockInvoke).toHaveBeenCalledWith('get-or-generate-weekly-action', {
      body: { userId: 'user-1' },
    });
  });

  it('submitCheckin should pass userId, transcript, and audioUrl', async () => {
    mockInvoke.mockResolvedValue({
      data: { checkin: { id: 'c1' } },
      error: null,
    });

    await api.submitCheckin('user-1', 'My reflection', 'https://audio.url');

    expect(mockInvoke).toHaveBeenCalledWith('submit-weekly-checkin', {
      body: {
        userId: 'user-1',
        transcript: 'My reflection',
        audioUrl: 'https://audio.url',
      },
    });
  });

  it('getStrategicPulse should return empty data without calling an edge function', async () => {
    const result = await api.getStrategicPulse('user-1');

    expect(result).toEqual({ baseline: null, tensions: [], risks: [] });
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
