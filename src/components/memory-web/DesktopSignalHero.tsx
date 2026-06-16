import { motion } from 'framer-motion';
import { ArrowRight, GitFork, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BetState, CockpitHero } from '@/types/cockpit';
import { HeroSparkline, type HeroSeries, type HeroVizTone } from '@/components/cockpit/HeroSparkline';

/**
 * DesktopSignalHero - the central command panel of the desktop command-centre.
 * Same honest signal-read as the mobile cockpit hero, scaled up for desktop:
 * a date header, the "your call" quote-back with its state chip, the signal hero
 * (build-vs-rent gap visual + honest number-or-words + the bet it hits + Open the
 * read). It is the desktop counterpart of cockpit-web.html's hero.
 *
 * Honesty: a kind-marked NUMBER leads ONLY where the pipeline supplies a real
 * magnitude; otherwise WORDS lead. The hero tone is governed by the bet's honest
 * state (a countered read warms it, never a fake emerald success glow).
 */

const STATE_CHIP: Record<BetState, { label: string; cls: string }> = {
  countered: { label: 'Countered', cls: 'border-amber-500/30 bg-amber-500/15 text-amber-400' },
  explore: { label: 'Explore', cls: 'border-sky-500/30 bg-sky-500/15 text-sky-400' },
  quiet: { label: 'Quiet', cls: 'border-border bg-secondary/60 text-muted-foreground' },
};

function StateChip({ state, className }: { state: BetState; className?: string }) {
  const s = STATE_CHIP[state];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-3 py-[3px] text-[9px] font-bold uppercase leading-[1.15] tracking-[0.06em]',
        s.cls,
        className,
      )}
    >
      {s.label}
    </span>
  );
}

// The strongest-signal hero is emerald (a strong signal the brain surfaced), exactly
// as the cockpit/desktop mocks show it. The bet's honest state (countered/explore/quiet)
// is carried by the StateChip on the bet, not by recolouring the whole hero. (The briefing
// hero, by contrast, warms to amber when countered - that is its mock, a different frame.)
function heroTone(_betState?: BetState | null): {
  viz: HeroVizTone;
  shell: string;
  eyebrow: string;
  dot: string;
} {
  return {
    viz: 'signal',
    shell: 'border-accent/25 bg-[radial-gradient(120%_120%_at_70%_0%,#10261f_0%,#0d1014_62%)] shadow-[0_0_60px_-26px_#00d9b6]',
    eyebrow: 'text-accent/80',
    dot: 'text-accent/80',
  };
}

// defensive read of an optional cost series (the pipeline does not emit it yet)
function readHeroSeries(hero: CockpitHero): HeroSeries | null {
  const s = (hero as CockpitHero & { series?: HeroSeries | null }).series;
  if (s && Array.isArray(s.high) && Array.isArray(s.low)) return s;
  return null;
}

export interface NeedsCallItem {
  id: string;
  title: string;
  detail: string;
  betState: BetState;
}

interface DesktopSignalHeroProps {
  hero: CockpitHero;
  /** the leader's call, quoted back (the selected bet's statement) */
  call?: string | null;
  /** the selected bet's honest state, for the "your call" subhead chip */
  callState?: BetState | null;
  dateLabel: string;
  needs: NeedsCallItem[];
  needsExtra: number;
  onOpenRead: (betId: string | null | undefined) => void;
  onPressureTest: () => void;
  onOpenBriefing: () => void;
  onGoDecide: () => void;
  animated?: boolean;
}

export function DesktopSignalHero({
  hero,
  call,
  callState,
  dateLabel,
  needs,
  needsExtra,
  onOpenRead,
  onPressureTest,
  onOpenBriefing,
  onGoDecide,
  animated = true,
}: DesktopSignalHeroProps) {
  const tone = heroTone(hero.betState);

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex min-h-0 flex-1 flex-col"
    >
      {/* date / position header */}
      <div className="mb-4 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Your AI position
        </p>
        <h2 className="mt-1 text-balance text-[18px] font-semibold leading-tight tracking-[-0.01em] text-foreground">
          {dateLabel}
        </h2>
      </div>

      {/* "your call" quoted back - the selected bet's statement + its honest chip */}
      {call && (
        <div className="mb-4 flex shrink-0 items-start gap-3 rounded-r-[10px] border border-l-[3px] border-border border-l-accent bg-secondary/30 px-[14px] py-[11px]">
          <div className="flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
              Your call
            </div>
            <div className="mt-1 text-balance text-[13px] italic leading-relaxed text-foreground/85">
              &ldquo;{call}&rdquo;
            </div>
          </div>
          {callState && <StateChip state={callState} className="mt-0.5" />}
        </div>
      )}

      {/* ── the strongest signal, as a desktop hero ───────────────────────── */}
      <div className="shrink-0">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Strongest signal today
        </p>

        {hero.kind === 'cold' ? (
          <div className="rounded-[14px] border border-dashed border-border bg-card/50 p-8 text-center">
            <Radio className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
            <p className="mx-auto max-w-md text-balance text-sm leading-relaxed text-foreground">
              {hero.headline}
            </p>
            <button
              type="button"
              onClick={onGoDecide}
              className="mt-5 inline-flex items-center justify-center rounded-xl border border-border bg-secondary/60 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              Pressure-test a decision
            </button>
          </div>
        ) : hero.kind === 'quiet' ? (
          <div className="rounded-[14px] border border-border bg-card/60 p-7 text-center">
            <p className="text-balance text-base font-semibold leading-snug text-foreground">
              {hero.headline}
            </p>
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              We are watching your bets against the world.
            </p>
          </div>
        ) : (
          <div className={cn('relative overflow-hidden rounded-[14px] border p-5', tone.shell)}>
            <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.06em]">
              <span className={cn('whitespace-nowrap', tone.eyebrow)}>
                <span className={cn('mr-1.5', tone.dot)}>&#9679;</span>The read that moved hardest
              </span>
              {hero.category && (
                <span className="shrink-0 rounded-[5px] border border-border px-1.5 py-px text-[9px] tracking-[0.1em] text-muted-foreground">
                  {hero.category}
                </span>
              )}
            </div>

            {/* the gap visual, at desktop height */}
            <HeroSparkline
              className="mb-4 block h-[120px] w-full"
              tone={tone.viz}
              series={readHeroSeries(hero)}
            />

            {/* the read: a kind-marked NUMBER leads only where honest; else WORDS lead */}
            {hero.magnitude ? (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[38px] font-bold leading-none tracking-[-0.022em] text-foreground">
                  {hero.magnitude.value}
                </span>
                <span className="text-[17px] font-medium leading-snug text-foreground/90">
                  {hero.magnitude.label}
                </span>
                {hero.magnitude.kind && (
                  <span className="self-center whitespace-nowrap rounded-[5px] border border-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                    {hero.magnitude.kind}
                  </span>
                )}
              </div>
            ) : (
              <h3 className="text-balance text-[18px] font-semibold leading-snug tracking-[-0.012em] text-foreground">
                {hero.headline}
              </h3>
            )}

            {/* the bet this read hits, with its honest state chip */}
            {hero.betQuestion && (
              <div className="mt-4 flex min-w-0 items-start gap-[9px]">
                <span className="mt-px flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px] border border-border bg-[#13161c] text-muted-foreground" aria-hidden>
                  <GitFork className="h-[14px] w-[14px] rotate-180" />
                </span>
                <span className="min-w-0 flex-1 text-balance text-[12.5px] font-medium leading-snug text-[#cfd5dd]">
                  {hero.betQuestion}
                </span>
                {hero.betState && <StateChip state={hero.betState} />}
              </div>
            )}

            <button
              type="button"
              onClick={() => onOpenRead(hero.betId)}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-[12px] bg-accent px-5 py-3 text-[14px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
            >
              Open the read
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Needs your call ───────────────────────────────────────────────── */}
      {needs.length > 0 && (
        <div className="mt-5 min-h-0">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Needs your call
          </p>
          <div className="space-y-2.5">
            {/* the mock caps "needs your call" at two cards; the rest folds into "and N more" */}
            {needs.slice(0, 2).map((n) => {
              const countered = n.betState === 'countered';
              return (
                <div
                  key={n.id}
                  className={cn(
                    'rounded-[12px] border px-[15px] py-[13px]',
                    countered ? 'border-amber-900/50 bg-amber-950/20' : 'border-border bg-card/50',
                  )}
                >
                  <p className="text-[13px] font-medium leading-snug text-foreground">{n.title}</p>
                  {n.detail && (
                    <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{n.detail}</p>
                  )}
                  <div className="mt-3 flex gap-2.5">
                    <button
                      type="button"
                      onClick={onPressureTest}
                      className="rounded-[9px] bg-accent px-[14px] py-2 text-[12px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
                    >
                      Pressure-test
                    </button>
                    <button
                      type="button"
                      onClick={onOpenBriefing}
                      className="rounded-[9px] border border-sky-500/30 bg-transparent px-[14px] py-2 text-[12px] font-semibold text-sky-400 transition-colors hover:bg-sky-500/10"
                    >
                      Open briefing
                    </button>
                  </div>
                </div>
              );
            })}
            {needsExtra > 0 && (
              <p className="pl-0.5 text-[11.5px] text-muted-foreground">and {needsExtra} more</p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
