import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Briefing, BriefingFeedback, BriefingStage, BriefingType } from '@/types/briefing';
import { isBriefingGenerating } from '@/types/briefing';

const POLL_INTERVAL = 3_000;
const MAX_POLLS = 40; // 40 * 3s = 120s max
// Background generation safety cap. The pipeline (fan-out + curation + GPT-4o
// script) commonly runs 30-60s; we poll the row's `stage` until it finishes and
// stop after this long so a stuck job surfaces an error instead of spinning.
const GENERATE_MAX_MS = 180_000;
const GENERATE_POLL_MS = 2_500;

/**
 * Fetch today's briefings for the current user.
 * Returns all briefings for today (default + custom types).
 */
export function useTodaysBriefing() {
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefings = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      const { data, error: fetchErr } = await supabase
        .from('briefings')
        .select('*')
        .eq('user_id', user.id)
        .eq('briefing_date', today)
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setBriefings((data as Briefing[]) || []);
    } catch (err) {
      console.error('Failed to fetch briefings:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefings();
  }, [fetchBriefings]);

  // While any briefing is still generating in the background, poll silently so
  // its stage advances and the finished briefing appears without a manual
  // refresh - even if the user navigated away and back mid-generation.
  const anyGenerating = briefings.some(isBriefingGenerating);
  useEffect(() => {
    if (!anyGenerating) return;
    const t = setInterval(() => { void fetchBriefings(true); }, GENERATE_POLL_MS);
    return () => clearInterval(t);
  }, [anyGenerating, fetchBriefings]);

  // Convenience: the default briefing
  const defaultBriefing = briefings.find(b => (b.briefing_type || 'default') === 'default') || null;
  const customBriefings = briefings.filter(b => (b.briefing_type || 'default') !== 'default');

  // Back-compat: single briefing alias
  const briefing = defaultBriefing;

  return {
    briefing,
    briefings,
    defaultBriefing,
    customBriefings,
    loading,
    error,
    refetch: fetchBriefings,
  };
}

/**
 * Generate a briefing on demand (supports custom types).
 *
 * Deliberately has no auto-trigger: briefing generation is a user-controlled
 * action. Refreshing the page or logging back in must NOT cause regeneration  - 
 * today's briefing is persisted in the `briefings` table and surfaced by
 * `useTodaysBriefing` without any API call. Generation only fires from an
 * explicit user gesture (primary CTA button, refresh button, custom request).
 */
export interface SparseProfileInfo {
  depth: number;
  required: number;
  missing: string[];
  message: string;
}

/** Map a real pipeline stage to the three UI progress phases. */
function stageToPhase(stage: BriefingStage): 'scanning' | 'personalising' | 'preparing' {
  switch (stage) {
    case 'queued':
      return 'scanning';
    case 'searching':
      return 'personalising';
    case 'curating':
    case 'scripting':
    default:
      return 'preparing';
  }
}

export function useGenerateBriefing() {
  const [generating, setGenerating] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'personalising' | 'preparing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sparseProfile, setSparseProfile] = useState<SparseProfileInfo | null>(null);
  // In-flight promise cache keyed by (briefingType|custom|force). A rapid
  // second click for the same request returns the existing promise instead
  // of kicking off a duplicate edge-function call.
  const inFlight = useRef<Map<string, Promise<string | null>>>(new Map());

  const generate = useCallback(async (
    briefingType?: BriefingType,
    customContext?: string,
    options?: { force?: boolean },
  ): Promise<string | null> => {
    const key = `${briefingType ?? 'default'}|${customContext ?? ''}|${options?.force ? 'force' : ''}`;
    const existing = inFlight.current.get(key);
    if (existing) return existing;

    const run = (async (): Promise<string | null> => {
      try {
        setGenerating(true);
        setError(null);
        setSparseProfile(null);
        setPhase('scanning');

        const body: Record<string, unknown> = {};
        if (briefingType) body.briefing_type = briefingType;
        if (customContext) body.custom_context = customContext;
        if (options?.force) body.force = true;

        // The function returns fast (202) and runs the pipeline in the
        // background. We then poll the row's real `stage` - no client-side
        // timeout cliff, because a 30-60s pipeline is normal, not a failure.
        const { data, error: genErr } = await supabase.functions.invoke('generate-briefing', {
          body: Object.keys(body).length > 0 ? body : undefined,
        });

        if (genErr) throw genErr;

        // Backend sparse-profile signal: surface a structured state so the
        // UI can render an onboarding CTA instead of a silent no-op.
        if (data?.error === 'profile_too_sparse') {
          setSparseProfile({
            depth: typeof data.depth === 'number' ? data.depth : 0,
            required: typeof data.required === 'number' ? data.required : 5,
            missing: Array.isArray(data.missing) ? data.missing : [],
            message: typeof data.message === 'string'
              ? data.message
              : 'Add more signal to your profile to unlock a tailored briefing.',
          });
          setPhase('idle');
          return null;
        }

        const briefingId: string | null = data?.briefing_id || null;
        if (!briefingId) { setPhase('idle'); return null; }

        // Already-complete responses (already_exists / alert_only / a legacy
        // synchronous row) need no polling.
        if (data?.status !== 'generating') {
          setPhase('idle');
          return briefingId;
        }

        // Poll the background pipeline's real stage until it finishes.
        const deadline = Date.now() + GENERATE_MAX_MS;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, GENERATE_POLL_MS));
          const { data: row } = await supabase
            .from('briefings')
            .select('stage')
            .eq('id', briefingId)
            .maybeSingle();
          // `stage` was added by migration; the generated DB types may not yet
          // include it, so read it through a narrow cast.
          const stage = ((row as unknown as { stage?: BriefingStage | null } | null)?.stage) ?? null;
          if (stage) setPhase(stageToPhase(stage));
          if (stage === 'complete') { setPhase('idle'); return briefingId; }
          if (stage === 'failed') {
            setError('Briefing generation failed. Please try again.');
            setPhase('idle');
            return null;
          }
        }
        // Hit the safety cap. The job may still finish; useTodaysBriefing keeps
        // polling and will reveal it. Don't hard-fail.
        setPhase('idle');
        return briefingId;
      } catch (err) {
        console.error('Generate briefing failed:', err);
        setError((err as Error).message);
        setPhase('idle');
        return null;
      } finally {
        setGenerating(false);
      }
    })();

    inFlight.current.set(key, run);
    try {
      return await run;
    } finally {
      inFlight.current.delete(key);
    }
  }, []);

  const regenerate = useCallback(async (): Promise<string | null> => {
    return generate(undefined, undefined, { force: true });
  }, [generate]);

  const clearSparseProfile = useCallback(() => setSparseProfile(null), []);

  return { generate, regenerate, generating, phase, error, sparseProfile, clearSparseProfile };
}

/**
 * Submit feedback on a briefing segment.
 * v2 callers can pass lensItemId + dwellMs + replayed so the server can learn
 * per-lens-item engagement. v1 callers can omit them; server defaults are null/false.
 */
export interface SubmitFeedbackOptions {
  lensItemId?: string | null;
  dwellMs?: number;
  replayed?: boolean;
}

export function useSubmitFeedback() {
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = useCallback(
    async (
      briefingId: string,
      segmentIndex: number,
      reaction: BriefingFeedback['reaction'],
      options: SubmitFeedbackOptions = {},
    ) => {
      try {
        setSubmitting(true);
        const row: Record<string, unknown> = {
          briefing_id: briefingId,
          segment_index: segmentIndex,
          reaction,
        };
        if (options.lensItemId !== undefined) row.lens_item_id = options.lensItemId;
        if (typeof options.dwellMs === 'number') row.dwell_ms = Math.round(options.dwellMs);
        if (typeof options.replayed === 'boolean') row.replayed = options.replayed;
        const { error } = await supabase.from('briefing_feedback').insert(row);
        if (error) throw error;
      } catch (err) {
        console.error('Feedback failed:', err);
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  return { submitFeedback, submitting };
}

/**
 * Poll for audio readiness while also triggering synthesis.
 *
 * Explicit-trigger only: `start(id)` must be called from a user gesture
 * (e.g. "Generate audio" button). The hook never auto-fires on mount or
 * briefingId change. If a briefing already has `audio_url` set, callers
 * should skip `start` entirely and use the cached URL.
 */
export function usePollAudio() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  // synthError lets the BriefingCard render a real "audio failed - retry?"
  // affordance instead of a stuck "Audio…" pill. Categorised so different
  // failure modes can get different copy (rate_limited vs provider_unavailable
  // vs unknown).
  const [synthError, setSynthError] = useState<{ kind: 'rate_limited' | 'provider_unavailable' | 'unknown'; message: string } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const resolvedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resolve = useCallback((url: string) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setAudioUrl(url);
    setPolling(false);
    cleanup();
  }, [cleanup]);

  const fail = useCallback((kind: 'rate_limited' | 'provider_unavailable' | 'unknown', message: string) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setSynthError({ kind, message });
    setPolling(false);
    setExhausted(true);
    cleanup();
  }, [cleanup]);

  const start = useCallback((id: string) => {
    if (!id) return;
    resolvedRef.current = false;
    setPolling(true);
    setExhausted(false);
    setAudioUrl(null);
    setSynthError(null);
    pollCountRef.current = 0;
    cleanup();

    // Path 1: Trigger synthesis and use its response directly. The function
    // can return three useful states: success (audio_url), structured error
    // (data.error = 'rate_limited' | 'provider_unavailable'), or thrown error.
    supabase.functions
      .invoke('synthesize-briefing', { body: { briefing_id: id } })
      .then(({ data, error }) => {
        if (resolvedRef.current) return;
        if (!error && data?.audio_url) {
          resolve(data.audio_url);
          return;
        }
        // Structured error from the edge function (status 429 / 503 still
        // arrive here as `data` because supabase-js doesn't throw on those).
        if (data?.error === 'rate_limited') {
          fail('rate_limited', data.message || 'Audio generation is rate-limited. Try again in a minute.');
          return;
        }
        if (data?.error === 'provider_unavailable') {
          fail('provider_unavailable', data.message || 'Audio service is temporarily unavailable.');
          return;
        }
        if (error) {
          console.warn('Synthesis returned error:', error);
        }
      })
      .catch((e) => {
        console.warn('Synthesis trigger failed:', e);
        if (resolvedRef.current) return;
        fail('unknown', 'Could not generate audio. Try again.');
      });

    // Path 2: Poll DB as backup (in case synthesis is still in-flight
    // when the edge function times out from the client perspective)
    const poll = async () => {
      if (resolvedRef.current) return;
      pollCountRef.current += 1;

      if (pollCountRef.current > MAX_POLLS) {
        // Pool exhausted without resolving. If a synth-side error already
        // fired we'd already be resolved; this branch covers the "synth
        // returned nothing useful and DB never updated" case.
        if (!resolvedRef.current) {
          fail('unknown', 'Audio generation timed out. Try again.');
        }
        return;
      }

      try {
        const { data } = await supabase
          .from('briefings')
          .select('audio_url')
          .eq('id', id)
          .maybeSingle();

        if (data?.audio_url) {
          resolve(data.audio_url);
        }
      } catch (e) {
        console.warn('Poll error:', e);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
  }, [cleanup, resolve, fail]);

  const clearError = useCallback(() => setSynthError(null), []);

  // Cleanup on unmount only
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { audioUrl, polling, exhausted, synthError, start, clearError };
}
