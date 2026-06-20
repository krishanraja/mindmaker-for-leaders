import { useState } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { X, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DeckCard } from '@/types/cockpit';
import { NewsHeadlineCard } from './NewsHeadlineCard';

/**
 * CockpitDeck - the Home "worth a look" deck (locked 2026-06-17, design-log;
 * branded-motif rebuild 2026-06-20 per docs/MAIN-APP-POLISH-SPEC.md s2 +
 * prototypes/news-headline-cards.html).
 *
 * A small stack of cards the leader swipes through: a MIX of broad AI news
 * (from the briefing pipeline) and their own signals (a decision moved). Each
 * card now renders as a branded headline card (NewsHeadlineCard): a category
 * motif hero band, then a clean topline (chip + magnitude), the editorial
 * headline, a one-line "why it matters to you", and a source + time row. Plain
 * language; swipe (or tap the buttons) to skip / see more like it - the signal
 * trains the feed (useCockpit.recordDeckReaction). Honest by construction: a
 * card only carries a number when its source has one.
 */
interface CockpitDeckProps {
  cards: DeckCard[];
  onReact?: (card: DeckCard, reaction: 'like' | 'dislike') => void;
  onOpen?: (card: DeckCard) => void;
  animated?: boolean;
}

export function CockpitDeck({ cards, onReact, onOpen, animated = true }: CockpitDeckProps) {
  const [index, setIndex] = useState(0);
  const card = cards[index];

  const advance = (reaction: 'like' | 'dislike') => {
    if (card) onReact?.(card, reaction);
    setIndex((i) => i + 1);
  };
  const onDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.x < -90) advance('dislike');
    else if (info.offset.x > 90) advance('like');
  };

  // caught up: every card seen - a calm, honest end (no manufactured urgency)
  if (cards.length === 0 || index >= cards.length) {
    return (
      <div className="rounded-[18px] border border-border bg-card/50 p-6 text-center">
        <p className="text-balance text-sm leading-relaxed text-foreground">
          {cards.length === 0
            ? 'Nothing in your deck yet. As CTRL reads the market and your world, the things worth your attention land here.'
            : "That's everything worth a look today."}
        </p>
        <p className="mt-1.5 text-[11.5px] text-muted-foreground">Nothing is on fire.</p>
      </div>
    );
  }

  return (
    <div>
      {/* the focused headline card, with the deck peeking behind it */}
      <div className="relative h-[340px]">
        {/* the stack peeking behind, so it reads as a deck of a few */}
        {index + 2 < cards.length && (
          <div className="absolute inset-x-5 top-6 h-[316px] rounded-[18px] border border-border bg-[#0b0f14] opacity-45" />
        )}
        {index + 1 < cards.length && (
          <div className="absolute inset-x-2.5 top-3 h-[324px] rounded-[18px] border border-border bg-[#0b0f14] opacity-70" />
        )}
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={card.id}
            drag="x"
            dragSnapToOrigin
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragEnd={onDragEnd}
            initial={animated ? { opacity: 0, scale: 0.97 } : false}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-0 cursor-grab active:cursor-grabbing"
          >
            <NewsHeadlineCard card={card} variant="feed" focused onOpen={onOpen} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* controls: skip / like (the like trains the feed) */}
      <div className="mt-3 flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => advance('dislike')}
          aria-label="Skip"
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border border-border bg-[#0c1116] text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="flex-1 text-center text-[10.5px] leading-tight text-muted-foreground">
          swipe to skip &middot; tap the heart to see more like it
        </span>
        <button
          type="button"
          onClick={() => advance('like')}
          aria-label="More like this"
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/[0.08] text-accent transition-colors hover:bg-accent/15"
        >
          <Heart className="h-5 w-5 fill-current" />
        </button>
      </div>

      {/* progress dots */}
      <div className="mt-3 flex justify-center gap-1.5">
        {cards.map((c, i) => (
          <span
            key={c.id}
            className={cn(
              'h-[5px] rounded-full transition-all',
              i === index ? 'w-4 bg-accent' : 'w-[5px] bg-muted',
            )}
          />
        ))}
      </div>
    </div>
  );
}
