import { motion } from 'framer-motion';
import { Play, Scale, Zap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CockpitData, DeckCard } from '@/types/cockpit';
import { CockpitDeck } from './CockpitDeck';

/**
 * CockpitHome - the redesigned mobile home (locked 2026-06-17, design-log).
 *
 * Home greets the leader plainly, then leads with the "worth a look" DECK (a
 * swipeable mix of broad AI news + their own signals), then the three value
 * actions (play briefing / run a decision / build a skill). The cryptic
 * "strongest signal" hero and the wall of identical bets are gone; bets live in
 * the Decisions tab. Plain language throughout; no data-collection on Home.
 */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning.';
  if (h < 18) return 'Good afternoon.';
  return 'Good evening.';
}

interface ActionCardProps {
  icon: typeof Play;
  title: string;
  desc: string;
  primary?: boolean;
  meta?: string;
  onClick: () => void;
}

function ActionCard({ icon: Icon, title, desc, primary, meta, onClick }: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-[15px] border p-[13px_14px] text-left transition-colors',
        primary
          ? 'border-accent/30 bg-[linear-gradient(180deg,#0c1a17,#0a1311)] hover:bg-accent/[0.06]'
          : 'border-border bg-card hover:bg-secondary/30',
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]',
          primary
            ? 'bg-accent text-accent-foreground shadow-[0_0_18px_-4px_#00d9b699]'
            : 'border border-accent/30 bg-accent/[0.08] text-accent',
        )}
      >
        <Icon className={cn('h-5 w-5', primary && 'fill-current')} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold leading-tight tracking-[-0.01em] text-foreground">{title}</span>
        <span className="mt-0.5 block text-balance text-[11.5px] leading-snug text-muted-foreground">{desc}</span>
        {meta && (
          <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-semibold text-accent/90">{meta}</span>
        )}
      </span>
      {!primary && <ArrowRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/60" />}
    </button>
  );
}

interface CockpitHomeProps {
  data: CockpitData;
  onPlayBriefing: () => void;
  onGoDecide: () => void;
  onBuildSkill: () => void;
  onOpenBet: (id: string) => void;
  onReactDeck?: (card: DeckCard, reaction: 'like' | 'dislike') => void;
  animated?: boolean;
}

export function CockpitHome({
  data,
  onPlayBriefing,
  onGoDecide,
  onBuildSkill,
  onOpenBet,
  onReactDeck,
  animated = true,
}: CockpitHomeProps) {
  // First-timer language: an empty deck means a brand-new leader, so the
  // greeting subline welcomes plainly instead of assuming a daily habit.
  const isColdStart = data.deck.length === 0;

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      // Fit-to-viewport: a flex column that fills the frame with no page scroll.
      // The deck is the ONE primary read; the value actions sit calm beneath it
      // and share the leftover space.
      className="flex h-full min-h-0 flex-col gap-3.5"
    >
      {/* greeting - plain and warm; welcomes a first-timer, greets the regular */}
      <div className="shrink-0 px-0.5">
        <h1 className="text-[21px] font-bold leading-tight tracking-[-0.02em] text-foreground">{greeting()}</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          {isColdStart
            ? 'Welcome to CTRL. This is home for your AI-native business.'
            : "Here is what's worth a look in your AI-native world today."}
        </p>
      </div>

      {/* THE DECK - the one primary read: a swipeable mix of AI news + your signals */}
      <div className="shrink-0">
        <CockpitDeck
          cards={data.deck}
          onReact={onReactDeck}
          onOpen={(c) => c.betId && onOpenBet(c.betId)}
          animated={animated}
        />
      </div>

      {/* THE VALUE ACTIONS - calm and few, secondary to the read above. They take
          the leftover space so the whole home fits the viewport with no scroll. */}
      <div className="flex min-h-0 flex-1 flex-col justify-end">
        <div className="mb-2 px-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Or pick up where you build
        </div>
        <div className="space-y-2">
          <ActionCard
            primary
            icon={Play}
            title="Play my briefing"
            desc="The AI world, read to you. Today in about 4 minutes."
            meta="4 min · in your ear"
            onClick={onPlayBriefing}
          />
          <ActionCard
            icon={Scale}
            title="Weigh a decision"
            desc="Bring something you are weighing. CTRL frames the AI-native call and shows where it holds and where it breaks."
            onClick={onGoDecide}
          />
          <ActionCard
            icon={Zap}
            title="Build a skill"
            desc="Turn something you do every week into an agent that does it for you."
            onClick={onBuildSkill}
          />
        </div>
      </div>
    </motion.div>
  );
}
