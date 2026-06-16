import { motion } from 'framer-motion';
import { GitFork, ArrowRight, Radio, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BetState, CockpitBet, CockpitBlocker, CockpitData, CockpitHero } from '@/types/cockpit';
import { HeroSparkline, type HeroSeries, type HeroVizTone } from './HeroSparkline';

// ---- signal-state chip (the bet board's rounded pill; matches .c-sigchip) ----------------
const STATE_CHIP: Record<BetState, { label: string; cls: string }> = {
  // countered = a warm warning pill (the bet got pushed back on)
  countered: { label: 'Countered', cls: 'border-amber-500/30 bg-amber-500/15 text-amber-400' },
  // explore = a cool blue pill (new ground opened up)
  explore: { label: 'Explore', cls: 'border-sky-500/30 bg-sky-500/15 text-sky-400' },
  // quiet = a neutral pill (no fresh signal) - never a green "validated" tick we cannot honestly assert
  quiet: { label: 'Quiet', cls: 'border-border bg-secondary/60 text-muted-foreground' },
};

function StateChip({ state }: { state: BetState }) {
  const s = STATE_CHIP[state];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-3 py-[3px] text-[9px] font-bold uppercase leading-[1.15] tracking-[0.06em]',
        s.cls,
      )}
    >
      {s.label}
    </span>
  );
}

// the small fork glyph that marks an open bet (matches the mock's .fk node-of-three motif via lucide)
function ForkIcon({ countered }: { countered: boolean }) {
  return (
    <span
      className={cn(
        'mt-px flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] border bg-[#13161c]',
        countered ? 'border-amber-500/40 text-amber-300' : 'border-border text-muted-foreground',
      )}
      aria-hidden
    >
      <GitFork className="h-[15px] w-[15px] rotate-180" />
    </span>
  );
}

// ---- the bets board row (2-row card: question full-width on top; chip + freshness below) ---
function BetRow({ bet, onOpen }: { bet: CockpitBet; onOpen: (id: string) => void }) {
  const countered = bet.state === 'countered';
  return (
    <button
      type="button"
      onClick={() => onOpen(bet.id)}
      className={cn(
        'flex w-full flex-col gap-[9px] rounded-[13px] border bg-card p-[12px_13px] text-left transition-colors',
        countered
          ? 'border-amber-900/60 bg-amber-950/30 hover:bg-amber-950/40'
          : 'border-border hover:bg-secondary/30',
        bet.state === 'quiet' && 'opacity-[0.74]',
      )}
    >
      <div className="flex items-start gap-[11px]">
        <ForkIcon countered={countered} />
        <span className="min-w-0 flex-1 text-balance text-sm font-medium leading-snug text-foreground">
          {bet.question}
        </span>
      </div>
      <div className="flex items-center gap-[9px] pl-[37px]">
        <StateChip state={bet.state} />
        <span className="text-[11px] text-muted-foreground">{bet.freshness}</span>
      </div>
    </button>
  );
}

// ---- hero tone governor: a countered bet warms the hero; explore cools it; otherwise emerald.
// (mirrors the .c-hero / .c-hero.contested honesty governor: a contested read drops the emerald glow.)
function heroTone(betState?: BetState | null): {
  viz: HeroVizTone;
  shell: string;
  eyebrow: string;
  dot: string;
} {
  if (betState === 'countered') {
    return {
      viz: 'contested',
      shell: 'border-amber-900/50 bg-[radial-gradient(120%_95%_at_72%_0%,#241a0c_0%,#0d1014_60%)]',
      eyebrow: 'text-amber-200/70',
      dot: 'text-amber-400/80',
    };
  }
  if (betState === 'explore') {
    return {
      viz: 'neutral',
      shell: 'border-sky-900/50 bg-[radial-gradient(120%_95%_at_72%_0%,#0e1f33_0%,#0d1014_60%)]',
      eyebrow: 'text-sky-200/70',
      dot: 'text-sky-400/80',
    };
  }
  return {
    viz: 'signal',
    shell: 'border-accent/25 bg-[radial-gradient(120%_95%_at_72%_0%,#10261f_0%,#0d1014_60%)] shadow-[0_0_55px_-22px_#00d9b6]',
    eyebrow: 'text-accent/80',
    dot: 'text-accent/80',
  };
}

// A hero MAY carry an optional cost series (build vs rent over time). It is not part of the
// required CockpitHero contract (the pipeline does not emit it yet), so we read it defensively:
// present -> draw the real curve; absent -> the sparkline renders its honest static motif.
function readHeroSeries(hero: CockpitHero): HeroSeries | null {
  const s = (hero as CockpitHero & { series?: HeroSeries | null }).series;
  if (s && Array.isArray(s.high) && Array.isArray(s.low)) return s;
  return null;
}

interface CockpitHomeProps {
  data: CockpitData;
  onOpenRead: (betId: string | null | undefined) => void;
  onOpenBet: (id: string) => void;
  onGoDecide: () => void;
  onAutomate?: (blocker: CockpitBlocker) => void;
  animated?: boolean;
}

export function CockpitHome({
  data,
  onOpenRead,
  onOpenBet,
  onGoDecide,
  onAutomate,
  animated = true,
}: CockpitHomeProps) {
  const { hero, bets, liveCount, needsYouCount, topBlocker } = data;
  const tone = heroTone(hero.betState);

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-4"
    >
      {/* ============================================================
          HERO - the day's single strongest market read hitting a bet.
          One thing at a time: visual, the read, the bet it hits, one CTA.
          ============================================================ */}
      {hero.kind === 'cold' ? (
        // cold start: no bets yet - an honest empty state, no fake signal
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
          <Radio className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-balance text-sm leading-relaxed text-foreground">{hero.headline}</p>
          <button
            type="button"
            onClick={onGoDecide}
            className="mt-4 inline-flex items-center justify-center rounded-xl border border-border bg-secondary/60 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Pressure-test a decision
          </button>
        </div>
      ) : hero.kind === 'quiet' ? (
        // quiet day: bets exist but nothing moved - calm, honest, no manufactured urgency
        <div className="rounded-2xl border border-border bg-card/60 p-5 text-center">
          <p className="text-balance text-base font-semibold leading-snug text-foreground">{hero.headline}</p>
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">
            We are watching your bets against the world.
          </p>
        </div>
      ) : (
        // signal: the strongest read this week
        <div className={cn('relative overflow-hidden rounded-[18px] border p-[14px_15px_15px]', tone.shell)}>
          {/* eyebrow: label never splits; category chip wraps to a new line if space runs out */}
          <div className="mb-[11px] flex flex-wrap items-center gap-x-[7px] gap-y-[5px] text-[9px] font-semibold uppercase tracking-[0.06em]">
            <span className={cn('whitespace-nowrap', tone.eyebrow)}>
              <span className={cn('mr-[5px]', tone.dot)}>&#9679;</span>Strongest signal this week
            </span>
            {hero.category && (
              <span className="shrink-0 rounded-[5px] border border-border px-[6px] py-px text-[8px] tracking-[0.1em] text-muted-foreground">
                {hero.category}
              </span>
            )}
          </div>

          {/* the signal VISUAL (fluid SVG; cannot overflow the card) */}
          <HeroSparkline className="mb-[13px] block h-[84px] w-full" tone={tone.viz} series={readHeroSeries(hero)} />

          {/* THE READ - clearest-unit-first. A kind-marked NUMBER leads ONLY where the pipeline
              has a real magnitude (it out-explains a sentence); otherwise the read leads with WORDS. */}
          {hero.magnitude ? (
            <div className="m-0 flex flex-wrap items-baseline gap-2">
              <span className="text-[29px] font-bold leading-[1.02] tracking-[-0.022em] text-foreground">
                {hero.magnitude.value}
              </span>
              <span className="text-[15px] font-medium leading-snug text-foreground/90">
                {hero.magnitude.label}
              </span>
              {/* a SOURCED figure stands clean; only a MODELLED one carries the est. mark, so an
                  estimate can never read as a measured fact (kind === '' -> no tag) */}
              {hero.magnitude.kind && (
                <span className="self-center whitespace-nowrap rounded-[5px] border border-border px-[6px] py-[2px] text-[8.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                  {hero.magnitude.kind}
                </span>
              )}
            </div>
          ) : (
            <h2 className="m-0 text-balance text-[18px] font-bold leading-[1.16] tracking-[-0.022em] text-foreground">
              {hero.headline}
            </h2>
          )}

          {/* the bet this read hits, with its honest state chip */}
          {hero.betQuestion && (
            <div className="mt-3 flex min-w-0 items-start gap-[9px]">
              {hero.betState && <StateChip state={hero.betState} />}
              <span className="min-w-0 flex-1 text-balance text-[11.5px] font-medium leading-snug text-[#cfd5dd]">
                {hero.betQuestion}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => onOpenRead(hero.betId)}
            className="mt-[14px] flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-accent px-3 py-3 text-[14px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Open the read
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ============================================================
          YOUR AI BETS - the board (live count + needs-you count + rows)
          ============================================================ */}
      {bets.length > 0 && (
        <div>
          <div className="mb-[9px] flex items-baseline gap-2 px-0.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Your AI bets
            </span>
            <span className="ml-auto text-[11.5px] text-muted-foreground">
              {liveCount} live
              {needsYouCount > 0 && (
                <>
                  {' '}
                  &middot; <span className="font-semibold text-amber-400">{needsYouCount} needs you</span>
                </>
              )}
            </span>
          </div>
          <div className="space-y-2">
            {bets.map((b) => (
              <BetRow key={b.id} bet={b} onOpen={onOpenBet} />
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          CONTEXTUAL EDGE - a real blocker on record -> turn the pain into a Claude skill.
          Shown ONLY when the leader actually has a blocker (never an invented pain).
          ============================================================ */}
      {topBlocker && onAutomate && (
        <button
          type="button"
          onClick={() => onAutomate(topBlocker)}
          className="flex w-full items-center gap-3 rounded-[13px] border border-amber-900/50 bg-amber-950/25 p-3 text-left transition-colors hover:bg-amber-950/40"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-amber-500/30 bg-amber-500/15 text-amber-300"
            aria-hidden
          >
            <Zap className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-400/80">
              Automate a pain
            </span>
            <span className="mt-0.5 block truncate text-sm font-medium text-foreground">{topBlocker.label}</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      )}
    </motion.div>
  );
}
