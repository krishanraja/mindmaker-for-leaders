/* eslint-disable react-refresh/only-export-components -- co-locates the stone with its verdict/source helpers */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Database, Diamond, GitFork, Layers, Lock, Scale, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DecisionClaim, DecisionEvidence, Verdict } from '@/hooks/useDecisionEngine';

// The evidence vocabulary (the locked numerical-first set), mapped from the engine verdict.
export const STONE: Record<Verdict, { label: string; ring: string; text: string }> = {
  supported: { label: 'Holds', ring: 'border-emerald-500/30 bg-emerald-500/[0.06]', text: 'text-emerald-300' },
  contested: { label: 'Contested', ring: 'border-amber-500/30 bg-amber-500/[0.06]', text: 'text-amber-300' },
  unverified: { label: 'Thin', ring: 'border-border bg-foreground/[0.03]', text: 'text-muted-foreground' },
  unverifiable: { label: 'Only you', ring: 'border-border bg-foreground/[0.03]', text: 'text-muted-foreground' },
  pending: { label: 'Checking', ring: 'border-border bg-secondary/40', text: 'text-muted-foreground' },
};

// The full spine treatment per verdict, lifted from the mock's material classes
// (mat-holds / mat-thin / mat-contested / mat-locked / mat-checking). State is read
// from the material, never from the words - the cardinal honesty rule as physics.
export interface SpineTreatment {
  label: string; // the verdict word shown under the consideration
  /** stone shell (border + fill + glow) */
  shell: string;
  /** the leading disc */
  disc: string;
  /** the verdict label colour + the consideration ink */
  text: string;
}

export const SPINE: Record<Verdict, SpineTreatment> = {
  // Holds: emerald material, lit disc, brighter consideration ink.
  supported: {
    label: 'Holds',
    shell: 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.10] to-emerald-500/[0.02] shadow-[inset_0_0_26px_-6px_rgba(0,217,182,0.33)]',
    disc: 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-300',
    text: 'text-emerald-300',
  },
  // Contested: amber material, no glow.
  contested: {
    label: 'Contested',
    shell: 'border-amber-500/40 bg-gradient-to-br from-amber-500/[0.10] to-transparent',
    disc: 'border-amber-500/30 bg-amber-500/[0.06] text-amber-300',
    text: 'text-amber-300',
  },
  // Thin: faded neutral, slightly dimmed (the honest "not enough yet" state).
  unverified: {
    label: 'Thin',
    shell: 'border-border bg-gradient-to-br from-foreground/[0.03] to-transparent opacity-[0.86]',
    disc: 'border-border text-muted-foreground',
    text: 'text-muted-foreground',
  },
  // Only you: locked neutral, never emerald - a self-report can't launder into Holds.
  unverifiable: {
    label: 'Only you',
    shell: 'border-border bg-gradient-to-br from-foreground/[0.02] to-transparent',
    disc: 'border-border text-muted-foreground',
    text: 'text-muted-foreground',
  },
  // Checking: neutral in-flight material.
  pending: {
    label: 'Checking',
    shell: 'border-border bg-secondary/30',
    disc: 'border-border text-muted-foreground',
    text: 'text-muted-foreground',
  },
};

export function spineOf(claim: DecisionClaim): SpineTreatment {
  return SPINE[claim.verdict] ?? SPINE.pending;
}

// Source reliability: an "unverifiable" consideration cannot be answered by external evidence -
// only the leader can. The cardinal honesty rule, surfaced.
export function isOnlyYou(c: DecisionClaim): boolean {
  return c.verdict === 'unverifiable';
}

export function domainOf(url: string | null): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// A leading glyph per claim type so the spine reads at a glance (mirrors the mock's
// per-stone icons: cost = overlapping discs, data = cylinder, capability = person+plus,
// edge = gem, switch = arrows). Falls back to the open-fork for anything unknown.
export function claimGlyph(claim: DecisionClaim) {
  switch (claim.type) {
    case 'market':
      return Scale; // cost / market read
    case 'factual':
      return Database; // a checkable fact (data, numbers)
    case 'causal':
      return Layers; // a chain of consequence
    case 'forecast':
      return Diamond; // a bet on the future = an edge
    case 'assumption':
      return Users; // a judgement only you can make
    default:
      return GitFork;
  }
}

// ---------------------------------------------------------------------------
// HONEST MAGNITUDE EXTRACTION
// The engine produces a synthesised rationale, not a structured figure. When that
// rationale contains a clean, short measurable quantity (a multiplier, a percent,
// a money figure - <=6 chars), it can lead the read as the hero NUMBER. Because it
// is read out of a modelled synthesis (never a measured quote), it is always marked
// `est.` so an estimate can NEVER read as a measured fact. If no clean number is
// present, the read leads with WORDS - we never fabricate a figure.
// ---------------------------------------------------------------------------
export interface Magnitude {
  value: string; // the short hero token, e.g. "10x" "40%" "$2M"
  kind: 'est.' | 'modelled'; // soft-number tag (this is never a measured fact)
}

const MAGNITUDE_RE = /(~?\$\d[\d.,]*[kmb]?|~?\d[\d.,]*\s?x|~?[-+]?\d[\d.,]*\s?%|~?\d[\d.,]*x)/i;

export function magnitudeFrom(claim: DecisionClaim): Magnitude | null {
  // Only-you claims have no honest external number, full stop.
  if (isOnlyYou(claim)) return null;
  // A still-checking or thin claim has not earned a confident hero number.
  if (claim.verdict === 'pending') return null;
  const hay = claim.rationale ?? '';
  const m = hay.match(MAGNITUDE_RE);
  if (!m) return null;
  let token = m[0].replace(/\s+/g, '');
  // Guard the content contract: a hero token is short. Anything longer is not a
  // clean magnitude and should fall back to a words-led read.
  if (token.length > 6) return null;
  // Normalise an "x"-multiplier to a tidy form ("10x" not "10X").
  token = token.replace(/X$/, 'x');
  return { value: token, kind: 'est.' };
}

const STANCE_DOT: Record<DecisionEvidence['stance'], string> = {
  supports: 'bg-emerald-400',
  refutes: 'bg-rose-400',
  neutral: 'bg-muted-foreground',
};

/**
 * A spine row (the decision map's one scroll band). A short plain-English
 * consideration, its verdict read from the material, the source shown by a lit cap
 * (external) or a lock seam (only you). The exported prop signature is preserved
 * (claim, evidence, expanded, onToggle, animated) so /preview keeps rendering; new
 * behaviour rides the existing onToggle.
 */
export function ConsiderationStone({
  claim,
  evidence,
  expanded,
  onToggle,
  animated = true,
}: {
  claim: DecisionClaim;
  evidence: DecisionEvidence[];
  expanded: boolean;
  onToggle: () => void;
  animated?: boolean; // false renders at final state (QC harness / static capture)
}) {
  const onlyYou = isOnlyYou(claim);
  const spine = spineOf(claim);
  const Glyph = claimGlyph(claim);
  // Independent corroboration = distinct supporting domains (mirrors the verify governor).
  const independent = useMemo(() => {
    const d = new Set<string>();
    for (const e of evidence) {
      if (e.stance !== 'supports' || !e.source_url) continue;
      const dom = domainOf(e.source_url);
      if (dom) d.add(dom);
    }
    return d.size;
  }, [evidence]);

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 4 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn('relative overflow-hidden rounded-2xl border', spine.shell)}
    >
      <button type="button" onClick={onToggle} className="w-full p-3.5 text-left">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border',
              spine.disc,
            )}
            aria-hidden
          >
            <Glyph className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1 self-center text-[13px] font-medium leading-snug text-foreground">
            {claim.text}
          </span>
          {/* SOURCE: external = a lit emerald cap; only you = a lock seam. Read from the
              source, never the verdict, so an only-you stone can never light up. */}
          {onlyYou ? (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-lg border border-border bg-secondary/40 text-muted-foreground"
              aria-label="Only you can answer"
            >
              <Lock className="h-[15px] w-[15px]" />
            </span>
          ) : independent > 0 ? (
            <span
              className={cn(
                'flex h-[26px] w-[26px] shrink-0 items-center justify-center self-center rounded-full border text-[10px] font-bold',
                claim.verdict === 'supported'
                  ? 'border-emerald-500/40 bg-emerald-500/[0.10] text-emerald-300 shadow-[0_0_14px_-3px_#00d9b6]'
                  : 'border-border bg-secondary/40 text-muted-foreground',
              )}
              aria-label={`${independent} independent ${independent === 1 ? 'source' : 'sources'}`}
            >
              {independent}
            </span>
          ) : (
            <ChevronRight className={cn('h-4 w-4 shrink-0 self-center text-muted-foreground transition-transform', expanded && 'rotate-90')} />
          )}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-12 text-[11px]">
          <span className={cn('font-semibold', spine.text)}>{spine.label}</span>
          {claim.is_load_bearing && <span className="text-muted-foreground">&middot; carries this</span>}
          {claim.verdict === 'pending' && <span className="text-muted-foreground">&middot; checking</span>}
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 px-3.5 pb-3.5 pl-[3.75rem]">
          {claim.rationale && <p className="text-xs leading-relaxed text-muted-foreground">{claim.rationale}</p>}
          {onlyYou ? (
            <p className="text-xs text-muted-foreground">No external evidence can settle this - it is yours to judge.</p>
          ) : evidence.length > 0 ? (
            <div className="space-y-1.5">
              {evidence.map((e) => (
                <a
                  key={e.id}
                  href={e.source_url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STANCE_DOT[e.stance] ?? 'bg-muted-foreground')} />
                  <span className="min-w-0 flex-1 truncate">{e.source_title || domainOf(e.source_url) || 'source'}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No sources retrieved yet.</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
