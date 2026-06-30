// NewsHeadlineCard - the rebuilt "worth a look" headline card.
//
// Pixel-locked to the founder-approved prototype `prototypes/news-headline-cards.html`:
//   [ motif hero band (pure art) ]
//   [ topline: category chip (left) + magnitude (right) - both clear of the art ]
//   [ editorial headline ]
//   [ one-line "why it matters to you" ]
//   [ source + relative-time row | (signal:) "From your world" pip ]
//
// The chip + magnitude live in the BODY, never over the motif, so they can never
// collide with the art. The signal/own-world variant keeps the magnitude and the
// emerald "From your world" pip. Colours come from the app tokens (src/index.css),
// not the prototype's inline hex.

import { ExternalLink } from 'lucide-react';
import { CategoryMotif } from './CategoryMotif';
import type { DeckCard } from '@/types/cockpit';
import { getNewsCategory, resolveNewsCategory } from '@/types/newsCategory';
import { cn } from '@/lib/utils';

// A short, lower-case descriptor for the magnitude stat. DeckCard's magnitude
// carries only { value, kind }, so we label it by what the figure represents:
// a sourced figure is a measured read, a modelled one is flagged as an estimate.
function magLabel(kind: 'sourced' | 'modelled'): string {
  return kind === 'modelled' ? 'est. for you' : 'in the world';
}

export interface NewsHeadlineCardProps {
  card: DeckCard;
  // visual prominence: 'feed' = the focused mobile card, 'lead' = the wide
  // desktop hero, 'tile' = a grid tile. Sizing differs; layout is identical.
  variant?: 'feed' | 'lead' | 'tile';
  focused?: boolean;
  onOpen?: (card: DeckCard) => void;
}

export function NewsHeadlineCard({ card, variant = 'feed', focused, onOpen }: NewsHeadlineCardProps) {
  const isSignal = card.kind === 'signal';
  // Category: server-assigned id wins; else a small keyword fallback classifies
  // the headline text. See resolveNewsCategory's TODO(news-pipeline).
  const categoryId = resolveNewsCategory(card.category, `${card.headline} ${card.say ?? ''}`);
  const category = getNewsCategory(categoryId);

  const isLead = variant === 'lead';
  const isTile = variant === 'tile';

  return (
    <button
      type="button"
      onClick={() => onOpen?.(card)}
      className={cn(
        'group flex w-full flex-col overflow-hidden rounded-[18px] border bg-[linear-gradient(180deg,#101620_0%,#0a0e12_100%)] text-left',
        'shadow-[0_22px_46px_-26px_rgba(0,0,0,0.9)] transition-[border-color,transform,box-shadow] duration-200',
        focused
          ? 'border-accent/30 shadow-[0_30px_60px_-26px_rgba(0,0,0,0.95),0_0_0_1px_hsl(var(--accent)/0.28)]'
          : 'border-border hover:-translate-y-0.5 hover:border-accent/30',
      )}
    >
      {/* HERO BAND - pure motif art; the chip + magnitude are NOT here */}
      <div
        className={cn(
          'ctrl-motif-band relative flex-none',
          isLead ? 'h-[200px] lg:h-[280px]' : isTile ? 'h-[140px]' : 'h-[118px]',
        )}
      >
        <CategoryMotif category={categoryId} />
        {/* fade the band into the body so the art settles into the card */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-10"
          style={{ background: 'linear-gradient(transparent, #0d121a)' }}
        />
      </div>

      <div className={cn('flex min-h-0 flex-1 flex-col', isLead ? 'p-[22px_26px_24px]' : 'p-[15px_17px_16px]')}>
        {/* TOPLINE: chip (left) + magnitude (right), fully clear of the motif */}
        <div className={cn('flex min-h-[18px] items-center justify-between gap-2.5', isLead ? 'mb-3.5' : 'mb-[11px]')}>
          <span
            className={cn(
              'whitespace-nowrap rounded-full border border-accent/30 bg-accent/10 font-gobold uppercase tracking-[0.07em] text-accent',
              isLead ? 'px-[11px] py-1 text-[10px]' : 'px-[9px] py-1 text-[9px]',
            )}
          >
            {category.label}
          </span>
          {card.magnitude?.value && (
            <span className="flex items-baseline gap-1.5 text-right">
              <b
                className={cn(
                  'font-grotesk font-bold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]',
                  isLead ? 'text-[26px]' : 'text-[21px]',
                )}
                style={{ color: 'var(--ctrl-accent-ink-bright,#aef6ea)', textShadow: '0 0 16px hsl(var(--accent)/0.45)' }}
              >
                {card.magnitude.value}
              </b>
              <span
                className={cn(
                  'max-w-[8ch] text-left uppercase leading-[1.15] tracking-[0.07em] text-muted-foreground',
                  isLead ? 'text-[9px]' : 'text-[8.5px]',
                )}
              >
                {magLabel(card.magnitude.kind)}
              </span>
            </span>
          )}
        </div>

        {/* HEADLINE */}
        <h2
          className={cn(
            'm-0 text-balance font-extrabold tracking-[-0.02em] text-foreground',
            isLead ? 'text-[23px] leading-[1.16] lg:text-[27px] lg:leading-[1.15]' : 'text-[17px] leading-[1.22]',
          )}
        >
          {card.headline}
        </h2>

        {/* WHY-LINE */}
        {card.say && (
          <p
            className={cn(
              'mt-[9px] overflow-hidden leading-[1.45] text-muted-foreground [-webkit-box-orient:vertical] [display:-webkit-box]',
              isLead ? 'max-w-[60ch] text-[14.5px] leading-[1.5] [-webkit-line-clamp:3]' : 'text-[12.5px] [-webkit-line-clamp:2]',
            )}
          >
            {card.say}
          </p>
        )}

        {/* TAKE: the opinionated, lens-driven POV line. Present only when the
            editorial lens is active server-side; otherwise the card is unchanged. */}
        {card.pov && (
          <p
            className={cn(
              'mt-2.5 border-l-2 border-accent/60 pl-2.5 leading-[1.45] text-foreground/85',
              isLead ? 'max-w-[60ch] text-[13.5px]' : 'text-[12px]',
            )}
          >
            <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-accent">Take</span>
            {card.pov}
          </p>
        )}

        {/* META: source + relative time | (signal:) From your world pip */}
        <div className={cn('mt-auto flex items-center gap-2 text-[11px] text-muted-foreground', isLead ? 'pt-[18px]' : 'pt-3.5')}>
          {isSignal ? (
            <>
              <span className="font-semibold text-[#aab2c0]">CTRL signal</span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_hsl(var(--accent))]" />
                From your world
              </span>
            </>
          ) : (
            <>
              <span className="font-semibold text-[#aab2c0]">{card.source ?? 'CTRL briefing'}</span>
              {card.corroboration && (
                <span
                  className="rounded-full border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.04em] text-accent"
                  title="Independent sources reporting this story"
                >
                  {card.corroboration}
                </span>
              )}
              {card.timeAgo && (
                <>
                  <span className="text-[#3a4150]">&middot;</span>
                  <span>{card.timeAgo}</span>
                </>
              )}
              {card.url && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-semibold text-accent">
                  Open
                  <ExternalLink className="h-3 w-3" />
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </button>
  );
}
