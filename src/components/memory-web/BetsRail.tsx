import { GitFork } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BetState, CockpitBet } from '@/types/cockpit';

/**
 * BetsRail - the left rail of the desktop command-centre: the user's whole honest
 * board of live AI bets, each wearing its true signal-state, with a fixed-width chip
 * column so COUNTERED never blurs into a different geometry (the mock's .rail/.bet).
 *
 * Honesty: the chip set is exactly what the cockpit asserts - countered / explore /
 * quiet. VALIDATED/green is never faked here (the positive-signal classifier does not
 * exist yet); a bet with no fresh signal reads QUIET, not "validated".
 */

const STATE_CHIP: Record<BetState, { label: string; cls: string }> = {
  countered: { label: 'Countered', cls: 'border-amber-500/30 bg-amber-500/15 text-amber-400' },
  explore: { label: 'Explore', cls: 'border-sky-500/30 bg-sky-500/15 text-sky-400' },
  quiet: { label: 'Quiet', cls: 'border-border bg-secondary/60 text-muted-foreground' },
};

function StateChip({ state }: { state: BetState }) {
  const s = STATE_CHIP[state];
  return (
    <span
      className={cn(
        'flex w-[88px] shrink-0 items-center justify-center rounded-full border px-0 py-[3px] text-center text-[9px] font-bold uppercase leading-[1.15] tracking-[0.06em]',
        s.cls,
      )}
    >
      {s.label}
    </span>
  );
}

function ForkGlyph({ countered }: { countered: boolean }) {
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

/** One bet card: question full-width (wraps freely), a one-line descriptor below. */
function BetCard({
  bet,
  selected,
  onSelect,
}: {
  bet: CockpitBet;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const countered = bet.state === 'countered';
  return (
    <button
      type="button"
      onClick={() => onSelect(bet.id)}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'relative flex w-full flex-col justify-center gap-[6px] border-l-2 px-4 py-[11px] text-left transition-colors',
        selected
          ? countered
            ? 'border-l-amber-500 bg-amber-950/25'
            : 'border-l-accent bg-secondary/40'
          : 'border-l-transparent hover:bg-secondary/20',
      )}
    >
      <div className="flex items-start gap-[9px]">
        <ForkGlyph countered={countered} />
        <span className="min-w-0 flex-1 text-balance text-[13px] font-medium leading-snug text-foreground">
          {bet.question}
        </span>
        <StateChip state={bet.state} />
      </div>
      <div className="pl-[35px] text-[11px] leading-snug text-muted-foreground">{bet.freshness}</div>
    </button>
  );
}

export interface OvernightLine {
  tone: 'down' | 'ok' | 'flat';
  text: string;
}

interface BetsRailProps {
  bets: CockpitBet[];
  liveCount: number;
  selectedBetId: string | null;
  onSelectBet: (id: string) => void;
  onAddBet: () => void;
  overnight?: OvernightLine[];
}

export function BetsRail({
  bets,
  liveCount,
  selectedBetId,
  onSelectBet,
  onAddBet,
  overnight,
}: BetsRailProps) {
  return (
    <div className="flex h-full min-h-0 w-[300px] shrink-0 flex-col border-r border-border/60 bg-card/20">
      <div className="flex h-10 shrink-0 items-center border-b border-border/40 px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        Your bets - {liveCount} live
      </div>

      {overnight && overnight.length > 0 && (
        <div className="shrink-0 border-b border-border/40 px-4 py-[11px]">
          <div className="mb-[7px] text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            Since yesterday
          </div>
          <div className="space-y-[5px]">
            {overnight.map((line, i) => (
              <div key={i} className="flex items-start gap-2 text-[11.5px] leading-snug text-foreground/70">
                <span
                  className={cn(
                    'w-3 shrink-0 text-center font-bold',
                    line.tone === 'down' && 'text-amber-400',
                    line.tone === 'ok' && 'text-accent',
                    line.tone === 'flat' && 'text-muted-foreground',
                  )}
                  aria-hidden
                >
                  {line.tone === 'down' ? '↓' : line.tone === 'ok' ? '✓' : '-'}
                </span>
                <span>{line.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide py-2">
        {bets.map((b) => (
          <BetCard key={b.id} bet={b} selected={b.id === selectedBetId} onSelect={onSelectBet} />
        ))}
        {bets.length === 0 && (
          <p className="px-4 py-6 text-center text-[12px] leading-relaxed text-muted-foreground">
            No live decisions yet. Weigh one and it lands on your board.
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-border/40 p-3">
        <button
          type="button"
          onClick={onAddBet}
          className="block w-full rounded-[9px] border border-border bg-secondary/40 py-[9px] text-center text-[12.5px] font-semibold text-foreground transition-colors hover:bg-secondary/70"
        >
          Add a bet
        </button>
      </div>
    </div>
  );
}
