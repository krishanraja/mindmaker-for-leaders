import { useState } from 'react';
import { motion } from 'framer-motion';
import { ListOrdered, Scale, Boxes, ChevronRight, ChevronLeft } from 'lucide-react';
import type { CockpitData, DeckCard } from '@/types/cockpit';
import { CategoryMotif } from './CategoryMotif';
import { CockpitHero } from './CockpitHero';
import { CockpitStreamRow } from './CockpitStreamRow';
import { resolveNewsCategory } from '@/types/newsCategory';

/**
 * CockpitHome - the chief-of-staff ONE-THING home (rebuilt 2026-06-21 per
 * prototypes/home-chief-of-staff.html; replaces the swipe-deck home).
 *
 * A warm greeting + a single framing line, then ONE hero (the top of the
 * useCockpit ranked stream) given the focus zone, a SMALL secondary peek of the
 * NEXT stream item, and a thin footer rail of quiet doors (Briefing / Weigh /
 * Build). Tapping the peek opens the rest of the SAME ranked stream IN PLACE
 * (the hero recedes; the stream slides up inside the same focus zone), with a
 * "Back to the one thing".
 *
 * THE BUG FIX (deck overlap): this is ONE composed frame. CockpitView owns a CSS
 * grid (header / focus / footer rail / nav); CockpitHome fills the focus + rail
 * rows as a flex column. The hero/peek and the rail live in their own zones with
 * min-h-0 + overflow-hidden, so the hero can never blow past the viewport width
 * or collide with the footer. Nothing is absolutely positioned over a sibling.
 */

interface DoorProps {
  icon: typeof Scale;
  label: string;
  sub: string;
  wide?: boolean;
  onClick: () => void;
}

function Door({ icon: Icon, label, sub, wide, onClick }: DoorProps) {
  if (wide) {
    // desktop: each door is a bordered card, icon left of a stacked label
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 items-center gap-3 rounded-[14px] border border-border bg-[linear-gradient(180deg,#0f141c,#0b0f15)] px-4 py-3.5 text-muted-foreground transition-colors hover:border-accent/30 hover:text-foreground"
      >
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.7} />
        <span className="flex flex-col items-start gap-px">
          <span className="text-[12.5px] font-semibold leading-none">{label}</span>
          <span className="text-[10px] leading-none text-[#566070]">{sub}</span>
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-1.5 px-1 py-2 text-muted-foreground transition-colors hover:text-foreground"
    >
      <Icon className="h-[19px] w-[19px]" strokeWidth={1.7} />
      <span className="text-[10px] font-semibold leading-none tracking-[0.01em]">{label}</span>
      <span className="text-[8.5px] font-medium leading-none tracking-[0.02em] text-[#566070]">{sub}</span>
    </button>
  );
}

interface CockpitHomeProps {
  data: CockpitData;
  greeting: string; // "Good morning, Krish."
  framing: string; // "The one thing I'd put in front of you today:"
  onPlayBriefing: () => void;
  onGoDecide: () => void;
  onBuildSkill: () => void;
  onOpenBet: (id: string) => void;
  onReactDeck?: (card: DeckCard, reaction: 'like' | 'dislike') => void;
  animated?: boolean;
  /** desktop composition: a wider hero + horizontal door cards (same one-thing). */
  wide?: boolean;
}

export function CockpitHome({
  data,
  greeting,
  framing,
  onPlayBriefing,
  onGoDecide,
  onBuildSkill,
  onOpenBet,
  onReactDeck,
  animated = true,
  wide = false,
}: CockpitHomeProps) {
  // the in-place "rest of what I'm tracking" reveal (no new block appended; the
  // focus zone swaps the hero+peek for the stream).
  const [open, setOpen] = useState(false);

  const hero = data.deck[0] ?? null;
  const rest = data.deck.slice(1); // the rest of the same ranked stream
  const next = rest[0] ?? null; // the small secondary peek target

  const openItem = (c: DeckCard) => {
    if (c.betId) onOpenBet(c.betId);
  };

  // cold start: an empty deck means a brand-new leader. Keep it warm and honest;
  // no manufactured hero.
  if (!hero) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 px-0.5">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-foreground">{greeting}</h1>
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
            Welcome to CTRL. This is home for your AI-native business. As I read the market and your
            world, the one thing worth your attention lands right here.
          </p>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center px-2">
          <p className="text-balance text-center text-sm leading-relaxed text-muted-foreground">
            Nothing is on fire. Pressure-test a decision or build a skill below, and your first
            signal will land here.
          </p>
        </div>
        <FooterRail wide={wide} onPlayBriefing={onPlayBriefing} onGoDecide={onGoDecide} onBuildSkill={onBuildSkill} />
      </div>
    );
  }

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex h-full min-h-0 flex-col"
    >
      {/* HEADER ZONE: the warm greeting + the single framing line */}
      <div className="shrink-0 px-0.5">
        <h1 className={wide ? 'text-[27px] font-extrabold leading-[1.1] tracking-[-0.025em] text-foreground' : 'text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-foreground'}>
          {greeting}
        </h1>
        <p className={wide ? 'mt-2.5 max-w-[60ch] text-[14px] leading-relaxed text-muted-foreground' : 'mt-1 text-[13px] leading-snug text-muted-foreground'}>
          {framing}
        </p>
      </div>

      {/* THE ONE FOCUS ZONE: holds the hero + peek, OR the opened stream. Never
          both. min-h-0 + overflow-hidden so it never spills onto the rail. */}
      <div className="mt-3.5 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {open ? (
          <CockpitStream rest={rest} hero={hero} onOpen={openItem} onClose={() => setOpen(false)} />
        ) : (
          <>
            <CockpitHero card={hero} variant={wide ? 'lead' : 'feed'} onOpen={openItem} onReact={onReactDeck} />
            {next && <CockpitPeek next={next} count={rest.length} onOpen={() => setOpen(true)} />}
          </>
        )}
      </div>

      {/* THE ACTION FOOTER RAIL: quiet doors. Its own row; can never collide. */}
      <FooterRail wide={wide} onPlayBriefing={onPlayBriefing} onGoDecide={onGoDecide} onBuildSkill={onBuildSkill} />
    </motion.div>
  );
}

function FooterRail({
  wide,
  onPlayBriefing,
  onGoDecide,
  onBuildSkill,
}: Pick<CockpitHomeProps, 'onPlayBriefing' | 'onGoDecide' | 'onBuildSkill'> & { wide?: boolean }) {
  return (
    <div
      className={
        wide
          ? 'mt-4 flex shrink-0 items-stretch gap-2.5'
          : 'mt-2 flex shrink-0 items-stretch border-t border-white/[0.05] pt-2'
      }
    >
      <Door wide={wide} icon={ListOrdered} label="Briefing" sub="today's read" onClick={onPlayBriefing} />
      <Door wide={wide} icon={Scale} label="Weigh" sub="a decision" onClick={onGoDecide} />
      <Door wide={wide} icon={Boxes} label="Build" sub="a skill" onClick={onBuildSkill} />
    </div>
  );
}

// The small secondary peek of the NEXT item: a dimmed motif tile + a faint
// "NEXT" label + one truncated headline, then the "N more" count as the door.
// Deliberately SECONDARY: smaller, lower-contrast, shorter than the hero.
interface CockpitPeekProps {
  next: DeckCard;
  count: number;
  onOpen: () => void;
}

function CockpitPeek({ next, count, onOpen }: CockpitPeekProps) {
  const categoryId = resolveNewsCategory(next.category, `${next.headline} ${next.say ?? ''}`);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-2 flex w-full shrink-0 items-center gap-[11px] border-t border-white/[0.05] pt-2.5 text-left text-muted-foreground opacity-[0.82] transition-opacity hover:opacity-100"
    >
      <span className="ctrl-motif-band relative h-10 w-10 flex-none overflow-hidden rounded-[10px] border border-border opacity-[0.62]">
        <CategoryMotif category={categoryId} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-gobold text-[8px] uppercase tracking-[0.09em] text-[#5b6573]">Next</span>
        <span className="truncate text-[12px] font-semibold leading-[1.25] text-[#9aa3b1]">{next.headline}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold">
        <span className="font-extrabold text-accent">{count}</span> more
        <ChevronRight className="h-[15px] w-[15px]" />
      </span>
    </button>
  );
}

// The in-place reveal: the hero recedes to a quiet recap chip, and the rest of
// the SAME ranked stream slides up as a scrollable column. Lives inside the
// focus zone, so it can never overlap the footer rail or nav.
interface CockpitStreamProps {
  rest: DeckCard[];
  hero: DeckCard;
  onOpen: (card: DeckCard) => void;
  onClose: () => void;
}

function CockpitStream({ rest, hero, onOpen, onClose }: CockpitStreamProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2.5 pb-3">
        <span className="font-gobold text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          The rest of what I&apos;m tracking
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] font-bold text-accent"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
          Back to the one thing
        </button>
      </div>
      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-2">
        {/* the hero, recapped as a quiet "now showing" chip */}
        <div className="flex shrink-0 items-center gap-2.5 rounded-[13px] border border-accent/30 bg-accent/10 px-3 py-2.5">
          <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-accent shadow-[0_0_9px_hsl(var(--accent))]" />
          <span className="text-[11.5px] leading-[1.35] text-[#cfe9e2]">
            <b className="font-bold text-foreground">Now showing:</b> {hero.headline}
          </span>
        </div>
        {rest.map((c, i) => (
          <CockpitStreamRow key={c.id} card={c} index={i} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}
