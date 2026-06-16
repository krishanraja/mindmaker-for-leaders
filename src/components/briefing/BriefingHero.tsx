import { motion } from 'framer-motion';
import {
  GitFork,
  Play,
  Loader2,
  ChevronRight,
  Radio,
  Lightbulb,
  Activity,
  User,
  Database,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FrameworkTag } from '@/types/briefing';
import type {
  BriefingRead,
  ConsiderationState,
  ReadConsideration,
} from './briefingRead';

/**
 * The numerical-first briefing hero (mock: briefing-num.html).
 *
 * Reads top-down as one calm step: the BET it answers, then the magnitude
 * HERO (a kind-marked est. number ONLY where one is honestly present; else
 * the words read leads), then a VISUAL mini-spine of the few considerations
 * it rests on, then the single primary affordance, then the one-tap-down
 * "go deeper" door.
 *
 * Purely presentational - the page supplies the derived read and wires the
 * play / generate flow. Honesty governor: a modelled number always carries
 * its `est.` mark; the spine never lights an only-you consideration emerald.
 */

const STATE_CHIP: Record<BriefingRead['betState'], { label: string; cls: string }> = {
  countered: { label: 'Countered', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  explore: { label: 'Explore', cls: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
  quiet: { label: 'Quiet', cls: 'border-border bg-secondary/40 text-muted-foreground' },
};

// A small icon per consideration so the spine is read VISUALLY, not as text.
const TAG_ICON: Record<FrameworkTag, LucideIcon> = {
  signal: Activity,
  decision_trigger: GitFork,
  decision_alert: Activity,
  krishs_take: Lightbulb,
  noise: Radio,
};

// State governs the consideration tile's material (never the words).
const CONS_STATE: Record<
  ConsiderationState,
  { tile: string; ink: string; dot: string }
> = {
  // moved = the load-bearing thing that shifted: emerald, lit
  moved: {
    tile: 'border-accent/40 bg-accent/[0.07]',
    ink: 'text-accent',
    dot: 'bg-accent shadow-[0_0_7px] shadow-accent',
  },
  // only-you = rests on the leader's own input: neutral, never emerald
  you: {
    tile: 'border-border bg-card',
    ink: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
  // thin / quiet: dim
  thin: {
    tile: 'border-border bg-card opacity-70',
    ink: 'text-muted-foreground',
    dot: 'bg-muted-foreground/40',
  },
  quiet: {
    tile: 'border-border bg-card opacity-70',
    ink: 'text-muted-foreground',
    dot: 'bg-muted-foreground/40',
  },
};

function ConsiderationTile({ c }: { c: ReadConsideration }) {
  const s = CONS_STATE[c.state];
  const Icon = c.state === 'you' ? User : c.state === 'thin' ? Database : TAG_ICON[c.tag] ?? Activity;
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-[10px] border px-1 py-2',
        s.tile,
      )}
    >
      <Icon className={cn('h-4 w-4', s.ink)} aria-hidden />
      <span className={cn('w-full truncate text-center text-[8.5px] font-semibold', s.ink)}>
        {c.label}
      </span>
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
    </div>
  );
}

export interface BriefingHeroProps {
  read: BriefingRead;
  // the play / generate affordance state
  ctaLabel: string;
  ctaBusy?: boolean;
  ctaDisabled?: boolean;
  onCta: () => void;
  // the one-tap-down full read
  onGoDeeper?: () => void;
  deeperHint?: string;
  animated?: boolean;
}

export function BriefingHero({
  read,
  ctaLabel,
  ctaBusy = false,
  ctaDisabled = false,
  onCta,
  onGoDeeper,
  deeperHint,
  animated = true,
}: BriefingHeroProps) {
  const chip = STATE_CHIP[read.betState];
  const isCountered = read.betState === 'countered';
  const considerations = read.considerations;

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* THE BET - small, gets out of the way; carries the honest signal state */}
      {read.bet && (
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              'mt-px flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] border border-border bg-secondary/40',
              isCountered ? 'text-amber-300' : 'text-muted-foreground',
            )}
            aria-hidden
          >
            <GitFork className="h-3.5 w-3.5 rotate-90" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground text-balance">
            {read.bet}
          </span>
          <span
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-[9px] font-bold uppercase tracking-wider',
              chip.cls,
            )}
          >
            {chip.label}
          </span>
        </div>
      )}

      {/* THE NUMBER (or the words read). A magnitude leads only when one is
          honestly present; the glow is warm when countered, calm otherwise. */}
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border px-4 pb-4 pt-5 text-center',
          isCountered
            ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/[0.08] to-transparent'
            : 'border-accent/25 bg-gradient-to-b from-accent/[0.07] to-transparent',
        )}
      >
        {/* soft-number mark: a modelled read of the move, never a measured fact */}
        {read.magnitude && (
          <span
            className="absolute right-3 top-3 inline-flex items-center whitespace-nowrap rounded border border-border px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground"
            title="A modelled read of the move, not a measured quote"
          >
            {read.magnitude.kind}
          </span>
        )}

        <div
          className={cn(
            'mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em]',
            isCountered ? 'text-amber-300/90' : 'text-accent/80',
          )}
        >
          What just moved
        </div>

        {read.magnitude ? (
          <div
            className="num mx-auto"
            style={isCountered ? { color: '#fff', textShadow: '0 0 30px rgba(240,161,60,0.53)' } : undefined}
          >
            {read.magnitude.value}
          </div>
        ) : (
          // no honest number -> WORDS lead (clearest-unit-first)
          <h2 className="num phrase mx-auto max-w-[18rem] text-foreground" style={{ textShadow: 'none' }}>
            {read.headline}
          </h2>
        )}

        {/* the supporting line: under a number it carries the words; under a
            words-hero it carries the "why it matters" reason (optional). */}
        {(read.magnitude ? read.headline : read.sub) && (
          <p className="mx-auto mt-2 max-w-[20rem] text-[15px] font-semibold text-foreground/90 text-balance">
            {read.magnitude ? read.headline : read.sub}
          </p>
        )}

        {/* a calm trend spark (decorative, governed by state) */}
        <svg
          className="mt-3 block h-12 w-full"
          viewBox="0 0 300 48"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden
        >
          <path d="M12,12 C90,13 200,15 286,16" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/40" />
          <path
            d="M12,18 C90,23 200,30 286,38"
            strokeWidth="2.6"
            className={isCountered ? 'text-amber-400' : 'text-accent'}
            stroke="currentColor"
          />
          <circle cx="286" cy="38" r="3.4" fill="currentColor" className={isCountered ? 'text-amber-400' : 'text-accent'} />
          <circle cx="286" cy="38" r="6.5" fill="currentColor" className={isCountered ? 'text-amber-400/20' : 'text-accent/20'} />
        </svg>
      </div>

      {/* RESTS ON - the spine in miniature, VISUAL not a wall of text */}
      {considerations.length > 0 && (
        <div>
          <div className="mb-2 flex items-baseline px-0.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              Rests on {considerations.length}
            </span>
            <span className="ml-auto text-[11.5px] text-muted-foreground">
              {read.movedCount > 0 && <>{read.movedCount} moved</>}
              {read.movedCount > 0 && read.youCount > 0 && <> &middot; </>}
              {read.youCount > 0 && <>{read.youCount} only you</>}
            </span>
          </div>
          <div className="flex gap-1.5">
            {considerations.map((c, i) => (
              <ConsiderationTile key={`${c.label}-${i}`} c={c} />
            ))}
          </div>
        </div>
      )}

      {/* PRIMARY ACTION - the play / generate affordance */}
      <button
        type="button"
        onClick={onCta}
        disabled={ctaDisabled || ctaBusy}
        className={cn(
          'relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/20 transition-colors hover:bg-accent/90 disabled:opacity-70',
        )}
      >
        {ctaBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Play className="h-4 w-4 fill-current" aria-hidden />
        )}
        {ctaLabel}
      </button>

      {/* GO DEEPER - the full read, one tap down */}
      {onGoDeeper && (
        <button
          type="button"
          onClick={onGoDeeper}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left transition-colors hover:bg-secondary/40"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Go deeper</span>
            <span className="block truncate text-[11.5px] text-muted-foreground">
              {deeperHint ?? `the evidence, the counter-case, ${read.sourceCount || read.segmentCount} sources`}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      )}
    </motion.div>
  );
}
