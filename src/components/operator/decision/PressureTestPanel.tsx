import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDecisionEngine } from '@/hooks/useDecisionEngine';
import { useDecisionInbox, type OpenAlert } from '@/hooks/useDecisionInbox';
import { useEdgeSubscription } from '@/hooks/useEdgeSubscription';
import {
  DecisionResult, CaptureView, AlertBanner, RecentRail, UpgradeCard,
} from '@/components/operator/decision/decision-views';
import { CriticalCallStep } from '@/components/operator/decision/CriticalCallStep';

// ----- orchestrator ---------------------------------------------------------

export function PressureTestPanel({ initialStatement }: { initialStatement?: string } = {}) {
  const isMobile = useIsMobile();
  // Seed from a starter the leader picked on the Decision Map empty state.
  const [statement, setStatement] = useState(initialStatement ?? '');
  const engine = useDecisionEngine();
  const inbox = useDecisionInbox();
  const { subscribe, isProcessing } = useEdgeSubscription();

  // B6 critical-evaluation gate: force the user's own call on a load-bearing
  // claim before revealing the recommendation. Resets whenever the active case
  // changes; the step itself skips cases already called on (fail-open).
  const [callDone, setCallDone] = useState(false);
  const handleCallDone = useCallback(() => setCallDone(true), []);
  useEffect(() => { setCallDone(false); }, [engine.decisionCase?.id]);

  const handleUpgrade = async () => { const url = await subscribe(); if (url) window.location.href = url; };

  const startNew = async () => {
    await engine.start(statement);
    inbox.refresh();
  };
  const newBlank = () => { engine.reset(); setStatement(''); };
  const reRun = (a: OpenAlert) => { const c = inbox.cases.find((x) => x.id === a.decision_case_id); inbox.acknowledge(a.id); if (c) { setStatement(c.statement); engine.reset(); } };

  const hasActive = Boolean(engine.decisionCase) && (engine.isRunning || engine.isComplete || engine.decisionCase?.stage === 'error');
  const needsCall = engine.isComplete && engine.claims.some((c) => c.is_load_bearing) && !callDone;

  // The active surface: upgrade gate, the critical-call step, the result
  // instrument, or the one clear ask (capture). The result is a fit-to-viewport
  // instrument, so the layouts below hand it a bounded `h-full min-h-0` context
  // rather than a growing card.
  const active = engine.upgradeRequired ? (
    <UpgradeCard message={engine.upgradeMessage} onUpgrade={handleUpgrade} processing={isProcessing} />
  ) : hasActive ? (
    needsCall ? (
      <CriticalCallStep engine={engine} onDone={handleCallDone} />
    ) : (
      <DecisionResult engine={engine} onReset={newBlank} />
    )
  ) : null;

  const captureCard = (autoFocus?: boolean) => (
    <Card><CardContent className="p-5 sm:p-6"><CaptureView value={statement} onChange={setStatement} onStart={startNew} starting={engine.starting} autoFocus={autoFocus} /></CardContent></Card>
  );

  // Only the running/result instrument owns the full height. Capture, the
  // critical call, and the upgrade gate are centred cards on the start state.
  const showInstrument = hasActive && !needsCall && !engine.upgradeRequired;

  // ---- MOBILE: one thing at a time -----------------------------------------
  if (isMobile) {
    return (
      <div className="flex flex-col h-full min-h-0">
        {showInstrument ? (
          <div className="flex-1 min-h-0">{active}</div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide space-y-4">
            {!hasActive && <AlertBanner alerts={inbox.alerts} onReRun={reRun} onDismiss={(a) => inbox.acknowledge(a.id)} />}
            {active ?? captureCard()}
          </div>
        )}
      </div>
    );
  }

  // ---- DESKTOP: command-centre (rail + active pane) ------------------------
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="pb-3 shrink-0"><AlertBanner alerts={inbox.alerts} onReRun={reRun} onDismiss={(a) => inbox.acknowledge(a.id)} /></div>
      <div className="grid grid-cols-[280px_1fr] gap-5 flex-1 min-h-0">
        <div className="min-h-0 overflow-y-auto scrollbar-hide"><RecentRail cases={inbox.cases} activeId={engine.decisionCase?.id ?? null} onSelect={engine.load} onNew={newBlank} /></div>
        <div className="min-h-0">
          {showInstrument ? (
            active
          ) : (
            <div className="h-full min-h-0 overflow-y-auto scrollbar-hide">
              <div className="max-w-2xl">{active ?? captureCard(true)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
