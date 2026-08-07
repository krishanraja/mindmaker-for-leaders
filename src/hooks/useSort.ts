import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
  manipPairDue,
  type SortDepth,
  type SortRunDetail,
  type SortVerdict,
  type WhyLine,
} from '@/lib/sortModel';

/**
 * useSort - owns one run of the check (stage 2 of the harness chain).
 *
 * Kicks off `build-sort`, then polls `harness_runs.stage` every 2s exactly as
 * useDecisionEngine polls decision_cases.stage, until the run is ready or
 * failed. On ready it loads the deck and drives the grading loop, sending each
 * grade to `grade-sort` fire-and-forget while the screen has already moved.
 *
 * Two things in here are load-bearing and are the reason this is a hook rather
 * than page state.
 *
 * 1. THE ANSWER KEY NEVER REACHES THE RENDER LAYER EARLY (CH-09).
 *    sort_items.intended_dimension is the answer key to the open question. It
 *    is read from the database and then immediately sealed into a ref
 *    (intendedByPairRef) that no consumer can see. The `SortItem` type this
 *    hook exposes has no such field, so the render layer cannot leak it even by
 *    accident: there is nothing to render. It becomes visible only through
 *    `revealedDimension`, and the ONLY place that state is written is inside
 *    submitManipAnswer, after the person's open answer has been sent. Same for
 *    held_out and repeat_of: they are never selected into component state at
 *    all, because which items are the test and which are repeats must stay
 *    invisible (CH-12, and revision-2 defect 9).
 *
 * 2. STAGE 3a IS CHAINED, NOT LEFT TO A BUTTON.
 *    compile-standard had no caller anywhere in the app, so `criteria` rows
 *    never existed and no built skill could carry a [C#] pointer. It is fired
 *    here the moment the last screen is graded, because the person opted in by
 *    grading the whole deck and the panel has already promised it. Two details
 *    make that safe rather than racy: the last grade is a promise held in a ref
 *    and awaited before the call (grades are fire-and-forget, so without this
 *    the compile can read one row short), and compile-standard is idempotent on
 *    the sort run id, so a double fire returns the first run.
 *
 * 3. THE REF PATTERN FROM KitIntake (~lines 435 to 540).
 *    A grade schedules an auto-advance on a timer. The #193 bug was a deferred
 *    advance closing over a STALE step index and count, which silently
 *    truncated every kit intake. A 33-screen auto-advancing flow reproduces it
 *    exactly, so the same fix is copied verbatim in shape: indexRef and
 *    itemsLenRef mirror the live position and deck size, advanceTimer is always
 *    cleared before it is set, and every advance reads the mirrors AT FIRE TIME
 *    rather than the values captured when the button was tapped. Any manual
 *    move (Next, the open question opening, a person typing their line) cancels
 *    the pending advance first, so a fast tap can never fire two advances and
 *    skip a screen. Skipping a screen here is not a UI nit: an ungraded item is
 *    a hole in the instrument.
 */

// The harness tables are newer than the committed generated types, so they are
// reached through an untyped client with the row shapes pinned by the
// interfaces below. Same scoping decision as useDecisionEngine.
const db = supabase as unknown as SupabaseClient;

/** How often the run state is re-read while the deck is being built. */
const POLL_MS = 2000;

/**
 * The confirm beat after a verdict. Long enough to read "noted" and start
 * typing a line (typing cancels it), short enough that 33 screens do not feel
 * like waiting on an animation.
 */
const ADVANCE_BEAT_MS = 1400;

/** Mirrors MAX_WHY_CHARS / MAX_MANIP_ANSWER_CHARS in grade-sort. */
const MAX_WHY_CHARS = 600;

const RETRY_DELAY_MS = 1200;

export type SortRunStage =
  | 'created'
  | 'planning'
  | 'generating_pairs'
  | 'assembling'
  | 'ready'
  | 'failed';

export type SortStatus = 'idle' | 'starting' | 'building' | 'ready' | 'failed';

/**
 * The compile run's stages, as compile-standard writes them. Three of these are
 * terminal and only one is an error: `halted` means the matched pairs did not
 * separate and `template_and_voice` means the grader disagreed with themselves.
 * Both are findings the instrument is designed to produce, and the UI has to
 * read them as findings rather than dressing them as failures.
 */
export type CompileStage =
  | 'loading'
  | 'probing'
  | 'clustering'
  | 'writing'
  | 'ready'
  | 'halted'
  | 'template_and_voice'
  | 'failed';

export type CompileStatus = 'idle' | 'starting' | 'running' | 'done' | 'failed';

/** The slice of the compile run's stage_detail the completion screen reads. */
export interface CompileDetail {
  outcome?: string;
  reason?: string;
  next?: string;
  kept?: number;
  untested?: number;
  deleted?: number;
  merged?: number;
  criteria_version?: number;
  label?: string;
  artifact_id?: string | null;
}

/**
 * What the render layer is allowed to know about an item: the words, where it
 * sits, and nothing else. No pair, no answer key, no held-out flag, no repeat
 * pointer. Everything omitted here is omitted on purpose.
 */
export interface SortItem {
  id: string;
  position: number;
  body: string;
}

/** The full row, private to this module. */
interface SortItemRow {
  id: string;
  position: number;
  body: string;
  pair_id: string | null;
  intended_dimension: string | null;
}

interface HarnessRunRow {
  id: string;
  stage: string;
  status: string;
  stage_detail: SortRunDetail | null;
  error: string | null;
}

export interface SortProgress {
  graded: number;
  total: number;
}

export interface SortSplit {
  split: number;
  total: number;
  rate: number;
}

export interface SortSelfAgreement {
  matched: number;
  total: number;
}

/** The two items the open question is about. Both have already been graded. */
export interface ManipPrompt {
  pairId: string;
  first: SortItem;
  second: SortItem;
}

interface GradeResponse {
  graded?: number;
  total?: number;
  can_show_kill?: boolean;
  pair_split?: SortSplit | null;
  self_agreement?: SortSelfAgreement | null;
}

interface GradePayload {
  item_id: string;
  verdict: SortVerdict;
  why?: string;
  ms_to_grade?: number;
  manip_answer?: string;
  pair_id?: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useSort() {
  const [runId, setRunId] = useState<string | null>(null);
  const [stage, setStage] = useState<SortRunStage | null>(null);
  const [status, setStatus] = useState<SortStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<SortItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [lastVerdict, setLastVerdict] = useState<SortVerdict | null>(null);

  const [lines, setLines] = useState<WhyLine[]>([]);
  const [progress, setProgress] = useState<SortProgress>({ graded: 0, total: 0 });
  const [canShowKill, setCanShowKill] = useState(false);
  const [splitRate, setSplitRate] = useState<SortSplit | null>(null);
  const [selfAgreement, setSelfAgreement] = useState<SortSelfAgreement | null>(null);
  const [detail, setDetail] = useState<SortRunDetail>({});
  const [unsavedGrades, setUnsavedGrades] = useState(0);

  const [compileRunId, setCompileRunId] = useState<string | null>(null);
  const [compileStage, setCompileStage] = useState<CompileStage | null>(null);
  const [compileStatus, setCompileStatus] = useState<CompileStatus>('idle');
  const [compileDetail, setCompileDetail] = useState<CompileDetail>({});
  const [compileError, setCompileError] = useState<string | null>(null);

  const [manipPrompt, setManipPrompt] = useState<ManipPrompt | null>(null);
  const [manipSubmitting, setManipSubmitting] = useState(false);
  const [manipRevealed, setManipRevealed] = useState(false);
  const [revealedDimension, setRevealedDimension] = useState<string | null>(null);

  // --- the sealed answer key + deck structure (never exposed) ---------------
  const intendedByPairRef = useRef<Map<string, string>>(new Map());
  const pairByItemRef = useRef<Map<string, string>>(new Map());
  const pairMembersRef = useRef<Map<string, string[]>>(new Map());

  // --- the KitIntake mirrors (read at fire time, never closed over) ---------
  const indexRef = useRef(0);
  const itemsRef = useRef<SortItem[]>([]);
  const itemsLenRef = useRef(0);
  const advanceTimer = useRef<number | null>(null);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const compilePollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * The grade currently in flight. Grades are sent fire-and-forget so the screen
   * can move on, which means the LAST one can still be in the air when the deck
   * ends. compile() awaits this before firing, or the compile reads a sort that
   * is one grade short of the one the person actually gave.
   */
  const inFlightGradeRef = useRef<Promise<GradeResponse | null> | null>(null);
  const compileStartedRef = useRef(false);
  const runIdRef = useRef<string | null>(null);
  const gradedIdsRef = useRef<Set<string>>(new Set());
  const askedPairsRef = useRef<Set<string>>(new Set());
  const lastGradeRef = useRef<{ itemId: string; verdict: SortVerdict; why: string } | null>(null);
  const shownAtRef = useRef<number>(Date.now());
  const startingRef = useRef(false);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    itemsRef.current = items;
    itemsLenRef.current = items.length;
  }, [items]);
  useEffect(() => {
    runIdRef.current = runId;
  }, [runId]);

  useEffect(
    () => () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
      if (pollTimer.current) clearTimeout(pollTimer.current);
      if (compilePollTimer.current) clearTimeout(compilePollTimer.current);
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Start + poll
  // -------------------------------------------------------------------------

  const startSort = useCallback(
    async (surface: string, depth: SortDepth = 'short', sessionLabel?: string) => {
      const trimmed = surface.trim();
      if (!trimmed || startingRef.current) return;
      startingRef.current = true;
      setStatus('starting');
      setError(null);
      setStage(null);
      setItems([]);
      setLines([]);
      setCurrentIndex(0);
      setIsComplete(false);
      setLastVerdict(null);
      setUnsavedGrades(0);
      setCompileRunId(null);
      setCompileStage(null);
      setCompileStatus('idle');
      setCompileDetail({});
      setCompileError(null);
      compileStartedRef.current = false;
      inFlightGradeRef.current = null;
      gradedIdsRef.current = new Set();
      askedPairsRef.current = new Set();
      lastGradeRef.current = null;

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('build-sort', {
        body: {
          surface: trimmed,
          depth,
          ...(sessionLabel ? { session_label: sessionLabel } : {}),
          // A retried build must return the first deck, never a second one.
          request_id: crypto.randomUUID(),
        },
      });
      if (invokeError) throw invokeError;
      const newRunId = typeof data?.run_id === 'string' ? data.run_id : null;
      if (!newRunId) throw new Error('The check did not start.');
      setRunId(newRunId);
      runIdRef.current = newRunId;
      setStage((data?.stage as SortRunStage) ?? 'planning');
      setStatus('building');
    } catch (e) {
      setStatus('failed');
      setError(e instanceof Error ? e.message : 'The check could not be started.');
    } finally {
      startingRef.current = false;
    }
    },
    [],
  );

  /**
   * Load the deck. This is the ONE place the answer key is read, and it goes
   * straight into a ref: `visible` is what reaches component state and it has
   * been stripped of the pair, the key, the hold-out flag and the repeat
   * pointer.
   */
  const loadItems = useCallback(async (session: string) => {
    const { data, error: readErr } = await db
      .from('sort_items')
      .select('id, position, body, pair_id, intended_dimension')
      .eq('session_id', session)
      .order('position', { ascending: true });

    if (readErr) {
      setStatus('failed');
      setError('The check was built but could not be read back.');
      return;
    }

    const rows = (data ?? []) as SortItemRow[];
    if (rows.length === 0) {
      setStatus('failed');
      setError('The check came back empty.');
      return;
    }

    const intended = new Map<string, string>();
    const pairByItem = new Map<string, string>();
    const pairMembers = new Map<string, string[]>();
    for (const row of rows) {
      if (!row.pair_id) continue;
      pairByItem.set(row.id, row.pair_id);
      pairMembers.set(row.pair_id, [...(pairMembers.get(row.pair_id) ?? []), row.id]);
      // One key per pair: build-sort writes it on the satisfies half only.
      if (row.intended_dimension && !intended.has(row.pair_id)) {
        intended.set(row.pair_id, row.intended_dimension);
      }
    }
    intendedByPairRef.current = intended;
    pairByItemRef.current = pairByItem;
    pairMembersRef.current = pairMembers;

    const visible: SortItem[] = rows.map((row) => ({
      id: row.id,
      position: row.position,
      body: row.body,
    }));
    itemsRef.current = visible;
    itemsLenRef.current = visible.length;
    setItems(visible);
    setProgress((p) => ({ graded: p.graded, total: visible.length }));
    setCurrentIndex(0);
    indexRef.current = 0;
    shownAtRef.current = Date.now();
    setStatus('ready');
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
      if (row) {
        setStage(row.stage as SortRunStage);
        setDetail((row.stage_detail ?? {}) as SortRunDetail);
      }

      if (row?.stage === 'ready') {
        await loadItems(runId);
        return; // stop polling
      }
      if (row?.stage === 'failed' || row?.status === 'failed') {
        setStatus('failed');
        setError(row?.error || 'The check could not be put together.');
        return; // stop polling
      }
      pollTimer.current = setTimeout(poll, POLL_MS);
    };

    poll();
    return () => {
      active = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [runId, loadItems]);

  // -------------------------------------------------------------------------
  // Grading
  // -------------------------------------------------------------------------

  const applyProgress = useCallback((response: GradeResponse | null) => {
    if (!response) return;
    if (typeof response.graded === 'number' && typeof response.total === 'number') {
      setProgress({ graded: response.graded, total: response.total });
    }
    setCanShowKill(Boolean(response.can_show_kill));
    setSplitRate(response.pair_split ?? null);
    setSelfAgreement(response.self_agreement ?? null);
  }, []);

  /**
   * One grade-sort call, with a single retry. A grade that never lands is a
   * missing row, so the failure is counted and surfaced rather than swallowed.
   */
  const sendGrade = useCallback(
    async (payload: GradePayload): Promise<GradeResponse | null> => {
      const session = runIdRef.current;
      if (!session) return null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const { data, error: invokeError } = await supabase.functions.invoke('grade-sort', {
            body: { run_id: session, ...payload },
          });
          if (invokeError) throw invokeError;
          const response = (data ?? null) as GradeResponse | null;
          applyProgress(response);
          return response;
        } catch {
          if (attempt === 0) await delay(RETRY_DELAY_MS);
        }
      }
      setUnsavedGrades((n) => n + 1);
      return null;
    },
    [applyProgress],
  );

  // -------------------------------------------------------------------------
  // Stage 3a: compile the standard (CH-18)
  // -------------------------------------------------------------------------

  /**
   * Build the standard from what they just graded.
   *
   * Fired automatically when the last screen is done rather than sat behind a
   * button. The person committed to this by grading the whole deck, and the
   * panel has already told them it comes next; a button here would be a second
   * door in front of a step the screen has promised.
   *
   * compile-standard is idempotent on the sort run id, so the ref guard below is
   * belt and braces rather than the only thing standing between a person and two
   * compile runs.
   */
  const compile = useCallback(async () => {
    const session = runIdRef.current;
    if (!session || compileStartedRef.current) return;
    compileStartedRef.current = true;
    setCompileStatus('starting');
    setCompileError(null);

    // The last grade is still in the air (grades are sent fire-and-forget so
    // the screen can move). Waiting on it is the difference between compiling
    // what they graded and compiling one row less. sendGrade bounds itself to
    // two attempts, so this cannot hang.
    try {
      await inFlightGradeRef.current;
    } catch {
      // A failed grade is already counted in unsavedGrades and surfaced. It is
      // not a reason to refuse to build anything.
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('compile-standard', {
        body: { run_id: session },
      });
      if (invokeError) throw invokeError;
      const id = typeof data?.run_id === 'string' ? data.run_id : null;
      if (!id) throw new Error('The standard did not start building.');
      setCompileRunId(id);
      setCompileStage((data?.stage as CompileStage) ?? 'loading');
      setCompileStatus('running');
    } catch (e) {
      compileStartedRef.current = false;
      setCompileStatus('failed');
      setCompileError(
        e instanceof Error ? e.message : 'Your standard could not be built from this check.',
      );
    }
  }, []);

  useEffect(() => {
    if (!isComplete) return;
    void compile();
  }, [isComplete, compile]);

  /** Poll the compile run, same shape as the sort run's poll above. */
  useEffect(() => {
    if (!compileRunId) return;
    let active = true;

    const poll = async () => {
      const { data } = await db
        .from('harness_runs')
        .select('id, stage, status, stage_detail, error')
        .eq('id', compileRunId)
        .maybeSingle();
      if (!active) return;

      const row = data as HarnessRunRow | null;
      if (row) {
        setCompileStage(row.stage as CompileStage);
        setCompileDetail((row.stage_detail ?? {}) as CompileDetail);
      }

      // 'halted' and 'template_and_voice' are findings, not errors: the pairs
      // did not separate, or the grader did not agree with themselves. Both end
      // the run as 'done' and both have something true to say.
      if (row?.stage === 'ready' || row?.stage === 'halted' || row?.stage === 'template_and_voice') {
        setCompileStatus('done');
        return;
      }
      if (row?.stage === 'failed' || row?.status === 'failed') {
        setCompileStatus('failed');
        setCompileError(row?.error || 'Your standard could not be built from this check.');
        return;
      }
      compilePollTimer.current = setTimeout(poll, POLL_MS);
    };

    poll();
    return () => {
      active = false;
      if (compilePollTimer.current) clearTimeout(compilePollTimer.current);
    };
  }, [compileRunId]);

  /** Cancel a pending auto-advance. Called by every manual move. */
  const holdAdvance = useCallback(() => {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);

  /**
   * Move to the next screen. Reads the position and deck size from the mirrors
   * AT FIRE TIME, which is the whole point of the KitIntake pattern: this runs
   * both from a click and from a timer set one or more renders ago.
   */
  const advance = useCallback(() => {
    holdAdvance();
    const idx = indexRef.current;
    setLastVerdict(null);
    if (idx >= itemsLenRef.current - 1) {
      setIsComplete(true);
      return;
    }
    indexRef.current = idx + 1;
    setCurrentIndex(idx + 1);
    shownAtRef.current = Date.now();
  }, [holdAdvance]);

  const scheduleAdvance = useCallback(() => {
    holdAdvance();
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null;
      advance();
    }, ADVANCE_BEAT_MS);
  }, [advance, holdAdvance]);

  const recordLine = useCallback((entry: WhyLine) => {
    setLines((prev) => {
      const at = prev.findIndex((line) => line.itemId === entry.itemId);
      if (at === -1) return [...prev, entry];
      const next = prev.slice();
      next[at] = entry;
      return next;
    });
  }, []);

  const grade = useCallback(
    (verdict: SortVerdict, why = '') => {
      const idx = indexRef.current;
      const item = itemsRef.current[idx];
      if (!item) return;
      holdAdvance();

      const trimmed = why.trim().slice(0, MAX_WHY_CHARS);
      const ms = Math.max(0, Date.now() - shownAtRef.current);
      lastGradeRef.current = { itemId: item.id, verdict, why: trimmed };
      gradedIdsRef.current.add(item.id);
      setLastVerdict(verdict);
      recordLine({ itemId: item.id, verdict, why: trimmed });

      // Fire and forget: the screen has already moved on by the time this
      // lands. The promise is kept so compile() can wait on the last one.
      inFlightGradeRef.current = sendGrade({
        item_id: item.id,
        verdict,
        ...(trimmed ? { why: trimmed } : {}),
        ms_to_grade: ms,
      });

      const duePair = manipPairDue({
        screen: idx + 1,
        justGradedItemId: item.id,
        gradedIds: gradedIdsRef.current,
        askedPairs: askedPairsRef.current,
        pairByItem: pairByItemRef.current,
        pairMembers: pairMembersRef.current,
      });
      if (duePair) {
        const members = (pairMembersRef.current.get(duePair) ?? [])
          .map((id) => itemsRef.current.find((row) => row.id === id))
          .filter((row): row is SortItem => Boolean(row));
        if (members.length === 2) {
          // No auto-advance behind a question: the person answers, then moves.
          setManipRevealed(false);
          setRevealedDimension(null);
          setManipPrompt({ pairId: duePair, first: members[0], second: members[1] });
          return;
        }
      }

      scheduleAdvance();
    },
    [holdAdvance, recordLine, scheduleAdvance, sendGrade],
  );

  /**
   * The line, added after the verdict. grade-sort upserts on item_id, so this
   * updates the existing row rather than raising a conflict (CH-15). Never
   * advances by itself; the person does.
   */
  const amendWhy = useCallback(
    (why: string) => {
      const last = lastGradeRef.current;
      if (!last) return;
      const trimmed = why.trim().slice(0, MAX_WHY_CHARS);
      if (trimmed === last.why) return;
      lastGradeRef.current = { ...last, why: trimmed };
      recordLine({ itemId: last.itemId, verdict: last.verdict, why: trimmed });
      // Tracked for the same reason as the verdict itself: a line typed on the
      // last screen is a write the compile has to see.
      inFlightGradeRef.current = sendGrade({
        item_id: last.itemId,
        verdict: last.verdict,
        ...(trimmed ? { why: trimmed } : {}),
      });
    },
    [recordLine, sendGrade],
  );

  // -------------------------------------------------------------------------
  // The open question (CH-09)
  // -------------------------------------------------------------------------

  /**
   * Send the person's own words, THEN reveal what those two were testing.
   * This is the only writer of revealedDimension, which is the only way the
   * answer key ever leaves intendedByPairRef.
   */
  const submitManipAnswer = useCallback(
    async (answer: string) => {
      const last = lastGradeRef.current;
      const prompt = manipPrompt;
      const text = answer.trim().slice(0, MAX_WHY_CHARS);
      if (!prompt || !last || !text) return;
      setManipSubmitting(true);
      await sendGrade({
        item_id: last.itemId,
        verdict: last.verdict,
        ...(last.why ? { why: last.why } : {}),
        manip_answer: text,
        pair_id: prompt.pairId,
      });
      askedPairsRef.current.add(prompt.pairId);
      setRevealedDimension(intendedByPairRef.current.get(prompt.pairId) ?? null);
      setManipRevealed(true);
      setManipSubmitting(false);
    },
    [manipPrompt, sendGrade],
  );

  /** Passed on the question. Nothing is revealed, because nothing was committed. */
  const skipManip = useCallback(() => {
    const prompt = manipPrompt;
    if (prompt) askedPairsRef.current.add(prompt.pairId);
    setManipPrompt(null);
    setManipRevealed(false);
    setRevealedDimension(null);
    advance();
  }, [advance, manipPrompt]);

  const dismissManip = useCallback(() => {
    setManipPrompt(null);
    setManipRevealed(false);
    setRevealedDimension(null);
    advance();
  }, [advance]);

  return {
    // run
    status,
    stage,
    error,
    runId,
    startSort,
    // deck
    items,
    currentIndex,
    current: items[currentIndex] ?? null,
    total: items.length,
    screen: currentIndex + 1,
    isComplete,
    // grading
    grade,
    amendWhy,
    holdAdvance,
    advance,
    lastVerdict,
    lines,
    unsavedGrades,
    // measurement
    progress,
    canShowKill,
    splitRate,
    selfAgreement,
    detail,
    // the standard (stage 3a)
    compileRunId,
    compileStage,
    compileStatus,
    compileDetail,
    compileError,
    compile,
    // the open question
    manipPrompt,
    manipSubmitting,
    manipRevealed,
    revealedDimension,
    submitManipAnswer,
    skipManip,
    dismissManip,
  };
}

export type UseSort = ReturnType<typeof useSort>;
