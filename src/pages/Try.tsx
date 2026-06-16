import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, GitFork } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConsiderationStone } from '@/components/decision-map/ConsiderationStone';
import type { DecisionClaim, DecisionEvidence } from '@/hooks/useDecisionEngine';

// A canned but real-shaped pressure-test, so a visitor sees the magic before signing
// up: a bet decomposed into considerations, each with a verdict - including the
// cardinal honesty move (an "only you" question that no web verdict can answer).
const STATEMENT = 'Should we switch our primary AI vendor to cut inference costs?';

function claim(p: Partial<DecisionClaim> & { id: string; text: string; verdict: DecisionClaim['verdict'] }): DecisionClaim {
  return { type: 'market', is_load_bearing: false, confidence: 0.6, rationale: null, ...p };
}
const ev = (id: string, claimId: string, stance: DecisionEvidence['stance'], title: string, url: string | null): DecisionEvidence => ({
  id, claim_id: claimId, source_url: url, source_title: title, excerpt: null, stance, retriever: 'perplexity', retrieved_at: null, relevance_score: 0.8,
});

const CLAIMS: { claim: DecisionClaim; evidence: DecisionEvidence[] }[] = [
  {
    claim: claim({ id: 'c1', text: 'The alternative vendor is meaningfully cheaper at our volume', verdict: 'supported', is_load_bearing: true, rationale: 'Multiple independent sources put the alternative 30-40% below current per-token pricing at this tier.' }),
    evidence: [ev('e1', 'c1', 'supports', 'Reuters: frontier token prices', 'https://reuters.com/a'), ev('e2', 'c1', 'supports', 'The Information', 'https://theinformation.com/b')],
  },
  {
    claim: claim({ id: 'c2', text: 'Output quality holds for our actual tasks', verdict: 'contested', is_load_bearing: true, rationale: 'Benchmarks split; parity is task-dependent.' }),
    evidence: [ev('e3', 'c2', 'supports', 'Vendor benchmark', 'https://ai.example.com/p'), ev('e4', 'c2', 'refutes', 'Independent eval', 'https://arxiv.org/q')],
  },
  {
    claim: claim({ id: 'c3', text: 'Switching costs stay low once we are migrated', verdict: 'unverified', rationale: 'Only one weak source addressed lock-in.' }),
    evidence: [ev('e5', 'c3', 'supports', 'someblog.dev', 'https://someblog.dev/x')],
  },
  {
    claim: claim({ id: 'c4', text: 'Our team can absorb the migration in this quarter', verdict: 'unverifiable', is_load_bearing: true, rationale: 'Internal capacity - no external source can settle this.' }),
    evidence: [],
  },
];

export default function TryPage() {
  const navigate = useNavigate();
  const [shown, setShown] = useState(0);
  const [open, setOpen] = useState<string | null>('c1');

  // Reveal the considerations one at a time, like the engine resolving them.
  useEffect(() => {
    if (shown >= CLAIMS.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 600 : 900);
    return () => clearTimeout(t);
  }, [shown]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-xl px-5 py-14 sm:py-20">
        <div className="text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Live demo</span>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">Watch CTRL pressure-test a decision.</h1>
          <p className="mx-auto mt-3 max-w-md text-balance text-muted-foreground">
            It decomposes the bet, checks each consideration against the evidence, and tells you where only you can decide. No spin.
          </p>
        </div>

        {/* The bet */}
        <div className="mt-10 flex items-start gap-3 rounded-xl border border-border bg-card/60 p-4">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground"><GitFork className="h-4 w-4 rotate-90" /></span>
          <p className="text-sm font-medium leading-snug text-foreground">{STATEMENT}</p>
        </div>

        <p className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {shown < CLAIMS.length ? 'Decomposing…' : `Rests on ${CLAIMS.length} considerations`}
        </p>
        <div className="space-y-2">
          {CLAIMS.slice(0, shown).map((c) => (
            <ConsiderationStone
              key={c.claim.id}
              claim={c.claim}
              evidence={c.evidence}
              expanded={open === c.claim.id}
              onToggle={() => setOpen(open === c.claim.id ? null : c.claim.id)}
            />
          ))}
        </div>

        {/* CTA appears once the demo resolves */}
        {shown >= CLAIMS.length && (
          <div className="mt-10 rounded-2xl border border-accent/20 bg-gradient-to-b from-accent/[0.07] to-transparent p-7 text-center">
            <h2 className="text-xl font-bold tracking-tight">Now pressure-test yours.</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              CTRL clarifies; it never recommends from a thin signal. The call stays yours - now with the evidence laid bare.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => navigate('/auth')}>Start free <ArrowRight className="ml-1 h-4 w-4" /></Button>
              <Button variant="secondary" onClick={() => navigate('/agents')}>For your agents</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
