/**
 * decisionParts - the pure, shared honesty + presentation helpers for the
 * decision result surfaces (DecisionResultView + DecisionAnatomy). Kept in a
 * non-component module so both can import them without tripping fast-refresh, and
 * so the holds/breaks + verdict grammar stays defined in exactly one place.
 */
import {
  ShieldCheck, AlertTriangle, HelpCircle, CircleDashed, Loader2,
} from 'lucide-react';
import { formatDistanceStrict } from 'date-fns';
import type { DecisionClaim, DecisionEvidence, Verdict } from '@/hooks/useDecisionEngine';

// Plain-English labels: assume a non-technical reader with no app context, so
// no jargon ("Holds" / "Contested" / "Unverified"). Each label is a phrase a
// first-time reader understands at a glance.
export const VERDICT_STYLE: Record<Verdict, { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  supported: { label: 'Checks out', cls: 'text-accent bg-accent/10 border-accent/30', Icon: ShieldCheck },
  contested: { label: "Doesn't add up", cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30', Icon: AlertTriangle },
  unverified: { label: 'Not confirmed', cls: 'text-muted-foreground bg-foreground/5 border-border', Icon: HelpCircle },
  unverifiable: { label: 'Your call', cls: 'text-muted-foreground bg-foreground/5 border-border', Icon: CircleDashed },
  pending: { label: 'Checking', cls: 'text-muted-foreground bg-secondary border-border', Icon: Loader2 },
};

// Plain English a first-time reader gets at a glance: a source either SUPPORTS the point,
// COUNTERS it, or is neutral CONTEXT. (Was "Agrees / Disagrees / Background".)
export const STANCE_STYLE: Record<DecisionEvidence['stance'], { label: string; cls: string }> = {
  supports: { label: 'Supports', cls: 'text-accent bg-accent/10 border-accent/30' },
  refutes: { label: 'Counters', cls: 'text-rose-300 bg-rose-500/10 border-rose-500/30' },
  neutral: { label: 'Context', cls: 'text-muted-foreground bg-foreground/5 border-border' },
};
export const STANCE_ORDER: Record<DecisionEvidence['stance'], number> = { supports: 0, neutral: 1, refutes: 2 };

// The three plain-English buckets the ladder filter groups claims into.
// Mirrors the verdict grammar: supported -> it checks out; unverifiable -> only
// you can decide; everything else (contested / not confirmed / still checking)
// -> worth a closer look.
export type VerdictBucket = 'checks' | 'unsure' | 'yours';
export function verdictBucket(v: Verdict): VerdictBucket {
  if (v === 'supported') return 'checks';
  if (v === 'unverifiable') return 'yours';
  return 'unsure';
}

// The honest "nothing settles this" copy, keyed on the claim type. A verifiable claim that
// came back with no evidence (now that the engine strictly AI-locks the evidence) gets the
// AI-world truth; an assumption/forecast is a judgment no source can settle.
export function emptyEvidenceMessage(type: DecisionClaim['type']): string {
  if (type === 'assumption' || type === 'forecast') {
    return 'No outside source settles this one. It is a judgment only you can make.';
  }
  return 'No AI-world evidence speaks to this one directly yet.';
}

// First-sentence distillation: holds / breaks bullets stay short, like the mock.
export function firstClause(text: string, max = 110): string {
  const trimmed = text.trim();
  const stop = trimmed.search(/[.;]/);
  const clause = stop > 20 ? trimmed.slice(0, stop) : trimmed;
  return clause.length > max ? `${clause.slice(0, max - 1).trimEnd()}...` : clause;
}

// Sanitise a raw source string for display. Evidence excerpts/titles come straight off scraped
// pages, so they arrive full of markdown (`## Bottom line`), HTML (`<strong>$0`), SEO title tails
// (`... | Future AGI`), and em dashes. This strips that noise so a row reads like clean prose
// instead of "crap looking text". Deterministic + pure, so the one-line badge and the fuller
// excerpt reveal share exactly one cleaner.
export function cleanEvidenceText(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = raw
    .replace(/<[^>]+>/g, ' ') // strip HTML tags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[\u2014\u2013]/g, '-') // em/en dash -> hyphen (house style, reads cleaner)
    .replace(/[#>*_`~]+/g, ' ') // markdown heading / quote / emphasis / code / strike markers
    .replace(/\s+/g, ' ')
    .trim();
  // Drop a trailing SEO site-name segment: "Real title | Site Name" -> "Real title".
  const piped = s.split(/\s+\|\s+/);
  if (piped.length > 1 && piped[0].trim().length >= 12) s = piped[0].trim();
  return s;
}

// The bare source domain for a provenance chip (e.g. "artificialanalysis.ai"). Empty on bad input.
export function sourceDomain(url: string | null | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// A compact publish age for the provenance chip ("2mo", "5d", "3h"). Empty when the date is
// missing/unparseable. `base` is injectable so the unit test is deterministic.
export function shortAge(publishedAt: string | null | undefined, base: Date = new Date()): string {
  if (!publishedAt) return '';
  const ts = Date.parse(publishedAt);
  if (!Number.isFinite(ts)) return '';
  return formatDistanceStrict(new Date(ts), base)
    .replace(/ years?/, 'y')
    .replace(/ months?/, 'mo')
    .replace(/ weeks?/, 'w')
    .replace(/ days?/, 'd')
    .replace(/ hours?/, 'h')
    .replace(/ minutes?/, 'm')
    .replace(/ seconds?/, 's');
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
