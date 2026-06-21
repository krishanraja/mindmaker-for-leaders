// CockpitStreamRow - one compact row of "the rest of what I'm tracking" stream.
//
// Reference: prototypes/home-chief-of-staff.html (.srow). A small motif tile +
// the kind chip (news / your world / decide) + source + headline + a two-line
// advisory. Same card family as the hero, scaled down for the scrollable list.
// The advisory here is the only place a clamp is acceptable (it is a teaser, not
// the one thing) and it clamps cleanly to two lines.

import { CategoryMotif } from './CategoryMotif';
import type { DeckCard } from '@/types/cockpit';
import { resolveNewsCategory } from '@/types/newsCategory';
import { cn } from '@/lib/utils';

const KIND_LABEL: Record<DeckCard['kind'], string> = { news: 'Headline', signal: 'Your world' };

export interface CockpitStreamRowProps {
  card: DeckCard;
  index: number;
  onOpen?: (card: DeckCard) => void;
}

export function CockpitStreamRow({ card, index, onOpen }: CockpitStreamRowProps) {
  const isSignal = card.kind === 'signal';
  const categoryId = resolveNewsCategory(card.category, `${card.headline} ${card.say ?? ''}`);

  return (
    <button
      type="button"
      onClick={() => onOpen?.(card)}
      style={{ animationDelay: `${index * 55}ms` }}
      className={cn(
        'ctrl-streamrow-in flex items-stretch gap-3 overflow-hidden rounded-[16px] border border-border text-left',
        'bg-[linear-gradient(180deg,#0f141c_0%,#0a0e13_100%)] transition-[border-color,transform] duration-150',
        'hover:-translate-y-px hover:border-accent/30',
      )}
    >
      <span className="ctrl-motif-band relative w-[74px] flex-none">
        <CategoryMotif category={categoryId} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col py-3 pr-3.5">
        <span className="mb-1.5 flex items-center gap-2">
          <span
            className={cn(
              'whitespace-nowrap rounded-full px-[7px] py-[3px] font-gobold text-[8px] uppercase tracking-[0.06em]',
              isSignal
                ? 'border border-accent/30 bg-accent/[0.12] text-[#aef6ea]'
                : 'border border-accent/30 bg-accent/10 text-accent',
            )}
          >
            {KIND_LABEL[card.kind]}
          </span>
          {isSignal && <span className="h-[5px] w-[5px] rounded-full bg-accent shadow-[0_0_7px_hsl(var(--accent))]" />}
          <span className="truncate text-[9.5px] text-muted-foreground">
            {isSignal ? 'From your world' : card.source ?? 'CTRL briefing'}
            {card.timeAgo ? ` · ${card.timeAgo}` : ''}
          </span>
        </span>
        <span className="text-balance text-[14px] font-bold leading-[1.24] tracking-[-0.01em] text-foreground">
          {card.headline}
        </span>
        {card.say && (
          <span className="mt-[5px] overflow-hidden text-[11.5px] leading-[1.42] text-muted-foreground [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box]">
            {card.say}
          </span>
        )}
      </span>
    </button>
  );
}
