import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const invoke = vi.fn();
  const maybeSingle = vi.fn();
  const insert = vi.fn();
  const update = vi.fn();
  const from = vi.fn();
  return { invoke, maybeSingle, insert, update, from };
});

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
    from: mocks.from,
  },
}));

import { useHandoffWelcome } from '@/components/cockpit/HandoffWelcome';

function lookupBuilder() {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: mocks.maybeSingle,
    update: mocks.update,
    insert: mocks.insert,
  };
  return builder;
}

describe('useHandoffWelcome', () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
    mocks.maybeSingle.mockReset();
    mocks.insert.mockReset();
    mocks.update.mockReset();
    mocks.from.mockReset();
  });

  it('resolves a token, records the confirmed focus, then becomes normal Home', async () => {
    sessionStorage.setItem('handoff_token', 'handoff-1');
    mocks.invoke.mockResolvedValue({
      data: { ok: true, signal: { q2: 'do', q4: 'hybrid', anxietyLane: 'orchestration' } },
      error: null,
    });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.insert.mockResolvedValue({ error: null });
    mocks.from.mockImplementation(() => lookupBuilder());
    const onComplete = vi.fn();

    const { result } = renderHook(() => useHandoffWelcome(onComplete));
    expect(result.current.phase).toBe('resolving');
    await waitFor(() => expect(result.current.phase).toBe('ready'));

    let confirmed = false;
    await act(async () => {
      confirmed = await result.current.confirm();
    });

    expect(confirmed).toBe(true);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      fact_key: 'handoff_focus',
      fact_value: expect.stringMatching(/agents wired into/i),
    }));
    expect(result.current.phase).toBe('idle');
    expect(sessionStorage.getItem('handoff_token')).toBeNull();
    expect(localStorage.getItem('ctrl_handoff_done:handoff-1')).toBe('1');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps the lens and token available when persistence fails', async () => {
    sessionStorage.setItem('handoff_token', 'handoff-retry');
    mocks.invoke.mockResolvedValue({
      data: { ok: true, signal: { q2: 'do', q4: 'hybrid', anxietyLane: 'orchestration' } },
      error: null,
    });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.insert.mockResolvedValue({ error: new Error('write failed') });
    mocks.from.mockImplementation(() => lookupBuilder());

    const { result } = renderHook(() => useHandoffWelcome());
    await waitFor(() => expect(result.current.phase).toBe('ready'));

    await act(async () => {
      expect(await result.current.confirm()).toBe(false);
    });

    expect(result.current.phase).toBe('ready');
    expect(result.current.error).toMatch(/try once more/i);
    expect(sessionStorage.getItem('handoff_token')).toBe('handoff-retry');
    expect(localStorage.getItem('ctrl_handoff_done:handoff-retry')).toBeNull();
  });

  it('discards an invalid resolved payload instead of crashing Home', async () => {
    sessionStorage.setItem('handoff_token', 'handoff-invalid');
    mocks.invoke.mockResolvedValue({
      data: { ok: true, signal: { q2: { unexpected: true }, anxietyLane: 'orchestration' } },
      error: null,
    });

    const { result } = renderHook(() => useHandoffWelcome());
    await waitFor(() => expect(result.current.phase).toBe('idle'));

    expect(result.current.signal).toBeNull();
    expect(sessionStorage.getItem('handoff_token')).toBeNull();
  });
});
