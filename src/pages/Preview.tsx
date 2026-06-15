// Fixture-render harness (dev/QC). Renders each surface's presentational components against
// the RANGE of content they must hold - so every state can be screenshot + checked before it
// reaches a user (no auth, no data round-trip). Not linked in nav; remove when the redesign is done.
import { useState, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { DecisionCard } from '@/components/track-record/DecisionCard';
import { ConsiderationStone } from '@/components/decision-map/ConsiderationStone';
import type { TrackRecordRow } from '@/types/track-record';
import type { DecisionClaim, DecisionEvidence } from '@/hooks/useDecisionEngine';

const noop = () => {};

const TRACK_FIXTURES: { label: string; row: TrackRecordRow }[] = [
  {
    label: 'played out, read it right, sharpened',
    row: { decision_id: '1', statement: 'Switch our primary AI vendor to the cheaper frontier model?', status: 'decided', decision_kind: 'binary', decided_at: new Date(Date.now() - 6 * 86400000).toISOString(), resolution: 'proceed', played_out: 'true', process_quality: 5, breakpoint_call: 'accept', breakpoint_verdict: 'supported', importance_adjustments: 7 },
  },
  {
    label: "didn't hold, gut differed",
    row: { decision_id: '2', statement: 'Build our own agent stack in-house?', status: 'decided', decision_kind: 'binary', decided_at: new Date(Date.now() - 30 * 86400000).toISOString(), resolution: 'hold', played_out: 'false', process_quality: 2, breakpoint_call: 'accept', breakpoint_verdict: 'contested', importance_adjustments: 3 },
  },
  {
    label: 'not yet played out (the thumb) + calibration',
    row: { decision_id: '3', statement: 'Move customer support to an AI agent first?', status: 'active', decision_kind: 'gtm', decided_at: new Date(Date.now() - 2 * 86400000).toISOString(), resolution: null, played_out: null, process_quality: null, breakpoint_call: 'reject', breakpoint_verdict: 'contested', importance_adjustments: 0 },
  },
  {
    label: 'unsure call (no calibration signal), no outcome',
    row: { decision_id: '4', statement: 'Replatform onto the new agent framework?', status: 'active', decision_kind: 'other', decided_at: new Date().toISOString(), resolution: null, played_out: null, process_quality: null, breakpoint_call: 'unsure', breakpoint_verdict: 'unverified', importance_adjustments: 0 },
  },
  {
    label: 'long statement + no breakpoint data',
    row: { decision_id: '5', statement: 'Should we continue investing in our internal infrastructure or migrate entirely to third-party managed services for better scaling and lower operational overhead?', status: 'active', decision_kind: 'investment', decided_at: new Date(Date.now() - 200 * 86400000).toISOString(), resolution: null, played_out: null, process_quality: null, breakpoint_call: null, breakpoint_verdict: null, importance_adjustments: 0 },
  },
];

function claim(p: Partial<DecisionClaim> & { id: string; text: string; verdict: DecisionClaim['verdict'] }): DecisionClaim {
  return { type: 'market', is_load_bearing: false, confidence: 0.6, rationale: null, ...p };
}

const ev = (id: string, claimId: string, stance: DecisionEvidence['stance'], title: string, url: string | null): DecisionEvidence => ({
  id, claim_id: claimId, source_url: url, source_title: title, excerpt: null, stance, retriever: 'perplexity', retrieved_at: null, relevance_score: 0.8,
});

const STONE_FIXTURES: { label: string; claim: DecisionClaim; evidence: DecisionEvidence[] }[] = [
  {
    label: 'Holds, load-bearing, 2 independent sources',
    claim: claim({ id: 'c1', text: 'Is renting cheaper than building?', verdict: 'supported', is_load_bearing: true, rationale: 'Frontier model pricing fell ~40% this year; multiple providers now undercut self-hosting at this volume.' }),
    evidence: [ev('e1', 'c1', 'supports', 'Reuters: token prices down 40%', 'https://reuters.com/a'), ev('e2', 'c1', 'supports', 'The Information', 'https://theinformation.com/b'), ev('e3', 'c1', 'refutes', 'A vendor blog', 'https://oneblog.com/c')],
  },
  {
    label: 'Thin, single source (corroboration-governed)',
    claim: claim({ id: 'c2', text: 'Will switching costs stay low later?', verdict: 'unverified', rationale: 'Only one source addressed lock-in, and weakly.' }),
    evidence: [ev('e4', 'c2', 'supports', 'someblog.dev', 'https://someblog.dev/x')],
  },
  {
    label: 'Contested',
    claim: claim({ id: 'c3', text: 'Are open models at frontier parity for our tasks?', verdict: 'contested', is_load_bearing: true }),
    evidence: [ev('e5', 'c3', 'supports', 'Meta Research', 'https://ai.meta.com/p'), ev('e6', 'c3', 'refutes', 'Benchmark study', 'https://arxiv.org/q')],
  },
  {
    label: 'Only you (unverifiable -> locked)',
    claim: claim({ id: 'c4', text: 'Is your data clean enough to train on?', verdict: 'unverifiable', is_load_bearing: true, rationale: 'Internal data quality - no external source can settle this.' }),
    evidence: [],
  },
  {
    label: 'Checking + very long claim text (wrap)',
    claim: claim({ id: 'c5', text: 'Will the regulatory environment around model provenance and data residency shift enough in the next two quarters to change the build-vs-buy calculus materially?', verdict: 'pending' }),
    evidence: [],
  },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function PreviewPage() {
  const [open, setOpen] = useState<Record<string, boolean>>({ c1: true, c4: true });
  return (
    // reducedMotion 'always' so entrance animations settle instantly - the surfaces render at
    // their final state for a clean static screenshot (they still animate normally in the app).
    <MotionConfig reducedMotion="always">
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <h1 className="mb-1 text-lg font-semibold text-foreground">Surface fixtures</h1>
        <p className="mb-8 text-xs text-muted-foreground">Every state each component must hold. Screenshot + check for cram / clip / overflow.</p>

        <Section title="Track Record - DecisionCard">
          {TRACK_FIXTURES.map((f) => (
            <div key={f.row.decision_id}>
              <p className="mb-1 text-[10px] text-muted-foreground/70">{f.label}</p>
              <DecisionCard row={f.row} onRecord={noop} busy={false} />
            </div>
          ))}
        </Section>

        <Section title="Decision Map - ConsiderationStone">
          {STONE_FIXTURES.map((f) => (
            <div key={f.claim.id}>
              <p className="mb-1 text-[10px] text-muted-foreground/70">{f.label}</p>
              <ConsiderationStone
                claim={f.claim}
                evidence={f.evidence}
                expanded={!!open[f.claim.id]}
                onToggle={() => setOpen((o) => ({ ...o, [f.claim.id]: !o[f.claim.id] }))}
              />
            </div>
          ))}
        </Section>
      </div>
    </div>
    </MotionConfig>
  );
}
