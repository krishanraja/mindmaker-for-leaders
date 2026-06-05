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

export function PressureTestPanel() {
  const isMobile = useIsMobile();
  const [statement, setStatement] = useState('');
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

  // ---- MOBILE: one thing at a time -----------------------------------------
  if (isMobile) {
    return (
      <div className="space-y-4">
        {!hasActive && <AlertBanner alerts={inbox.alerts} onReRun={reRun} onDismiss={(a) => inbox.acknowledge(a.id)} />}
        {engine.upgradeRequired ? (
          <UpgradeCard message={engine.upgradeMessage} onUpgrade={handleUpgrade} processing={isProcessing} />
        ) : hasActive ? (
          needsCall ? (
            <CriticalCallStep engine={engine} onDone={handleCallDone} />
          ) : (
            <DecisionResult engine={engine} onReset={newBlank} />
          )
        ) : (
          <Card><CardContent className="p-5"><CaptureView value={statement} onChange={setStatement} onStart={startNew} starting={engine.starting} /></CardContent></Card>
        )}
      </div>
    );
  }

  // ---- DESKTOP: command-centre (rail + active pane) ------------------------
  return (
    <div className="space-y-4">
      <AlertBanner alerts={inbox.alerts} onReRun={reRun} onDismiss={(a) => inbox.acknowledge(a.id)} />
      <div className="grid grid-cols-[280px_1fr] gap-5 items-start">
        <div className="sticky top-4"><RecentRail cases={inbox.cases} activeId={engine.decisionCase?.id ?? null} onSelect={engine.load} onNew={newBlank} /></div>
        <div>
          {engine.upgradeRequired ? (
            <UpgradeCard message={engine.upgradeMessage} onUpgrade={handleUpgrade} processing={isProcessing} />
          ) : hasActive ? (
            needsCall ? (
              <CriticalCallStep engine={engine} onDone={handleCallDone} />
            ) : (
              <DecisionResult engine={engine} onReset={newBlank} />
            )
          ) : (
            <Card><CardContent className="p-6 max-w-2xl"><CaptureView value={statement} onChange={setStatement} onStart={startNew} starting={engine.starting} autoFocus /></CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}
