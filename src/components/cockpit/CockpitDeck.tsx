import { useState } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { X, Heart, ArrowRight, GitFork, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DeckCard } from '@/types/cockpit';
import { HeroSparkline } from './HeroSparkline';

/**
 * CockpitDeck - the Home "worth a look" deck (locked 2026-06-17, design-log).
 *
 * A small stack of cards the leader swipes through: a MIX of broad AI news
 * (from the briefing pipeline) and their own signals (a decision moved). Plain
 * language; swipe (or tap the buttons) to skip / see more like it - the signal
 * trains the feed. Replaces the cryptic single hero. Honest by construction:
 * a card only carries a number when its source has one.
 */
interface CockpitDeckProps {
  cards: DeckCard[];
  onReact?: (card: DeckCard, reaction: 'like' | 'dislike') => void;
  onOpen?: (card: DeckCard) => void;
  animated?: boolean;
}

function CardFace({ card, onOpen }: { card: DeckCard; onOpen?: (c: DeckCard) => void }) {
  const isNews = card.kind === 'news';
  return (
    <button
      type="button"
      onClick={() => onOpen?.(card)}
      className="flex h-full w-full flex-col rounded-[18px] border border-accent/25 bg-[linear-gradient(180deg,#101720,#0a0e12)] p-4 text-left shadow-[0_22px_44px_-20px_#000]"
    >
      {/* eyebrow: kind + optional category tag */}
      <div className="mb-3 flex items-center gap-[7px] text-[9px] font-semibold uppercase tracking-[0.06em] text-accent/80">
        <span>&#9679; {card.eyebrow}</span>
        {card.category && (
          <span className="rounded-[5px] border border-border px-[6px] py-px text-[8px] tracking-[0.1em] text-muted-foreground">
            {card.category}
          </span>
        )}
      </div>

      {/* the small in-style visual: a sparkline for news, a glyph for own-signals */}
      {isNews ? (
        <HeroSparkline className="mb-3 block h-[46px] w-full" tone="signal" series={null} />
      ) : (
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-accent/30 bg-accent/[0.08] text-accent">
            <GitFork className="h-[18px] w-[18px] rotate-180" />
          </span>
          {card.magnitude && (
            <span className="text-[22px] font-bold tracking-[-0.02em] text-foreground">{card.magnitude.value}</span>
          )}
        </div>
      )}

      <h2 className="m-0 text-balance text-[19px] font-bold leading-[1.18] tracking-[-0.02em] text-foreground">
        {card.headline}
      </h2>
      {card.say && (
        <p className="mt-[7px] line-clamp-2 text-[13px] leading-[1.42] text-muted-foreground">{card.say}</p>
      )}

      <span className="mt-auto pt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent/90">
        {isNews ? <Newspaper className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
        {isNews ? 'why this matters to you' : 'open the read'}
      </span>
    </button>
  );
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
          {cards.length === 0 ? 'Your deck fills as CTRL watches your world and the market.' : "That's everything worth a look today."}
        </p>
        <p className="mt-1.5 text-[11.5px] text-muted-foreground">Nothing is on fire.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-[248px]">
        {/* the stack peeking behind, so it reads as a deck of a few */}
        {index + 2 < cards.length && (
          <div className="absolute inset-x-5 top-6 h-[218px] rounded-[18px] border border-border bg-[#0b0f14] opacity-45" />
        )}
        {index + 1 < cards.length && (
          <div className="absolute inset-x-2.5 top-3 h-[224px] rounded-[18px] border border-border bg-[#0b0f14] opacity-70" />
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
            className="absolute inset-x-0 top-0 h-[230px] cursor-grab active:cursor-grabbing"
          >
            <CardFace card={card} onOpen={onOpen} />
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
