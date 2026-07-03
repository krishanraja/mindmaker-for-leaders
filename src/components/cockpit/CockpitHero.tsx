// CockpitHero - the ONE hero of the chief-of-staff home (the top of the ranked
// useCockpit stream, given the full focus zone).
//
// Pixel + interaction reference: prototypes/home-chief-of-staff.html (the .hero-card).
// It reuses the news motif family (CategoryMotif) and the same token-driven card
// language as NewsHeadlineCard, scaled up to command the frame: a motif hero
// band, a clean topline (category chip left + magnitude right, both clear of the
// art), the editorial headline, the chief-of-staff advisory line (why it matters /
// what I'd do), a source + time meta row, and the heart/skip reactions that train
// the feed (useCockpit.recordDeckReaction).
//
// GLANCE-ONLY CONTRACT: the card is the triage read - motif, category,
// magnitude, a clamped headline + one clamped line, source, and heart/skip.
// The DEPTH (full summary, the Take, benchmark, "for you") lives one tap away
// in CardReadSheet, so nothing on the card ever needs to truncate mid-thought.
// The card fills whatever bounded height its wrapper gives it (the mobile
// swipe track and the desktop rail both hand it an exact height) and NEVER
// grows past it; the meta + reactions row is flex-none at the bottom, always
// visible at the same place on every card. Predictability is the UX.

import { X, Heart, ChevronRight } from 'lucide-react';
import { CategoryMotif } from './CategoryMotif';
import { AiTermHint } from '@/components/system/AiTermHint';
import type { DeckCard } from '@/types/cockpit';
import { getNewsCategory, resolveNewsCategory } from '@/types/newsCategory';
import { cn } from '@/lib/utils';

// A short descriptor for the magnitude stat (DeckCard carries only value+kind):
// a sourced figure is a measured read of the world; a modelled one is flagged.
function magLabel(kind: 'sourced' | 'modelled'): string {
  return kind === 'modelled' ? 'est. for you' : 'in the world';
}

export interface CockpitHeroProps {
  card: DeckCard;
  /** lead = the wide desktop hero; feed = the mobile hero. Layout is identical. */
  variant?: 'feed' | 'lead';
  /** open the item (news -> the read sheet; a signal deep-links to its decision). */
  onOpen?: (card: DeckCard) => void;
  /** the swipe-trained reactions; placed on the hero per the new design. */
  onReact?: (card: DeckCard, reaction: 'like' | 'dislike') => void;
}

export function CockpitHero({ card, variant = 'feed', onOpen, onReact }: CockpitHeroProps) {
  const isSignal = card.kind === 'signal';
  const isLead = variant === 'lead';
  // server-assigned category id wins; else classify the headline text.
  const categoryId = resolveNewsCategory(card.category, `${card.headline} ${card.say ?? ''}`);
  const category = getNewsCategory(categoryId);

  return (
    <article
      className={cn(
        'relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-accent/30',
        'bg-[linear-gradient(180deg,#101620_0%,#0a0e12_100%)]',
        'shadow-[0_30px_64px_-30px_rgba(0,0,0,0.95),0_0_0_1px_hsl(var(--accent)/0.28),inset_0_1px_0_rgba(255,255,255,0.025)]',
      )}
    >
      {/* HERO BAND - pure motif art; chip + magnitude live in the body below.
          Feed: proportional to the card's bounded height so the glance card
          breathes now that the depth lives in the read sheet. */}
      <div className={cn('ctrl-motif-band relative flex-none', isLead ? 'h-[42%] min-h-[170px]' : 'h-[34%] min-h-[96px] max-h-[160px]')}>
        <CategoryMotif category={categoryId} />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[46px]"
          style={{ background: 'linear-gradient(transparent, #0d121a)' }}
        />
      </div>

      <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', isLead ? 'p-[24px_30px_26px]' : 'p-[16px_20px_17px]')}>
        {/* TOPLINE: category chip (left) + magnitude (right), clear of the motif */}
        <div className={cn('flex min-h-[20px] flex-none items-center justify-between gap-2.5', isLead ? 'mb-3.5' : 'mb-3')}>
          <span
            className={cn(
              'whitespace-nowrap rounded-full border border-accent/30 bg-accent/10 font-gobold uppercase tracking-[0.07em] text-accent',
              isLead ? 'px-3 py-1.5 text-[10px]' : 'px-2.5 py-1 text-[9.5px]',
            )}
          >
            {/* Signals are the leader's OWN decisions, not industry news - never
                mislabel them with a news category. News chips demystify the AI
                term in place: tap to read what the category means in plain words. */}
            {isSignal ? (
              'Your decision'
            ) : (
              <AiTermHint term={category.label} meaning={category.meaning} className="font-gobold uppercase tracking-[0.07em] text-accent" />
            )}
          </span>
          {card.magnitude?.value && (
            <span className="flex items-baseline gap-1.5 text-right">
              <b
                className={cn(
                  'font-grotesk font-bold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]',
                  isLead ? 'text-[30px]' : 'text-[24px]',
                )}
                style={{ color: 'var(--ctrl-accent-ink-bright,#aef6ea)', textShadow: '0 0 16px hsl(var(--accent)/0.45)' }}
              >
                {card.magnitude.value}
              </b>
              <span
                className={cn(
                  'max-w-[9ch] text-left uppercase leading-[1.15] tracking-[0.07em] text-muted-foreground',
                  isLead ? 'text-[9px]' : 'text-[8.5px]',
                )}
              >
                {magLabel(card.magnitude.kind)}
              </span>
            </span>
          )}
        </div>

        {/* THE VARIABLE MIDDLE - everything whose length varies lives inside
            this bounded, clipped block. It shrinks (min-h-0) before the meta
            row ever moves, so however much content a card carries, the card's
            outer shape and its bottom row never change. */}
        <div className="min-h-0 overflow-hidden">
          {/* EDITORIAL HEADLINE. Hard-clamped to 3 lines: headlines are real
              outlet titles (variable, sometimes very long), so the clamp is the
              SYSTEM guarantee that a long headline can never push the body or meta
              row off the card. The full title is on the linked article. */}
          <button type="button" onClick={() => onOpen?.(card)} className="block w-full text-left">
            <h2
              className={cn(
                'm-0 line-clamp-3 text-balance font-extrabold tracking-[-0.02em] text-foreground',
                isLead ? 'text-[30px] leading-[1.12]' : 'text-[21px] leading-[1.18]',
              )}
            >
              {card.headline}
            </h2>
          </button>

          {/* THE "WHY IT MATTERS" LINE. Clamped to 2 lines: it is generated text,
              so the clamp is the SYSTEM guarantee that an over-long line can never
              overflow. The full line, the Take, the benchmark, and the for-you
              read all live one tap away in CardReadSheet. */}
          {card.say && (
            <p
              className={cn(
                'line-clamp-2 leading-[1.48] text-[#c2cad6]',
                isLead ? 'mt-3.5 max-w-[54ch] text-[16px] leading-[1.55]' : 'mt-2.5 text-[13.5px]',
              )}
            >
              {card.say}
            </p>
          )}
        </div>

        {/* META + REACTIONS row, pinned to the card bottom (mt-auto, flex-none:
            it never shrinks and never clips - the one row that must always be
            visible). The heart/skip train the feed; they sit with the source so
            the one card stays self-contained. */}
        <div className={cn('mt-auto flex flex-none items-center gap-3', isLead ? 'pt-[18px]' : 'pt-3')}>
          <div className="flex min-w-0 flex-1 items-center gap-2 text-[11px] text-muted-foreground">
            {isSignal ? (
              <>
                <span className="font-semibold text-[#aab2c0]">CTRL signal</span>
                <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_hsl(var(--accent))]" />
                  From your world
                </span>
              </>
            ) : (
              <>
                <span className="truncate font-semibold text-[#aab2c0]">{card.source ?? 'CTRL briefing'}</span>
                {card.timeAgo && (
                  <>
                    <span className="text-[#3a4150]">&middot;</span>
                    <span className="shrink-0">{card.timeAgo}</span>
                  </>
                )}
              </>
            )}
          </div>
          {/* the quiet read affordance: the depth is one tap away (whole card
              body opens it too; this makes the door visible) */}
          {!isSignal && onOpen && (
            <button
              type="button"
              onClick={() => onOpen(card)}
              aria-label="Read more"
              className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-accent transition-colors hover:brightness-110"
            >
              {card.pov ? 'The take' : 'More'}
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
          )}
          {onReact && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => onReact(card, 'dislike')}
                aria-label="Less like this"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-[#0c1116] text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => onReact(card, 'like')}
                aria-label="More like this"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/40 bg-accent/[0.08] text-accent transition-colors hover:bg-accent/15"
              >
                <Heart className="h-[18px] w-[18px] fill-current" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
