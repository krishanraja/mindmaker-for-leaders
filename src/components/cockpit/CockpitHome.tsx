import { motion } from 'framer-motion';
import { GitFork, ArrowRight, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { BetState, CockpitBet, CockpitData } from '@/types/cockpit';

const STATE_CHIP: Record<BetState, { label: string; cls: string }> = {
  countered: { label: 'Countered', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  explore: { label: 'Explore', cls: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
  quiet: { label: 'Quiet', cls: 'border-border bg-secondary/40 text-muted-foreground' },
};

function StateChip({ state }: { state: BetState }) {
  const s = STATE_CHIP[state];
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', s.cls)}>
      {s.label}
    </span>
  );
}

function BetRow({ bet, onOpen }: { bet: CockpitBet; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(bet.id)}
      className={cn(
        'flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary/30',
        bet.state === 'countered' && 'border-amber-500/25 bg-amber-500/[0.04]',
        bet.state === 'quiet' && 'opacity-75',
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-border', bet.state === 'countered' ? 'text-amber-300' : 'text-muted-foreground')} aria-hidden>
          <GitFork className="h-3.5 w-3.5 rotate-90" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">{bet.question}</span>
      </div>
      <div className="flex items-center gap-2 pl-9">
        <StateChip state={bet.state} />
        <span className="text-[11px] text-muted-foreground">{bet.freshness}</span>
      </div>
    </button>
  );
}

interface CockpitHomeProps {
  data: CockpitData;
  onOpenRead: (betId: string | null | undefined) => void;
  onOpenBet: (id: string) => void;
  onGoDecide: () => void;
  animated?: boolean;
}

export function CockpitHome({ data, onOpenRead, onOpenBet, onGoDecide, animated = true }: CockpitHomeProps) {
  const { hero, bets, liveCount, needsYouCount } = data;

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-5"
    >
      {/* HERO - the daily read */}
      {hero.kind === 'cold' ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
          <Radio className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-foreground">{hero.headline}</p>
          <Button variant="secondary" className="mt-4" onClick={onGoDecide}>Pressure-test a decision</Button>
        </div>
      ) : hero.kind === 'quiet' ? (
        <div className="rounded-2xl border border-border bg-card/60 p-5 text-center">
          <p className="text-base font-medium text-foreground">{hero.headline}</p>
          <p className="mt-1 text-xs text-muted-foreground">We're watching your bets against the world.</p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-b from-accent/[0.06] to-transparent p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-accent/80">
            <span className="mr-1.5">&#9679;</span>Strongest signal this week
            {hero.category && <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[8px] tracking-widest text-muted-foreground">{hero.category}</span>}
          </p>

          {/* clearest-unit-first: a kind-marked NUMBER only where the pipeline has a real
              magnitude; otherwise the read leads with WORDS (the headline). */}
          {hero.magnitude ? (
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">{hero.magnitude.value}</span>
              <span className="text-sm font-medium text-foreground/90">{hero.magnitude.label}</span>
              {/* a sourced figure stands clean; only a modelled one is marked, so an
                  estimate never reads as measured */}
              {hero.magnitude.kind && (
                <span className="self-center whitespace-nowrap rounded border border-border px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">{hero.magnitude.kind}</span>
              )}
            </div>
          ) : (
            <h2 className="text-lg font-semibold leading-snug tracking-tight text-foreground">{hero.headline}</h2>
          )}

          {hero.betQuestion && (
            <div className="mt-3 flex items-start gap-2">
              {hero.betState && <StateChip state={hero.betState} />}
              <span className="min-w-0 flex-1 text-sm text-muted-foreground">{hero.betQuestion}</span>
            </div>
          )}

          <Button className="mt-4 w-full" onClick={() => onOpenRead(hero.betId)}>
            Open the read <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* BETS BOARD */}
      {bets.length > 0 && (
        <div>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your AI bets</span>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {liveCount} live{needsYouCount > 0 && <> &middot; <span className="font-semibold text-amber-400">{needsYouCount} needs you</span></>}
            </span>
          </div>
          <div className="space-y-2">
            {bets.map((b) => (
              <BetRow key={b.id} bet={b} onOpen={onOpenBet} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
