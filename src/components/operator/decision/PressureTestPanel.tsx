import { useState, useCallback, useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDecisionEngine } from '@/hooks/useDecisionEngine';
import { useDecisionInbox } from '@/hooks/useDecisionInbox';
import { usePinnedDecision } from '@/hooks/usePinnedDecision';
import { useDecisionCall } from '@/hooks/useDecisionCall';
import { useEdgeSubscription } from '@/hooks/useEdgeSubscription';
import {
  DecisionCold, DecisionLoading, DecisionErrorView, UpgradeCard,
} from '@/components/operator/decision/decision-views';
import { DecisionRunning } from '@/components/operator/decision/DecisionRunning';
import { DecisionResultView } from '@/components/operator/decision/DecisionResultView';
import { DecisionAnatomy } from '@/components/operator/decision/DecisionAnatomy';
import { CriticalCallStep } from '@/components/operator/decision/CriticalCallStep';

/**
 * The Decisions tab, rebuilt to prototypes/decisions-2028.html (the approved
 * 2028 radical-focus mock). One job: move a decision forward (pressure-test it),
 * with ONE ask per screen.
 *
 * The five first-class states (CTRL-SYSTEM-SPEC.md s6 "state is the experience"),
 * each device-native (s6 "device-native, not one UI scaled"):
 *   LOADING  - branded SkeletonCard (no raw spinner).
 *   COLD     - one input card: type or talk (one mic in the footer), the example
 *              as ghost text, one "Weigh it" CTA. No explainer wall, no separate
 *              Record button, no 3 chips, no floating mic FAB.
 *   WARM     - the live pressure-tests as calm cards + a slim fast-capture bar.
 *   RUNNING  - the branded orb + a live 4-step pipeline wired to the REAL
 *              useDecisionEngine `stage` (decompose / read-sources / cross-examine
 *              / weigh), never faked.
 *   RESULT   - a reframe note + THE CALL hero (verdict + trust bar) + holds/breaks
 *              + the watch line + 2 actions.
 *
 * Mobile is one thumb-first column in MobileFrame (no page scroll); desktop is a
 * calm two-zone command surface in DesktopShell. The shell itself is owned by a
 * separate pass; this panel only renders inside the bounded slot it is handed.
 */
export function PressureTestPanel({ initialStatement }: { initialStatement?: string } = {}) {
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;
  const [statement, setStatement] = useState(initialStatement ?? '');
  const engine = useDecisionEngine();
  const inbox = useDecisionInbox();
  const { pin } = usePinnedDecision();
  const { subscribe, isProcessing } = useEdgeSubscription();
  const { recordCall } = useDecisionCall();

  // B6 critical-evaluation gate: force the user's own call on a load-bearing claim
  // before revealing the recommendation. Resets when the active case changes.
  const [callDone, setCallDone] = useState(false);
  const handleCallDone = useCallback(() => setCallDone(true), []);
  useEffect(() => { setCallDone(false); }, [engine.decisionCase?.id]);

  // The "bank this call" closure moment on the result.
  const [banking, setBanking] = useState(false);
  const [banked, setBanked] = useState(false);
  useEffect(() => { setBanked(false); }, [engine.decisionCase?.id]);

  // "Compose" forces the COLD one-ask even when the account already has decisions
  // (the anatomy's "weigh a new one" tap, or a prefilled deep-link from History /
  // the Decision Map), so a returning leader can always weigh another. Cleared
  // once a run starts or a case is opened.
  const [composing, setComposing] = useState(Boolean(initialStatement));

  // justRan = the leader actively weighed this case in this session, so the
  // critical-call gate + the result view apply. When a case is auto-loaded or
  // switched-to for REVIEW, we skip the gate and open straight into the anatomy.
  const [justRan, setJustRan] = useState(false);
  useEffect(() => { setJustRan(false); }, [engine.decisionCase?.id]);

  // Auto-load the ONE pinned decision so the tab opens into its anatomy (not a
  // list). Falls back to the most recent case if a pin somehow isn't set yet.
  // Runs once per "rest" state; the ref re-arms whenever we reset back to blank.
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (autoLoadedRef.current) return;
    if (composing || engine.starting || engine.decisionCase) return;
    if (inbox.loading || inbox.cases.length === 0) return;
    autoLoadedRef.current = true;
    const pinned = inbox.cases.find((c) => c.pinned_at) ?? inbox.cases[0];
    engine.load(pinned.id);
  }, [composing, engine, inbox.loading, inbox.cases]);

  const handleUpgrade = async () => { const url = await subscribe(); if (url) window.location.href = url; };

  const startNew = async () => {
    setComposing(false);
    setJustRan(true);
    autoLoadedRef.current = true; // a fresh run owns the surface; don't auto-load over it
    await engine.start(statement);
    inbox.refresh();
  };
  // From the anatomy/error: clear back to the account's natural state (re-arm
  // auto-load so the latest decision's anatomy returns).
  const newBlank = () => { engine.reset(); setStatement(''); setComposing(false); autoLoadedRef.current = false; };
  // From the anatomy's "weigh a new one": open the cold one-ask.
  const compose = () => { engine.reset(); setStatement(''); setComposing(true); };
  // From the anatomy's switcher: open another decision for review AND make it the
  // single pinned one (one decision in focus at a time).
  const switchTo = (id: string) => { setComposing(false); setJustRan(false); engine.reset(); engine.load(id); void pin(id); inbox.refresh(); };

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

  const hasActive = Boolean(engine.decisionCase) && (engine.isRunning || engine.isComplete || engine.decisionCase?.stage === 'error');
  const isErrored = engine.decisionCase?.stage === 'error';
  // The critical-call gate only fires for a freshly-weighed case (justRan), so
  // reviewing an existing decision opens straight into its anatomy.
  const needsCall = justRan && engine.isComplete && engine.claims.some((c) => c.is_load_bearing) && !callDone;
  const activeStatement = engine.decisionCase?.title || engine.decisionCase?.statement || statement;

  // ---- pick the one surface in focus ---------------------------------------
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
        cases={inbox.cases}
        onSwitch={switchTo}
        onCompose={compose}
        onBank={bankCall}
        banked={banked}
        banking={banking}
        isDesktop={isDesktop}
      />
    );
  } else if (composing) {
    surface = <DecisionCold value={statement} onChange={setStatement} onStart={startNew} starting={engine.starting} isDesktop={isDesktop} />;
  } else if (inbox.loading || inbox.cases.length > 0) {
    // cases exist: the auto-load / switch is in flight - hold on the branded loader.
    surface = <DecisionLoading />;
  } else {
    surface = <DecisionCold value={statement} onChange={setStatement} onStart={startNew} starting={engine.starting} isDesktop={isDesktop} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">{surface}</div>
    </div>
  );
}
