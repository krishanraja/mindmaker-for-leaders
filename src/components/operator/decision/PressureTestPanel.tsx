import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileHeaderSlot } from '@/contexts/MobileHeaderSlotContext';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useDecisionEngine } from '@/hooks/useDecisionEngine';
import { useDecisionInbox } from '@/hooks/useDecisionInbox';
import { usePinnedDecision } from '@/hooks/usePinnedDecision';
import { useDecisionCall } from '@/hooks/useDecisionCall';
import { useResolveDecision } from '@/hooks/useResolveDecision';
import { useTrackRecord } from '@/hooks/useTrackRecord';
import { useEdgeSubscription } from '@/hooks/useEdgeSubscription';
import {
  DecisionCold, DecisionLoading, DecisionErrorView, UpgradeCard,
} from '@/components/operator/decision/decision-views';
import { DecisionRunning } from '@/components/operator/decision/DecisionRunning';
import { DecisionResultView } from '@/components/operator/decision/DecisionResultView';
import { DecisionAnatomy } from '@/components/operator/decision/DecisionAnatomy';
import { CriticalCallStep } from '@/components/operator/decision/CriticalCallStep';
import { ResolveDecisionSheet } from '@/components/operator/decision/ResolveDecisionSheet';
import { buildTrackRecordModel } from '@/components/track-record/trackRecordModel';
import { TrackRecordView } from '@/components/track-record/TrackRecordView';
import { TrackRecordSkeleton } from '@/components/track-record/TrackRecordSkeleton';
import type { PlayedOut } from '@/types/track-record';

// A decision leaves the active rotation once it is resolved (or otherwise closed
// out). Those rows live in History, not in the "Now" anatomy or its switcher.
const TERMINAL_STATUSES = new Set(['decided', 'archived', 'superseded', 'reversed']);

/**
 * The Decisions tab. ONE place for a decision's whole life: pin it, enrich it
 * (weigh / re-check), then RESOLVE it with an optional conclusion so it drops into
 * History. A top "Now | History" toggle folds in the old Track Record tab; the
 * bottom nav is three tabs (Home / Decisions / Memory).
 *
 * The five first-class "Now" states (CTRL-SYSTEM-SPEC.md s6 "state is the
 * experience"), each device-native:
 *   LOADING  - branded SkeletonCard (no raw spinner).
 *   COLD     - one input card: type or talk, the example as ghost text, one CTA.
 *   WARM     - the live pressure-tests as calm cards + a slim fast-capture bar.
 *   RUNNING  - the branded orb + a live 4-step pipeline wired to the REAL
 *              useDecisionEngine `stage`, never faked.
 *   RESULT   - a reframe note + THE CALL hero + holds/breaks + the watch line.
 *
 * HISTORY reuses the Track Record surface as-is (how the calls you have weighed
 * actually turned out). Mobile is one thumb-first column in MobileFrame (no page
 * scroll); desktop is a calm two-zone command surface in DesktopShell.
 */
export function PressureTestPanel({ initialStatement }: { initialStatement?: string } = {}) {
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;
  const [statement, setStatement] = useState(initialStatement ?? '');
  const engine = useDecisionEngine();
  const inbox = useDecisionInbox();
  const { pin, refresh: refreshPinned } = usePinnedDecision();
  const { subscribe, isProcessing } = useEdgeSubscription();
  const { recordCall } = useDecisionCall();
  const { resolve, resolving } = useResolveDecision();
  const trackRecord = useTrackRecord();

  // Only non-terminal cases belong in the active rotation (auto-load + switcher).
  // Resolved decisions still appear under History (driven by useTrackRecord).
  const activeCases = useMemo(
    () => inbox.cases.filter((c) => !TERMINAL_STATUSES.has(c.status)),
    [inbox.cases],
  );

  // Now | History. The toggle only shows in the restful states; a fresh weigh
  // always snaps back to "now" so the new decision is what you land on.
  const [view, setView] = useState<'now' | 'history'>('now');

  // B6 critical-evaluation gate: force the user's own call on a load-bearing claim
  // before revealing the recommendation. Resets when the active case changes.
  const [callDone, setCallDone] = useState(false);
  const handleCallDone = useCallback(() => setCallDone(true), []);
  useEffect(() => { setCallDone(false); }, [engine.decisionCase?.id]);

  // The "bank this call" closure moment on a freshly-weighed result.
  const [banking, setBanking] = useState(false);
  const [banked, setBanked] = useState(false);
  useEffect(() => { setBanked(false); }, [engine.decisionCase?.id]);

  // The resolve sheet (the closing move on the anatomy).
  const [resolveOpen, setResolveOpen] = useState(false);

  // "Compose" forces the COLD one-ask even when the account already has decisions.
  const [composing, setComposing] = useState(Boolean(initialStatement));

  // justRan = the leader actively weighed this case in this session, so the
  // critical-call gate + the result view apply. Auto-loaded/switched-to cases open
  // straight into the anatomy for REVIEW.
  const [justRan, setJustRan] = useState(false);
  useEffect(() => { setJustRan(false); }, [engine.decisionCase?.id]);

  // Auto-load the ONE pinned decision so the tab opens into its anatomy (not a
  // list). Falls back to the most recent active case if a pin isn't set yet.
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (autoLoadedRef.current) return;
    if (composing || engine.starting || engine.decisionCase) return;
    if (inbox.loading || activeCases.length === 0) return;
    autoLoadedRef.current = true;
    const pinned = activeCases.find((c) => c.pinned_at) ?? activeCases[0];
    engine.load(pinned.id);
  }, [composing, engine, inbox.loading, activeCases]);

  const handleUpgrade = async () => { const url = await subscribe(); if (url) window.location.href = url; };

  const startNew = async () => {
    setComposing(false);
    setJustRan(true);
    setView('now');
    autoLoadedRef.current = true; // a fresh run owns the surface; don't auto-load over it
    await engine.start(statement);
    inbox.refresh();
  };
  // From the anatomy/error: clear back to the account's natural state (re-arm
  // auto-load so the latest decision's anatomy returns).
  const newBlank = () => { engine.reset(); setStatement(''); setComposing(false); setView('now'); autoLoadedRef.current = false; };
  // From the anatomy's "add a new decision": open the cold one-ask.
  const compose = () => { engine.reset(); setStatement(''); setComposing(true); setView('now'); };
  // From the anatomy's switcher / History: open another decision for review AND
  // make it the single pinned one (one decision in focus at a time).
  const switchTo = (id: string) => { setComposing(false); setJustRan(false); setView('now'); engine.reset(); engine.load(id); void pin(id); inbox.refresh(); void refreshPinned(); };

  const bankCall = async () => {
    const c = engine.decisionCase;
    if (!c) return;
    setBanking(true);
    try {
      const breakpoint = c.breakpoint_assumption_id
        ?? engine.claims.find((cl) => cl.is_load_bearing)?.id
        ?? null;
      await recordCall(c.id, breakpoint, 'accept');
      setBanked(true);
    } catch {
      // fail-open: never trap the user behind a save error
      setBanked(true);
    } finally {
      setBanking(false);
    }
  };

  // The closing move: record how it played out (+ optional conclusion), then move
  // focus to the next active decision (or the cold state) and refresh History.
  const doResolve = async (playedOut: PlayedOut, conclusion: string) => {
    const c = engine.decisionCase;
    if (!c) return;
    try {
      await resolve(c.id, playedOut, conclusion);
    } catch {
      // fail-open: don't trap the leader if the write hiccups; the refresh below
      // reconciles against the real state.
    }
    setResolveOpen(false);
    setView('now');
    setComposing(false);
    setStatement('');
    autoLoadedRef.current = true; // we drive the next surface explicitly; block the auto-load race

    const remaining = activeCases.filter((x) => x.id !== c.id);
    engine.reset();
    if (remaining.length > 0) {
      const next = remaining.find((x) => x.pinned_at) ?? remaining[0];
      engine.load(next.id);
    }
    inbox.refresh();
    void trackRecord.refetch();
    void refreshPinned();
  };

  const hasActive = Boolean(engine.decisionCase) && (engine.isRunning || engine.isComplete || engine.decisionCase?.stage === 'error');
  const isErrored = engine.decisionCase?.stage === 'error';
  // The critical-call gate only fires for a freshly-weighed case (justRan), so
  // reviewing an existing decision opens straight into its anatomy.
  const needsCall = justRan && engine.isComplete && engine.claims.some((c) => c.is_load_bearing) && !callDone;
  const activeStatement = engine.decisionCase?.title || engine.decisionCase?.statement || statement;

  // ---- pick the one "Now" surface in focus -------------------------------------
  let surface: React.ReactNode;
  if (engine.upgradeRequired) {
    surface = <UpgradeCard message={engine.upgradeMessage} onUpgrade={handleUpgrade} processing={isProcessing} />;
  } else if (engine.starting) {
    surface = <DecisionLoading />;
  } else if (hasActive && isErrored) {
    surface = <DecisionErrorView message={engine.error || engine.decisionCase?.error_detail || null} onReset={newBlank} />;
  } else if (hasActive && engine.isRunning && engine.decisionCase) {
    surface = <DecisionRunning stage={engine.decisionCase.stage} statement={activeStatement} isDesktop={isDesktop} />;
  } else if (hasActive && needsCall) {
    surface = <CriticalCallStep engine={engine} onDone={handleCallDone} />;
  } else if (hasActive && engine.isComplete && justRan) {
    // Fresh run: the focused result + closure (bank), then back to the anatomy.
    surface = <DecisionResultView engine={engine} onBack={newBlank} onBank={bankCall} banked={banked} banking={banking} isDesktop={isDesktop} />;
  } else if (hasActive && engine.isComplete) {
    // Review: the in-depth anatomy of this decision (the tab's front door).
    surface = (
      <DecisionAnatomy
        engine={engine}
        cases={activeCases}
        onSwitch={switchTo}
        onCompose={compose}
        onResolve={() => setResolveOpen(true)}
        isDesktop={isDesktop}
      />
    );
  } else if (composing) {
    surface = <DecisionCold value={statement} onChange={setStatement} onStart={startNew} starting={engine.starting} isDesktop={isDesktop} />;
  } else if (inbox.loading || activeCases.length > 0) {
    // active cases exist: the auto-load / switch is in flight - hold on the loader.
    surface = <DecisionLoading />;
  } else {
    surface = <DecisionCold value={statement} onChange={setStatement} onStart={startNew} starting={engine.starting} isDesktop={isDesktop} />;
  }

  // The toggle (and History) only show in the restful states - never mid-weigh, so
  // one ask per screen holds during a run.
  const showToggle = !engine.upgradeRequired
    && !engine.starting
    && !(hasActive && (engine.isRunning || isErrored))
    && !needsCall
    && !(hasActive && engine.isComplete && justRan);
  const effectiveView: 'now' | 'history' = showToggle && view === 'history' ? 'history' : 'now';

  // ---- HISTORY surface: the Track Record, reused as-is -------------------------
  const trModel = useMemo(() => buildTrackRecordModel(trackRecord.records), [trackRecord.records]);
  const openFromHistory = (prefill?: string) => { setStatement(prefill ?? ''); setComposing(true); setView('now'); haptics.light(); };
  const historySurface = (
    <div className={cn('h-full min-h-0 overflow-y-auto scrollbar-hide', isDesktop ? '' : 'pb-2')}>
      {trackRecord.loading
        ? <TrackRecordSkeleton desktop={isDesktop} />
        : <TrackRecordView model={trModel} desktop={isDesktop} onWeigh={openFromHistory} />}
    </div>
  );

  // Two renderings of the same Now | History switch:
  //  - inline (`viewToggle`): a full-width segmented control above the surface,
  //    used on desktop where there is room.
  //  - header (`headerToggle`): a compact pill teleported into the persistent
  //    mobile AppHeader (MobileHeaderSlotContext), so the toggle reads as chrome
  //    and the phone gets back a full row of content height.
  const renderToggle = (compact: boolean) => (
    <div
      className={cn(
        'flex shrink-0 gap-1 rounded-xl border border-border bg-foreground/[0.03] p-1',
        compact ? 'w-[180px]' : 'mb-2.5',
      )}
    >
      {(['now', 'history'] as const).map((v) => {
        const on = view === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => { setView(v); haptics.light(); }}
            className={cn(
              'flex-1 rounded-lg font-bold transition-colors',
              compact ? 'px-3 py-1 text-[12px]' : 'px-3 py-1.5 text-[12px]',
              on ? 'bg-gradient-to-b from-accent to-accent text-accent-foreground shadow-[0_8px_18px_-10px_hsl(var(--accent)/0.6)]' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {v === 'now' ? 'Now' : 'History'}
          </button>
        );
      })}
    </div>
  );
  const viewToggle = renderToggle(false);

  // On mobile, push the compact toggle into the header (memoized so the slot
  // setter only fires when the relevant state changes, never every render).
  const headerToggle = useMemo(
    () => (isMobile && showToggle ? renderToggle(true) : null),
    // renderToggle closes over `view` (the only mutable input); setView/haptics
    // are stable. Re-create only when the toggle's visibility or state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isMobile, showToggle, view],
  );
  useMobileHeaderSlot(headerToggle);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showToggle && !isMobile && viewToggle}
      <div className="min-h-0 flex-1">{effectiveView === 'history' ? historySurface : surface}</div>
      <ResolveDecisionSheet
        open={resolveOpen}
        onOpenChange={setResolveOpen}
        statement={activeStatement}
        onResolve={doResolve}
        resolving={resolving}
      />
    </div>
  );
}
