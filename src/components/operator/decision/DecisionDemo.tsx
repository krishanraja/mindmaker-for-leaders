/**
 * DecisionDemo - the empty/first-run Decisions surface: a worked AI-native example rendered with
 * the real DecisionSpider + ForceDrawer, so a leader who has not weighed anything yet still sees
 * exactly what a decision looks like (centre decision + six forces, colour-coded by health, tap to
 * interrogate). One primary button weighs their own (opens the cold capture input).
 */

import { useMemo, useState } from 'react';
import type { Dimension } from '@/hooks/useDecisionEngine';
import { DecisionSpider } from './DecisionSpider';
import { ForceDrawer } from './ForceDrawer';
import { buildSpider } from './decisionSpiderModel';
import { DEMO_CASE, DEMO_CLAIMS, DEMO_EVIDENCE } from './demoDecision';

export function DecisionDemo({ isDesktop, onWeighOwn }: { isDesktop: boolean; onWeighOwn: () => void }) {
  const [force, setForce] = useState<Dimension | null>(null);
  const spider = useMemo(() => buildSpider(DEMO_CLAIMS, DEMO_CASE.force_labels), []);
  const forceObj = force ? spider.forces.find((f) => f.key === force) ?? null : null;
  const evFor = (id: string) => DEMO_EVIDENCE.filter((e) => e.claim_id === id);
  const pct = DEMO_CASE.confidence != null ? Math.round(DEMO_CASE.confidence * 100) : null;

  const header = (
    <div className="shrink-0 rounded-2xl border border-accent/30 bg-gradient-to-b from-card to-background p-3.5">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">Example</span>
        <span className="text-[11px] text-muted-foreground">Tap a force to see how it reads.</span>
      </div>
      <h2 className="mt-1.5 text-[16.5px] font-extrabold leading-snug text-foreground text-balance">{DEMO_CASE.title}</h2>
    </div>
  );

  const canvas = (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-[radial-gradient(120%_90%_at_50%_-10%,hsl(var(--accent)/0.05),transparent_60%)]">
      <DecisionSpider claims={DEMO_CLAIMS} forceLabels={DEMO_CASE.force_labels} pct={pct} selectedKey={force} onSelect={setForce} peekFirst={!isDesktop} />
    </div>
  );

  const weighOwn = (
    <button
      type="button"
      onClick={onWeighOwn}
      className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-accent px-3 py-3 text-[13px] font-bold text-accent-foreground shadow-[0_12px_26px_-12px_hsl(var(--accent)/0.5)]"
    >
      Weigh your own decision
    </button>
  );

  if (isDesktop) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        {header}
        <div className="grid min-h-0 flex-1 grid-cols-[1.1fr_0.9fr] gap-4">
          {canvas}
          <ForceDrawer force={forceObj} evidenceFor={evFor} isDesktop onClose={() => setForce(null)} />
        </div>
        {weighOwn}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      {header}
      {canvas}
      {weighOwn}
      <ForceDrawer force={forceObj} evidenceFor={evFor} isDesktop={false} onClose={() => setForce(null)} />
    </div>
  );
}
