import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileHeaderSlot } from '@/contexts/MobileHeaderSlotContext';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useDecisionEngine } from '@/hooks/useDecisionEngine';
import { useDecisionInbox } from '@/hooks/useDecisionInbox';
import { usePinnedDecision } from '@/hooks/usePinnedDecision';
import { useDecisionCall } from '@/hooks/useDecisionCall';
import { useResolveDecision } from '@/hooks/useResolveDecision';
import { useDecisionActions } from '@/hooks/useDecisionActions';
import { useTrackRecord } from '@/hooks/useTrackRecord';
import { useEdgeSubscription } from '@/hooks/useEdgeSubscription';
import {
  DecisionCold, DecisionLoading, DecisionErrorView, UpgradeCard,
} from '@/components/operator/decision/decision-views';
import { DecisionRunning } from '@/components/operator/decision/DecisionRunning';
import { DecisionResultView } from '@/components/operator/decision/DecisionResultView';
import { DecisionAnatomy, SwitcherSheet } from '@/components/operator/decision/DecisionAnatomy';
import { DecisionDemo } from '@/components/operator/decision/DecisionDemo';
import { CriticalCallStep } from '@/components/operator/decision/CriticalCallStep';
import { ResolveDecisionSheet } from '@/components/operator/decision/ResolveDecisionSheet';
import { DecisionResolvedMoment } from '@/components/operator/decision/DecisionResolvedMoment';
import { nextActiveCase } from '@/components/operator/decision/resolveFlow';
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
export function PressureTestPanel({
  initialStatement,
  initialOpenCaseId,
  initialStrengthen = false,
}: {
  initialStatement?: string;
  /** Deep-link a specific case open (from a track-record "Active decision" card). */
  initialOpenCaseId?: string;
  /** After opening, kick the existing strengthen research door. */
  initialStrengthen?: boolean;
} = {}) {
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;
  const [statement, setStatement] = useState(initialStatement ?? '');
  const engine = useDecisionEngine();
  const inbox = useDecisionInbox();
  const { pin, refresh: refreshPinned } = usePinnedDecision();
  const { subscribe, isProcessing } = useEdgeSubscription();
  const { recordCall } = useDecisionCall();
  const { resolve, resolving } = useResolveDecision();
  const { archive, archivingId } = useDecisionActions();
  const trackRecord = useTrackRecord();

  // When set to a case id, the pending-strengthen effect fires the existing
  // research('strengthen') door once that case finishes loading. Serves both the
  // deep-link (initialStrengthen) and the in-panel "Strengthen" card action.
  const pendingStrengthenIdRef = useRef<string | null>(null);
  const openHandledRef = useRef(false);

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
  // The "Open decisions (N)" switcher reachable from the capture-first cold state
  // (the anatomy has its own instance for the in-review case).
  const [coldSwitcherOpen, setColdSwitcherOpen] = useState(false);
  // The post-resolve moment: closure beat + the ask for the next decision. Set
  // only after the resolve write really committed.
  const [resolvedMoment, setResolvedMoment] = useState<{ caseId: string; statement: string; playedOut: PlayedOut } | null>(null);

  // "Compose" forces the COLD one-ask even when the account already has decisions.
  const [composing, setComposing] = useState(Boolean(initialStatement));

  // justRan = the leader actively weighed this case in this session, so the
  // critical-call gate + the result view apply. Auto-loaded/switched-to cases open
  // straight into the anatomy for REVIEW.
  const [justRan, setJustRan] = useState(false);
  useEffect(() => { setJustRan(false); }, [engine.decisionCase?.id]);

  // Auto-load ONLY the pinned decision (the one genuinely in focus). With no pin -
  // right after a resolve, or none ever set - the tab leads with the capture ask,
  // never an arbitrary old case (that regression looked like "the decision I just
  // closed popped back up"). Older actives stay one tap away via "Open decisions".
  // A leader with no cases at all still gets the worked example (DecisionDemo).
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (autoLoadedRef.current) return;
    if (composing || engine.starting || engine.decisionCase) return;
    if (inbox.loading) return;
    autoLoadedRef.current = true;
    const pinned = activeCases.find((c) => c.pinned_at);
    if (pinned) engine.load(pinned.id);
    else if (inbox.cases.length > 0) setComposing(true);
  }, [composing, engine, inbox.loading, inbox.cases.length, activeCases]);

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
  const newBlank = () => { engine.reset(); setStatement(''); setComposing(false); setResolvedMoment(null); setView('now'); autoLoadedRef.current = false; };
  // From the anatomy's "add a new decision": open the cold one-ask.
  const compose = () => { engine.reset(); setStatement(''); setComposing(true); setResolvedMoment(null); setView('now'); };
  // From the anatomy's switcher / History: open another decision for review AND
  // make it the single pinned one (one decision in focus at a time).
  const switchTo = (id: string) => { setComposing(false); setJustRan(false); setResolvedMoment(null); setView('now'); engine.reset(); engine.load(id); void pin(id); inbox.refresh(); void refreshPinned(); };

  // A track-record "Active decision" card deep-linked a case: open it (same door
  // as the switcher) and, if asked, queue the strengthen run for when it loads.
  useEffect(() => {
    if (openHandledRef.current || !initialOpenCaseId || inbox.loading) return;
    openHandledRef.current = true;
    autoLoadedRef.current = true; // the deep-link owns the surface; block the auto-load race
    if (initialStrengthen) pendingStrengthenIdRef.current = initialOpenCaseId;
    switchTo(initialOpenCaseId);
    // switchTo/engine are stable enough here; run once when the deep-link resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOpenCaseId, initialStrengthen, inbox.loading]);

  // Fire the existing strengthen research once the queued case has finished
  // loading (its stage is complete). Reuses useDecisionEngine.research - no new door.
  useEffect(() => {
    const target = pendingStrengthenIdRef.current;
    if (target && engine.isComplete && engine.decisionCase?.id === target) {
      pendingStrengthenIdRef.current = null;
      void engine.research('strengthen');
    }
  }, [engine.isComplete, engine.decisionCase?.id, engine]);

  // The active-decision control centre for the History (track-record) list: open
  // / strengthen / archive, each reusing an existing door.
  const historyDecisionActions = {
    onOpen: (id: string) => switchTo(id),
    onStrengthen: (id: string) => { pendingStrengthenIdRef.current = id; switchTo(id); },
    onArchive: async (id: string) => {
      await archive(id);
      void inbox.refresh();
      void trackRecord.refetch();
      void refreshPinned();
    },
    archivingId,
  };

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

  // The closing move: record how it played out (+ optional conclusion). Honest on
  // failure (the sheet stays open and says so - never pretend a decision closed),
  // and on success the surface becomes the resolved moment: a closure beat, then
  // ONE ask - voice or type the next big decision.
  const doResolve = async (playedOut: PlayedOut, conclusion: string): Promise<boolean> => {
    const c = engine.decisionCase;
    if (!c) return false;
    try {
      await resolve(c.id, playedOut, conclusion);
    } catch {
      toast.error('I could not close this one. Nothing was lost. Try again.');
      return false;
    }
    setResolveOpen(false);
    setView('now');
    setComposing(false);
    setStatement('');
    setCallDone(false);
    autoLoadedRef.current = true; // the moment owns the surface; block the auto-load race
    engine.reset();
    setResolvedMoment({ caseId: c.id, statement: c.title || c.statement, playedOut });
    void inbox.refresh();
    void trackRecord.refetch();
    void refreshPinned();
    return true;
  };

  // Exits from the resolved moment.
  const startNextFromMoment = async () => { setResolvedMoment(null); await startNew(); };
  const openNextDecision = () => {
    // Read the LIVE active list at click time (never the pre-refresh snapshot),
    // and never re-open the case that was just resolved.
    const next = nextActiveCase(activeCases, resolvedMoment?.caseId ?? null);
    setResolvedMoment(null);
    if (next) { engine.load(next.id); void pin(next.id); void refreshPinned(); } else setComposing(true);
  };
  const seeHistory = () => {
    setResolvedMoment(null);
    autoLoadedRef.current = false; // re-arm so toggling back to Now auto-loads instead of stalling
    setView('history');
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
    // The kickoff invoke is genuinely in flight: the honest "pausing on your
    // words" beat of the same running show (never a raw skeleton here).
    surface = <DecisionRunning stage="reading" statement={activeStatement} isDesktop={isDesktop} />;
  } else if (resolvedMoment) {
    // Just closed one: the closure beat, then THE ask - what's the next big call?
    surface = (
      <DecisionResolvedMoment
        statement={resolvedMoment.statement}
        playedOut={resolvedMoment.playedOut}
        openCount={activeCases.filter((x) => x.id !== resolvedMoment.caseId).length}
        resolvedCount={trackRecord.records.filter((r) => r.played_out != null).length}
        captureValue={statement}
        onCaptureChange={setStatement}
        onWeigh={startNextFromMoment}
        starting={engine.starting}
        onOpenNext={openNextDecision}
        onSeeHistory={seeHistory}
        isDesktop={isDesktop}
      />
    );
  } else if (hasActive && isErrored) {
    surface = <DecisionErrorView message={engine.error || engine.decisionCase?.error_detail || null} onReset={newBlank} />;
  } else if (hasActive && engine.isRunning && engine.decisionCase) {
    surface = (
      <DecisionRunning
        stage={engine.decisionCase.stage}
        statement={activeStatement}
        decisionCase={engine.decisionCase}
        claims={engine.claims}
        isDesktop={isDesktop}
      />
    );
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
    surface = (
      <DecisionCold
        value={statement}
        onChange={setStatement}
        onStart={startNew}
        starting={engine.starting}
        isDesktop={isDesktop}
        returning={inbox.cases.length > 0}
        openCount={activeCases.length}
        onOpenDecisions={() => { setColdSwitcherOpen(true); haptics.light(); }}
      />
    );
  } else if (inbox.loading || activeCases.length > 0) {
    // active cases exist: the auto-load / switch is in flight - hold on the loader.
    surface = <DecisionLoading />;
  } else {
    // No decisions yet: show the worked example so the tab always has the right shape, with one
    // tap to weigh your own (which opens the cold capture input via `composing`).
    surface = <DecisionDemo isDesktop={isDesktop} onWeighOwn={() => { setComposing(true); haptics.light(); }} />;
  }

  // The toggle (and History) only show in the restful states - never mid-weigh, so
  // one ask per screen holds during a run.
  const showToggle = !engine.upgradeRequired
    && !engine.starting
    && !resolvedMoment
    && !(hasActive && (engine.isRunning || isErrored))
    && !needsCall
    && !(hasActive && engine.isComplete && justRan);
  const effectiveView: 'now' | 'history' = showToggle && view === 'history' ? 'history' : 'now';

  // ---- HISTORY surface: the Track Record, reused as-is -------------------------
  const trModel = useMemo(() => buildTrackRecordModel(trackRecord.records), [trackRecord.records]);
  const openFromHistory = (prefill?: string) => { setStatement(prefill ?? ''); setComposing(true); setResolvedMoment(null); setView('now'); haptics.light(); };
  const historySurface = (
    <div className={cn('h-full min-h-0 overflow-y-auto scrollbar-hide', isDesktop ? '' : 'pb-2')}>
      {trackRecord.loading
        ? <TrackRecordSkeleton desktop={isDesktop} />
        : <TrackRecordView model={trModel} desktop={isDesktop} onWeigh={openFromHistory} decisionActions={historyDecisionActions} variant="list" />}
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
      <SwitcherSheet
        open={coldSwitcherOpen}
        onOpenChange={setColdSwitcherOpen}
        cases={activeCases}
        currentId={null}
        onSwitch={switchTo}
      />
    </div>
  );
}
