/**
 * CapabilityHeader - the quiet progression read at the top of the You surface.
 *
 * Where this leader is on the road to running AI-native, derived purely from
 * observed behaviour (src/lib/capabilityLadder.ts), and the ONE next move
 * that compounds. Never a scoreboard, never points: four small stage dots, a
 * plain-language stage line, honest receipts, and a single quiet action.
 */
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CapabilityNextMove, CapabilityRead } from '@/lib/capabilityLadder';
import { STAGE_ORDER } from '@/lib/capabilityLadder';

export function CapabilityHeader({
  capability,
  onGo,
}: {
  capability: CapabilityRead;
  onGo?: (move: CapabilityNextMove) => void;
}) {
  const receipts = capability.evidence.slice(0, 3);
  return (
    <div className="flex-none rounded-2xl border border-border bg-gradient-to-b from-card to-background p-3.5">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1" aria-label={`Stage ${capability.stageIndex} of ${STAGE_ORDER.length}`}>
          {STAGE_ORDER.map((s, i) => (
            <span
              key={s}
              className={cn(
                'h-[5px] w-[5px] rounded-full',
                i < capability.stageIndex
                  ? 'bg-accent shadow-[0_0_7px_hsl(var(--accent))]'
                  : 'bg-foreground/[0.12]',
              )}
            />
          ))}
        </span>
        <span className="text-[12.5px] font-bold text-foreground">{capability.stageLabel}</span>
      </div>
      <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground text-pretty">{capability.stageLine}</p>
      {receipts.length > 0 && (
        <p className="mt-1 text-[10.5px] leading-snug text-muted-foreground/70">
          {receipts.join(' · ')}
        </p>
      )}
      <button
        type="button"
        onClick={() => onGo?.(capability.nextMove)}
        className="mt-2.5 flex w-full items-center justify-between gap-2 rounded-xl border border-accent/25 bg-accent/[0.07] px-3 py-2 text-left transition-colors hover:bg-accent/[0.12]"
      >
        <span className="text-[11.5px] leading-snug text-foreground/90">
          <span className="font-bold text-accent">Next: </span>
          {capability.nextMove.label}
        </span>
        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-accent" />
      </button>
    </div>
  );
}
