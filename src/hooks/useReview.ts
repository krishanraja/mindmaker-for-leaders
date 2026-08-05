import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * useReview - one pass of the check: submit real work, get it read against your
 * own standard, and say whether each note landed.
 *
 * Kicks off `critique-artefact`, then polls `harness_runs.stage` every 2s
 * exactly as useDecisionEngine polls decision_cases.stage and useSort polls the
 * sort run, until the run is ready or failed.
 *
 * ---------------------------------------------------------------------------
 * The part that matters: this hook is the ledger's writer (CH-01)
 * ---------------------------------------------------------------------------
 *
 * Before this, nothing wrote to `ledger`. A skill, once installed, runs inside
 * the person's own assistant and CTRL sees none of it, so the weekly learning
 * pass had nothing to read and its acceptance test could only ever pass on
 * seeded rows.
 *
 * `respond()` is the writer. Agreeing or pushing back on a single verdict IS
 * the ledger row; there is no separate feedback form, because every loop that
 * needs a separate act of feedback-giving dies. The review is the work and the
 * row is the by-product.
 *
 * `disposition` is the load-bearing column. Two pushbacks on the same criterion
 * is what the weekly pass promotes to a false positive, and false positives are
 * what get a gate ignored.
 */

// The harness tables are newer than the committed generated types, so they are
// reached through an untyped client with the row shapes pinned by the
// interfaces below. Same scoping decision as useSort and useDecisionEngine.
const db = supabase as unknown as SupabaseClient;

/** How often the run state is re-read while the review is being written. */
const POLL_MS = 2000;

export type ReviewStage = 'loading' | '7a' | 'lenses' | 'meta' | 'ready' | 'failed';

export type ReviewStatus = 'idle' | 'starting' | 'running' | 'ready' | 'failed';

export type ReviewVerdict = 'holds' | 'borderline' | 'breaks' | 'insufficient evidence';

export type ReviewLabel = 'your rule' | "CTRL's check";

export type ReviewResponse = 'agree' | 'push_back';

export interface ReviewAdjustment {
  rule: 'quote' | 'borderline' | 'unrepaired';
  from?: string;
  reason?: string;
}

/** One scored criterion, in the output contract's shape. */
export interface ReviewJudgement {
  criterionId: string | null;
  criterionName: string;
  lens: 'standard' | 'evidence' | 'signature';
  label: ReviewLabel;
  verdict: ReviewVerdict;
  quote: string;
  sentence: string;
  changeToHolds: string | null;
  revision: string | null;
  adjustments: ReviewAdjustment[];
}

export interface ReviewMechanical {
  id: string;
  label: string;
  quote: string;
  line: number;
}

export interface ReviewResult {
  checked: string;
  against: string;
  mechanical: ReviewMechanical[];
  judgement: ReviewJudgement[];
  uncovered: Array<{ note: string; quote: string | null }>;
  escalations: Array<{ criterionName: string; note: string }>;
  oneThing: string | null;
  revised: Array<{ criterionName: string; quote: string; replacement: string }>;
  notes: string[];
  passes: number;
  signature: { ran: boolean; provider: string | null; reason: string | null };
  exemplars: { used: number; bothPoles: boolean; none: boolean };
  surface: string;
}

interface HarnessRunRow {
  id: string;
  stage: string;
  status: string;
  stage_detail: { result?: ReviewResult } | null;
  error: string | null;
}

/**
 * What the person can be shown in plain words while they wait. Never the stage
 * name: nobody outside this repository knows what 7a is, and section 6.6 is
 * explicit that the vocabulary stays ours.
 */
export const STAGE_COPY: Record<ReviewStage, string> = {
  loading: 'Reading your standard',
  '7a': 'Checking what points at nothing',
  lenses: 'Three separate reads of your work',
  meta: 'Weighing where they disagree',
  ready: 'Done',
  failed: 'Stopped',
};

/** A verdict the ledger can actually hold. Insufficient evidence is not one. */
function ledgerVerdict(verdict: ReviewVerdict): 'holds' | 'borderline' | 'breaks' | null {
  return verdict === 'insufficient evidence' ? null : verdict;
}

/** ISO year-week, e.g. 2026-W32. The week-numbering year, not the calendar one. */
function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** ledger.md: the passage, truncated to about fifteen words. */
function truncateQuote(quote: string | null): string | null {
  const text = String(quote ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const parts = text.split(' ');
  return parts.length <= 15 ? text : `${parts.slice(0, 15).join(' ')}...`;
}

/** A stable key for one verdict, so a response can be tracked per criterion. */
export function judgementKey(item: Pick<ReviewJudgement, 'criterionId' | 'criterionName'>): string {
  return item.criterionId ?? `house:${item.criterionName}`;
}

export function useReview() {
  const [runId, setRunId] = useState<string | null>(null);
  const [stage, setStage] = useState<ReviewStage | null>(null);
  const [status, setStatus] = useState<ReviewStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);
  /** verdict key -> what they said about it. Drives the button state. */
  const [responses, setResponses] = useState<Record<string, ReviewResponse>>({});

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingRef = useRef(false);

  useEffect(
    () => () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    },
    [],
  );

  const submit = useCallback(async (body: string, surface?: string) => {
    const text = body.trim();
    if (text.length < 120 || startingRef.current) return;
    startingRef.current = true;
    setStatus('starting');
    setError(null);
    setStage(null);
    setResult(null);
    setResponses({});

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('critique-artefact', {
        body: { body: text, ...(surface ? { surface } : {}) },
      });
      if (invokeError) throw invokeError;
      const newRunId = typeof data?.run_id === 'string' ? data.run_id : null;
      if (!newRunId) throw new Error('The review did not start.');
      setRunId(newRunId);
      setStage((data?.stage as ReviewStage) ?? 'loading');
      setStatus('running');
    } catch (e) {
      setStatus('failed');
      setError(e instanceof Error ? e.message : 'The review could not be started.');
    } finally {
      startingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!runId) return;
    let active = true;

    const poll = async () => {
      const { data } = await db
        .from('harness_runs')
        .select('id, stage, status, stage_detail, error')
        .eq('id', runId)
        .maybeSingle();
      if (!active) return;

      const row = data as HarnessRunRow | null;
      if (row) setStage(row.stage as ReviewStage);

      if (row?.stage === 'ready') {
        const ready = row.stage_detail?.result ?? null;
        if (ready) {
          setResult(ready);
          setStatus('ready');
        } else {
          setStatus('failed');
          setError('The review finished but came back empty.');
        }
        return; // stop polling
      }
      if (row?.stage === 'failed' || row?.status === 'failed') {
        setStatus('failed');
        setError(row?.error || 'The review could not be finished.');
        return; // stop polling
      }
      pollTimer.current = setTimeout(poll, POLL_MS);
    };

    void poll();
    return () => {
      active = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [runId]);

  /**
   * Accept or push back on one verdict, which writes one ledger row.
   *
   * Written straight to `ledger` under its owner-scoped RLS, because this is a
   * row about the standard rather than a call that needs a model. The
   * disposition is the whole point: `rejected` means the gate said something and
   * the person disagreed, and two of those on one criterion is what the weekly
   * pass promotes to a false positive.
   *
   * Optimistic: the button state moves immediately and a failed write is rolled
   * back and surfaced, because a note silently not recorded is a loop that looks
   * like it is running and is not.
   */
  const respond = useCallback(
    async (item: ReviewJudgement, response: ReviewResponse) => {
      const verdict = ledgerVerdict(item.verdict);
      if (!verdict || !result) return;
      const key = judgementKey(item);
      const previous = responses[key];
      setResponses((current) => ({ ...current, [key]: response }));

      const { error: writeError } = await db.from('ledger').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        week: isoWeek(new Date()),
        surface: result.surface || 'unknown',
        signal: 'output',
        criterion_id: item.criterionId,
        criterion_name: item.criterionName,
        verdict,
        quote: truncateQuote(item.quote),
        disposition: response === 'agree' ? 'accepted' : 'rejected',
      });

      if (writeError) {
        setResponses((current) => {
          const next = { ...current };
          if (previous) next[key] = previous;
          else delete next[key];
          return next;
        });
        setError('I could not record that. Try it again in a moment.');
      }
    },
    [responses, result],
  );

  /**
   * The same row for an observation the standard does not cover. Uncovered rows
   * are the most valuable lines in the ledger: they are the standard saying what
   * it does not yet contain, and the weekly pass reads them first.
   */
  const respondUncovered = useCallback(
    async (note: { note: string; quote: string | null }, index: number, response: ReviewResponse) => {
      if (!result) return;
      const key = `uncovered:${index}`;
      const previous = responses[key];
      setResponses((current) => ({ ...current, [key]: response }));

      const { error: writeError } = await db.from('ledger').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        week: isoWeek(new Date()),
        surface: result.surface || 'unknown',
        signal: 'output',
        criterion_id: null,
        criterion_name: 'uncovered',
        verdict: 'uncovered',
        quote: truncateQuote(note.quote ?? note.note),
        disposition: response === 'agree' ? 'accepted' : 'rejected',
      });

      if (writeError) {
        setResponses((current) => {
          const next = { ...current };
          if (previous) next[key] = previous;
          else delete next[key];
          return next;
        });
        setError('I could not record that. Try it again in a moment.');
      }
    },
    [responses, result],
  );

  const reset = useCallback(() => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    setRunId(null);
    setStage(null);
    setStatus('idle');
    setError(null);
    setResult(null);
    setResponses({});
  }, []);

  return {
    runId,
    stage,
    status,
    error,
    result,
    responses,
    submit,
    respond,
    respondUncovered,
    reset,
  };
}
