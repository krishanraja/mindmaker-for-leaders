import { useState, useCallback, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDecisionEngine } from '@/hooks/useDecisionEngine';
import { useDecisionInbox, type OpenAlert } from '@/hooks/useDecisionInbox';
import { useDecisionCall } from '@/hooks/useDecisionCall';
import { useEdgeSubscription } from '@/hooks/useEdgeSubscription';
import {
  DecisionCold, DecisionLoading, DecisionErrorView, AlertBanner, UpgradeCard,
} from '@/components/operator/decision/decision-views';
import { DecisionBoard } from '@/components/operator/decision/DecisionBoard';
import { DecisionRunning } from '@/components/operator/decision/DecisionRunning';
import { DecisionResultView } from '@/components/operator/decision/DecisionResultView';
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

  const handleUpgrade = async () => { const url = await subscribe(); if (url) window.location.href = url; };

  const startNew = async () => {
    await engine.start(statement);
    inbox.refresh();
  };
  const newBlank = () => { engine.reset(); setStatement(''); };
  const openCase = (id: string) => { engine.reset(); engine.load(id); };
  const reRun = (a: OpenAlert) => {
    const c = inbox.cases.find((x) => x.id === a.decision_case_id);
    inbox.acknowledge(a.id);
    if (c) { setStatement(c.statement); engine.reset(); }
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

  const hasActive = Boolean(engine.decisionCase) && (engine.isRunning || engine.isComplete || engine.decisionCase?.stage === 'error');
  const isErrored = engine.decisionCase?.stage === 'error';
  const needsCall = engine.isComplete && engine.claims.some((c) => c.is_load_bearing) && !callDone;
  const activeStatement = engine.decisionCase?.title || engine.decisionCase?.statement || statement;

  // ---- pick the one surface in focus ---------------------------------------
  let surface: React.ReactNode;
  if (engine.upgradeRequired) {
    surface = <UpgradeCard message={engine.upgradeMessage} onUpgrade={handleUpgrade} processing={isProcessing} />;
  } else if (hasActive && isErrored) {
    surface = <DecisionErrorView message={engine.error || engine.decisionCase?.error_detail || null} onReset={newBlank} />;
  } else if (hasActive && engine.isRunning && engine.decisionCase) {
    surface = <DecisionRunning stage={engine.decisionCase.stage} statement={activeStatement} isDesktop={isDesktop} />;
  } else if (hasActive && needsCall) {
    surface = <CriticalCallStep engine={engine} onDone={handleCallDone} />;
  } else if (hasActive && engine.isComplete) {
    surface = <DecisionResultView engine={engine} onBack={newBlank} onBank={bankCall} banked={banked} banking={banking} isDesktop={isDesktop} />;
  } else if (inbox.loading) {
    surface = <DecisionLoading />;
  } else if (inbox.cases.length > 0) {
    surface = <DecisionBoard cases={inbox.cases} onOpen={openCase} onNew={newBlank} isDesktop={isDesktop} />;
  } else {
    surface = <DecisionCold value={statement} onChange={setStatement} onStart={startNew} starting={engine.starting} isDesktop={isDesktop} />;
  }

  // The alert banner shows only on the cold / warm states (never over a live run
  // or result), and only one canonical home per thing (SPEC s2.1).
  const showAlert = !hasActive && !inbox.loading && inbox.alerts.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showAlert && (
        <div className="shrink-0 pb-3">
          <AlertBanner alerts={inbox.alerts} onReRun={reRun} onDismiss={(a) => inbox.acknowledge(a.id)} />
        </div>
      )}
      <div className="min-h-0 flex-1">{surface}</div>
    </div>
  );
}
