/**
 * EvidenceList - the shared "what this is based on" evidence renderer for BOTH decision surfaces
 * (DecisionAnatomy's ladder rows + DecisionResultView's ClaimSheet), so the one-line, grouped,
 * scored, interrogate-on-tap behaviour is defined in exactly one place.
 *
 * The old surfaces dumped each source as a full block paragraph of raw article text. This shows
 * each source as ONE line - the backend `key_point` (falling back to a first clause of the
 * excerpt for old rows) - grouped into plain-English "Evidence that supports" / "Evidence that
 * counters" / "Context" sections, each row carrying a single 0-100 trust ring (freshness +
 * reliability + corroboration, computed server-side). Tap a row to INTERROGATE it: the fuller
 * excerpt, the score breakdown (reliability tier + freshness), and the link OUT to the source
 * unfold in place. Nothing is hidden, just folded - the sequence the leader actually wants:
 * claim -> one-line evidence -> interrogate one -> out to source.
 *
 * Honest by construction: the ring only shows when the backend actually scored the row; an old
 * row with no score simply has no ring (more honest than a half-score).
 */

import { useState, type ReactNode } from 'react';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import type { DecisionEvidence } from '@/hooks/useDecisionEngine';
import { cleanEvidenceText, firstClause, shortAge, sourceDomain } from './decisionParts';
import { groupEvidence } from './evidenceGrouping';

const TIER_LABEL: Record<string, string> = {
  primary: 'Primary source',
  reputable: 'Reputable source',
  community: 'Community source',
  unverified: 'Unverified source',
};

// The three plain-English groups, in reveal order: what backs the point, what pushes against it,
// then neutral context.
const GROUPS: { key: DecisionEvidence['stance']; header: string; dot: string }[] = [
  { key: 'supports', header: 'Evidence that supports', dot: 'bg-accent shadow-[0_0_6px_hsl(var(--accent)/0.6)]' },
  { key: 'refutes', header: 'Evidence that counters', dot: 'bg-rose-400/90 shadow-[0_0_6px_rgba(244,114,114,0.5)]' },
  { key: 'neutral', header: 'Context', dot: 'bg-muted-foreground/50' },
];

function scoreBand(score: number) {
  if (score >= 70) return { ring: 'hsl(var(--accent))', text: 'text-accent', glow: 'hsl(var(--accent)/0.5)' };
  if (score >= 45) return { ring: 'rgb(224 161 58)', text: 'text-amber-300', glow: 'rgba(224,161,58,0.5)' };
  return { ring: 'hsl(var(--muted-foreground))', text: 'text-muted-foreground', glow: 'transparent' };
}

/** A compact 0-100 trust ring, same idiom as the decision TrustGauge at micro size. */
export function ScoreRing({ score, size = 30 }: { score: number; size?: number }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const off = c * (1 - clamped / 100);
  const band = scoreBand(clamped);
  return (
    <span
      className="relative grid flex-none place-items-center"
      style={{ width: size, height: size }}
      title={`Trust score ${clamped} of 100`}
      aria-label={`Trust score ${clamped} of 100`}
    >
      <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--foreground)/0.08)" strokeWidth={3} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={band.ring} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ filter: `drop-shadow(0 0 4px ${band.glow})` }}
        />
      </svg>
      <b className={cn('text-[9.5px] font-bold tabular-nums', band.text)}>{clamped}</b>
    </span>
  );
}

function evidenceLine(e: DecisionEvidence): string {
  // Prefer the distilled key_point (already a clean one-liner); still run it through the cleaner
  // so a stray marker never leaks. Fall back to a sanitised first-clause of the raw excerpt, then
  // the title - never the raw scraped text.
  const kp = cleanEvidenceText(e.key_point);
  if (kp) return kp;
  const ex = cleanEvidenceText(e.excerpt);
  if (ex) return firstClause(ex, 140);
  return cleanEvidenceText(e.source_title) || e.source_url || 'Source';
}

// The tiny provenance line under the badge: "domain · age". Either part may be empty.
function provenance(e: DecisionEvidence): string {
  return [sourceDomain(e.source_url), shortAge(e.published_at)].filter(Boolean).join(' · ');
}

function freshnessLabel(publishedAt?: string | null): string {
  if (!publishedAt) return 'Publish date unknown';
  const ts = Date.parse(publishedAt);
  if (!Number.isFinite(ts)) return 'Publish date unknown';
  return `Published ${formatDistanceToNow(new Date(ts), { addSuffix: true })}`;
}

function EvidenceRow({ e }: { e: DecisionEvidence }) {
  const [open, setOpen] = useState(false);
  const line = evidenceLine(e);
  const meta = provenance(e);
  const fullExcerpt = cleanEvidenceText(e.excerpt);
  const score = typeof e.evidence_score === 'number' ? e.evidence_score : null;
  const tierLabel = e.reliability_tier ? TIER_LABEL[e.reliability_tier] ?? null : null;

  return (
    <li className="rounded-xl border border-border bg-foreground/[0.02]">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); haptics.light(); }}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left"
      >
        {/* One clean line (truncated) + a tiny provenance subline: an at-a-glance badge, not a
            wall of scraped text. The full excerpt is one tap away below. */}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-medium leading-snug text-foreground/90">{line}</span>
          {meta && <span className="mt-0.5 block truncate text-[10px] leading-tight text-muted-foreground/80">{meta}</span>}
        </span>
        {score != null && <ScoreRing score={score} />}
        <ChevronRight className={cn('h-3.5 w-3.5 flex-none text-muted-foreground transition-transform', open && 'rotate-90 text-accent')} />
      </button>

      {/* Interrogate: the fuller context, the trust breakdown, and the way out to the source. */}
      <div className={cn('grid transition-all duration-300 ease-out', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-2 border-t border-border px-2.5 py-2.5">
            {fullExcerpt && (
              <p className="text-[11.5px] leading-relaxed text-muted-foreground text-pretty">{fullExcerpt}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted-foreground">
              {tierLabel && <span className="font-semibold text-foreground/80">{tierLabel}</span>}
              {tierLabel && <span aria-hidden className="text-muted-foreground/40">&middot;</span>}
              <span>{freshnessLabel(e.published_at)}</span>
              <span aria-hidden className="text-muted-foreground/40">&middot;</span>
              <span>{e.retriever}</span>
            </div>
            {e.source_url && (
              <a
                href={e.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent hover:underline"
              >
                View source<ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

/** One collapsible category inside a stance section: a labelled header + count, body folds open. */
function CategoryBlock({ label, count, defaultOpen, children }: { label: string; count: number; defaultOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border/70 bg-foreground/[0.015]">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); haptics.light(); }}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
      >
        <ChevronRight className={cn('h-3.5 w-3.5 flex-none text-muted-foreground transition-transform', open && 'rotate-90 text-accent')} />
        <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-foreground/85">{label}</span>
        <span className="flex-none rounded-full bg-foreground/[0.06] px-1.5 py-0.5 text-[9.5px] font-bold tabular-nums text-muted-foreground">{count}</span>
      </button>
      <div className={cn('grid transition-all duration-300 ease-out', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
        <div className="min-h-0 overflow-hidden">
          <ul className="space-y-1.5 px-1.5 pb-2">{children}</ul>
        </div>
      </div>
    </div>
  );
}

export function EvidenceList({ evidence, emptyMessage }: { evidence: DecisionEvidence[]; emptyMessage: string }) {
  if (evidence.length === 0) {
    return <p className="text-[11.5px] leading-relaxed text-muted-foreground">{emptyMessage}</p>;
  }
  const hasSupports = evidence.some((e) => e.stance === 'supports');
  const hasRefutes = evidence.some((e) => e.stance === 'refutes');
  return (
    <div className="space-y-3">
      {GROUPS.map((g) => {
        const rows = evidence
          .filter((e) => e.stance === g.key)
          .sort((a, b) => (b.evidence_score ?? 0) - (a.evidence_score ?? 0));
        if (rows.length === 0) return null;
        // Nest a long section into collapsible categories (adjudicator theme, else client cluster);
        // a short/non-consolidating section returns one unlabelled group and renders flat as before.
        const groups = groupEvidence(rows);
        const nested = groups.length > 1;
        return (
          <div key={g.key}>
            <p className="mb-1.5 flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-wide text-muted-foreground">
              <span className={cn('h-[5px] w-[5px] rounded-full', g.dot)} aria-hidden />
              {g.header}
            </p>
            {nested ? (
              <div className="space-y-1.5">
                {groups.map((grp, gi) => (
                  <CategoryBlock key={`${g.key}:${grp.label}`} label={grp.label} count={grp.rows.length} defaultOpen={gi === 0}>
                    {grp.rows.map((e) => <EvidenceRow key={e.id} e={e} />)}
                  </CategoryBlock>
                ))}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {rows.map((e) => <EvidenceRow key={e.id} e={e} />)}
              </ul>
            )}
          </div>
        );
      })}

      {/* Honest counter-balance: when a point has backing but nothing against it yet, say so - the
          engine fires a counter-evidence pass at completion, so this fills in rather than staying blank. */}
      {hasSupports && !hasRefutes && (
        <p className="flex items-center gap-1.5 text-[10.5px] leading-snug text-muted-foreground/80">
          <span className="h-[5px] w-[5px] flex-none rounded-full bg-rose-400/70" aria-hidden />
          No counter-evidence has surfaced yet. I keep looking for the case against in the background.
        </p>
      )}
    </div>
  );
}
