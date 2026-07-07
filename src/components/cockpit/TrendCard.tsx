// TrendCard - the Home "shift" card. A structural SHIFT (kind === 'trend') is
// not a single headline: it is a pattern that recurs across many distinct
// stories over weeks (e.g. "the rise of the forward-deployed engineer"), framed
// as what it means for how the leader's org may need to change.
//
// It shares CockpitHero's exact height contract (motif band + bounded middle +
// pinned bottom row) so it slots into the mobile swipe feed and the desktop rail
// byte-for-byte like every other card, and the news motif family keeps it in the
// feed's visual world. What sets it apart: a "The shift" eyebrow, a temporal
// evidence chip (its corroboration is recurrence over TIME, not cross-source
// breadth on one day), and a weigh-forward primary action - tapping opens the
// read sheet where the dated evidence + the "weigh what this means for your org"
// CTA live. Depth is one tap away, same as a news card.

import { TrendingUp, ChevronRight } from 'lucide-react';
import { CategoryMotif } from './CategoryMotif';
import { AiTermHint } from '@/components/system/AiTermHint';
import type { DeckCard } from '@/types/cockpit';
import { getNewsCategory, resolveNewsCategory } from '@/types/newsCategory';
import { cn } from '@/lib/utils';

export interface TrendCardProps {
  card: DeckCard;
  /** lead = the wide desktop hero; feed = the mobile hero. Layout is identical. */
  variant?: 'feed' | 'lead';
  /** open the read sheet (the shift's evidence + the weigh-it action). */
  onOpen?: (card: DeckCard) => void;
}

export function TrendCard({ card, variant = 'feed', onOpen }: TrendCardProps) {
  const isLead = variant === 'lead';
  const categoryId = resolveNewsCategory(card.category, `${card.headline} ${card.say ?? ''}`);
  const category = getNewsCategory(categoryId);

  return (
    <article
      // Same whole-card tap model as the news card (the read sheet opens on tap);
      // keyboard access stays on the headline button.
      onClick={() => onOpen?.(card)}
      className={cn(
        'group relative flex min-h-0 flex-1 cursor-pointer flex-col overflow-hidden rounded-[22px] border border-accent/55',
        // AN ONGOING SHIFT = a clearly emerald-tinted surface with a soft edge
        // glow, so a CTRL-flagged structural pattern reads distinct from fresh news.
        'bg-[linear-gradient(180deg,#0e2019_0%,#0a120e_100%)]',
        'shadow-[0_30px_64px_-30px_rgba(0,0,0,0.95),0_0_0_1px_hsl(var(--accent)/0.45),0_0_44px_-14px_hsl(var(--accent)/0.5),inset_0_1px_0_rgba(255,255,255,0.04)]',
      )}
    >
      {/* HERO BAND - the category motif keeps the shift in the feed's visual world. */}
      <div className={cn('ctrl-motif-band relative flex-none', isLead ? 'h-[40%] min-h-[160px]' : 'h-[32%] min-h-[92px] max-h-[150px]')}>
        <CategoryMotif category={categoryId} />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[46px]"
          style={{ background: 'linear-gradient(transparent, #0d121a)' }}
        />
      </div>

      <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', isLead ? 'p-[22px_30px_24px]' : 'p-[15px_20px_16px]')}>
        {/* TOPLINE: the "The shift" eyebrow (left) + the temporal evidence chip (right). */}
        <div className={cn('flex min-h-[20px] flex-none items-center justify-between gap-2.5', isLead ? 'mb-3.5' : 'mb-3')}>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-accent/40 bg-accent/12 font-gobold uppercase tracking-[0.07em] text-accent',
              isLead ? 'px-3 py-1.5 text-[10px]' : 'px-2.5 py-1 text-[9.5px]',
            )}
          >
            <TrendingUp className={isLead ? 'h-3.5 w-3.5' : 'h-3 w-3'} strokeWidth={2.4} />
            {card.eyebrow || 'The shift'}
          </span>
          {card.corroboration && (
            <span className="shrink-0 whitespace-nowrap text-[10.5px] font-semibold text-muted-foreground">
              {card.corroboration}
            </span>
          )}
        </div>

        {/* THE VARIABLE MIDDLE - bounded + clipped so the bottom row never moves. */}
        <div className="min-h-0 overflow-hidden">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen?.(card); }}
            aria-label={`Read: ${card.headline}`}
            className="block w-full text-left"
          >
            <h2
              className={cn(
                'm-0 line-clamp-3 text-balance font-extrabold tracking-[-0.02em] text-foreground',
                isLead ? 'text-[29px] leading-[1.13]' : 'text-[20px] leading-[1.18]',
              )}
            >
              {card.headline}
            </h2>
          </button>
          {card.say && (
            <p
              className={cn(
                'line-clamp-3 leading-[1.48] text-[#c2cad6]',
                isLead ? 'mt-3.5 max-w-[54ch] text-[15.5px] leading-[1.55]' : 'mt-2.5 text-[13px]',
              )}
            >
              {card.say}
            </p>
          )}
        </div>

        {/* META (lane + span) + the weigh-forward primary action, pinned to bottom. */}
        <div className={cn('mt-auto flex flex-none items-center gap-3', isLead ? 'pt-[18px]' : 'pt-3')}>
          <div className="flex min-w-0 flex-1 items-center gap-2 text-[11px] text-muted-foreground">
            <span onClick={(e) => e.stopPropagation()} className="min-w-0 truncate">
              <AiTermHint term={category.label} meaning={category.meaning} className="truncate font-semibold text-[#aab2c0]" />
            </span>
            {card.timeAgo && (
              <>
                <span className="text-[#3a4150]">&middot;</span>
                <span className="shrink-0">{card.timeAgo}</span>
              </>
            )}
          </div>
          {/* Same quiet "Read" affordance as the news card - one consistent door;
              the whole card taps to open the shift's evidence + the decision action. */}
          <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-accent transition-colors group-hover:brightness-110">
            Read
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.4} />
          </span>
        </div>
      </div>
    </article>
  );
}
