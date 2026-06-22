/**
 * decisionParts - the pure, shared honesty + presentation helpers for the
 * decision result surfaces (DecisionResultView + DecisionAnatomy). Kept in a
 * non-component module so both can import them without tripping fast-refresh, and
 * so the holds/breaks + verdict grammar stays defined in exactly one place.
 */
import {
  ShieldCheck, AlertTriangle, HelpCircle, CircleDashed, Loader2,
} from 'lucide-react';
import type { DecisionClaim, DecisionEvidence, Verdict } from '@/hooks/useDecisionEngine';

export const VERDICT_STYLE: Record<Verdict, { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  supported: { label: 'Holds up', cls: 'text-accent bg-accent/10 border-accent/30', Icon: ShieldCheck },
  contested: { label: 'Contested', cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30', Icon: AlertTriangle },
  unverified: { label: 'Unverified', cls: 'text-muted-foreground bg-foreground/5 border-border', Icon: HelpCircle },
  unverifiable: { label: 'Your call', cls: 'text-muted-foreground bg-foreground/5 border-border', Icon: CircleDashed },
  pending: { label: 'Checking', cls: 'text-muted-foreground bg-secondary border-border', Icon: Loader2 },
};

export const STANCE_STYLE: Record<DecisionEvidence['stance'], { label: string; cls: string }> = {
  supports: { label: 'Backs it', cls: 'text-accent bg-accent/10 border-accent/30' },
  refutes: { label: 'Pushes back', cls: 'text-rose-300 bg-rose-500/10 border-rose-500/30' },
  neutral: { label: 'Context', cls: 'text-muted-foreground bg-foreground/5 border-border' },
};
export const STANCE_ORDER: Record<DecisionEvidence['stance'], number> = { supports: 0, neutral: 1, refutes: 2 };

// First-sentence distillation: holds / breaks bullets stay short, like the mock.
export function firstClause(text: string, max = 110): string {
  const trimmed = text.trim();
  const stop = trimmed.search(/[.;]/);
  const clause = stop > 20 ? trimmed.slice(0, stop) : trimmed;
  return clause.length > max ? `${clause.slice(0, max - 1).trimEnd()}...` : clause;
}

export function deriveTruth(claims: DecisionClaim[], breakpointId: string | null, counterCase: string | null) {
  const byBearing = (a: DecisionClaim, b: DecisionClaim) => Number(b.is_load_bearing) - Number(a.is_load_bearing);
  const holds = claims
    .filter((c) => c.verdict === 'supported')
    .sort(byBearing)
    .slice(0, 2)
    .map((c) => firstClause(c.text));
  const breakCandidates = claims
    .filter((c) => c.verdict === 'contested' || c.verdict === 'unverified' || c.verdict === 'unverifiable')
    .sort((a, b) => Number(a.id === breakpointId ? 0 : 1) - Number(b.id === breakpointId ? 0 : 1) || byBearing(a, b));
  const breaks = breakCandidates.slice(0, 2).map((c) => firstClause(c.text));
  // If every claim came back clean, the honest "where it breaks" is the counter-case.
  if (breaks.length === 0 && counterCase) breaks.push(firstClause(counterCase, 140));
  return { holds, breaks };
}
