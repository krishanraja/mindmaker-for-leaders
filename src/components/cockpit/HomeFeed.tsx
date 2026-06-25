// HomeFeed - the unified 2028 Home: browsable industry headlines + the three
// doors (Briefing / Weigh / Build), device-native, session-adaptive.
//
// THE design (prototypes/home-2028.html, founder-approved; CTRL-SYSTEM-SPEC s0,1,2,6):
//   ONE information model on both bodies:
//     - a browsable "worth a look" set of headline cards (NEVER a single
//       committed hero; NEVER empty - the cold deck renders for fresh leaders)
//     - the three doors, in a FIXED reserved place above the nav (mobile) /
//       pinned (desktop), that can never clip behind the bottom nav
//   rendered device-native:
//     - MOBILE = a thumb-first SWIPE feed (one card in focus + a peek + a dot
//       indicator), inside MobileFrame's bounded no-scroll <main>
//     - DESKTOP = a calm horizontal RAIL (a wide lead card + tiles + prev/next),
//       inside DesktopShell
//   session-adaptive INSIDE a stable shell (the shell never moves):
//     - cold  : generic headlines + a one-line chief-of-staff orientation
//     - warm  : personalized, own signals woven in
//     - rich  : denser triage (a "what moved" strip)
//   loading: an in-shell branded skeleton (SkeletonCard / LoadingCaption), never
//   a raw spinner.
//
// The card body reuses CockpitHero (the shared headline-card primitive) so Home,
// the rail tiles and the swipe feed are byte-for-byte the same instrument.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronUp, Sparkles } from 'lucide-react';
import type { CockpitData, DeckCard, HomeState } from '@/types/cockpit';
import { CockpitHero } from './CockpitHero';
import { CategoryMotif } from './CategoryMotif';
import { TuneFeedButton } from './TuneFeedButton';
import { GlobeLoader } from '@/components/system/GlobeLoader';
import { resolveNewsCategory } from '@/types/newsCategory';
import { usePinnedDecision } from '@/hooks/usePinnedDecision';
import { cn } from '@/lib/utils';

// Quiet "relevant to your pinned decision" test for a news card. Signals (own
// decisions) are never flagged - they already lead with "Your decision".
function useDeckRelevance() {
  const { matchesHeadline } = usePinnedDecision();
  return (card: DeckCard) => card.kind !== 'signal' && matchesHeadline(card.headline);
}

export interface HomeFeedProps {
  data: CockpitData;
  loading: boolean;
  greeting: string; // "Good morning, Krish."
  onOpenCard: (card: DeckCard) => void;
  onReactDeck?: (card: DeckCard, reaction: 'like' | 'dislike') => void;
  /** desktop = the spacious rail; mobile = the swipe feed. */
  variant: 'mobile' | 'desktop';
}

// The one-line chief-of-staff orientation per state. Warm, advisory, AI-native,
// never empty, no em dashes. The shell does not move between states; only this
// line + the deck contents change.
function framingFor(state: HomeState): string {
  switch (state) {
    case 'cold':
      return 'The AI-native moves worth your attention, curated. Browse from the top, and teach me what matters.';
    case 'rich':
      return "Today's AI-native headlines, curated and ranked for you. Browse from the top.";
    case 'warm':
    default:
      return 'Curated to what you are building - the AI-native headlines that matter to you.';
  }
}

export function HomeFeed(props: HomeFeedProps) {
  return props.variant === 'desktop' ? <DesktopHome {...props} /> : <MobileHome {...props} />;
}

// The profile-gate "unlock" prompt: shown in the feed zone when the brain is
// below the minimum (vertical + role + a few interests) and the gate is enabled
// server-side. Warm, first-person, never a scold; leads with one clear action.
const GATE_LABELS: Record<string, string> = {
  vertical: 'your industry',
  role: 'your role',
  interests: 'a few interests',
};
function ProfileGateCard({ missing, variant }: { missing?: string[]; variant: 'mobile' | 'desktop' }) {
  const navigate = useNavigate();
  const items = (missing && missing.length ? missing : ['vertical', 'role', 'interests']).map((m) => GATE_LABELS[m] ?? m);
  const list = items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0];
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <div className={cn('w-full rounded-2xl border border-accent/25 bg-[linear-gradient(180deg,#101620,#0a0e12)] p-6 text-center', variant === 'desktop' && 'max-w-md')}>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/12 text-accent">
          <Sparkles className="h-5 w-5" />
        </span>
        <h2 className="mt-3 text-[18px] font-extrabold tracking-tight text-foreground">Let me get to know you first</h2>
        <p className="mx-auto mt-2 max-w-[42ch] text-pretty text-[13px] leading-relaxed text-muted-foreground">
          I curate the AI-native news that actually matters to your business. To do that well I need {list}.
        </p>
        <button
          type="button"
          onClick={() => navigate('/memory')}
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-[13px] font-bold text-accent-foreground transition hover:brightness-110"
        >
          Complete your brain
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   MOBILE - the thumb-first swipe feed
   ============================================================ */
function MobileHome({
  data,
  loading,
  greeting,
  onOpenCard,
  onReactDeck,
}: HomeFeedProps) {
  const deck = data.deck;
  const [idx, setIdx] = useState(0);
  // one-time "swipe up" hint: shown until the leader makes their first vertical
  // move, so the gesture is taught once and never nags.
  const [hasSwiped, setHasSwiped] = useState(false);
  const reduceMotion = useReducedMotion();

  // clamp the focus index whenever the deck shrinks (e.g. data arrives).
  useEffect(() => {
    setIdx((i) => Math.min(i, Math.max(0, deck.length - 1)));
  }, [deck.length]);

  const go = useCallback(
    (n: number) => {
      setHasSwiped(true);
      setIdx((_) => Math.max(0, Math.min(deck.length - 1, n)));
    },
    [deck.length],
  );

  // swipe / drag / wheel to move through the feed (the gestural mobile model).
  const startY = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    const dy = e.changedTouches[0].clientY - startY.current;
    if (dy < -32) go(idx + 1);
    else if (dy > 32) go(idx - 1);
    startY.current = null;
  };
  const wheelLock = useRef(0);
  const onWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - wheelLock.current < 380) return;
    if (Math.abs(e.deltaY) < 14) return;
    wheelLock.current = now;
    if (e.deltaY > 0) go(idx + 1);
    else go(idx - 1);
  };

  const relevant = useDeckRelevance();

  // the hint only earns its place when there is somewhere to swipe to.
  const showSwipeHint = !loading && !hasSwiped && deck.length > 1 && idx < deck.length - 1;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* GREET + state-aware orientation (the shell stays put across states).
          The tune-feed control now lives in the top bar with the other chrome. */}
      <div className="flex shrink-0 flex-col gap-1 px-0.5">
        <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-foreground">{greeting}</h1>
        <p className="text-pretty text-[12.5px] leading-snug text-muted-foreground">
          {loading ? 'Reading the market and your world.' : framingFor(data.homeState)}
        </p>
      </div>

      {/* THE FEED - the one browsable zone. min-h-0 + overflow-hidden so the cards
          never spill onto the doors/nav (the live clip bug fix). A VERTICAL
          progress rail + a one-time "swipe up" hint make the vertical gesture
          unmistakable (the dots used to imply a sideways swipe). */}
      <div
        className="relative mt-3 flex min-h-0 flex-1 flex-col overflow-hidden pr-3.5"
        onTouchStart={loading ? undefined : onTouchStart}
        onTouchEnd={loading ? undefined : onTouchEnd}
        onWheel={loading ? undefined : onWheel}
      >
        {loading ? (
          <GlobeLoader caption="Reading the market and your world" />
        ) : data.needsProfile ? (
          <ProfileGateCard missing={data.missingProfile} variant="mobile" />
        ) : (
          <>
            <MobileSwipeTrack
              deck={deck}
              idx={idx}
              reduceMotion={!!reduceMotion}
              onFocus={go}
              onOpen={onOpenCard}
              onReact={onReactDeck}
              relevant={relevant}
            />
            {/* vertical segmented progress rail, pinned to the right edge */}
            {deck.length > 1 && (
              <div className="pointer-events-none absolute right-0 top-1/2 z-[4] flex -translate-y-1/2 flex-col items-center gap-1.5">
                {deck.map((c, i) => (
                  <span
                    key={c.id}
                    className={cn(
                      'w-[5px] rounded-full transition-all duration-300',
                      i === idx ? 'h-[18px] bg-accent shadow-[0_0_8px_hsl(var(--accent)/0.5)]' : 'h-[5px] bg-muted',
                    )}
                  />
                ))}
              </div>
            )}
            {/* one-time swipe-up affordance, fades after the first move */}
            {showSwipeHint && (
              <motion.div
                key="swipe-hint"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={
                  reduceMotion
                    ? { opacity: 0.9 }
                    : { opacity: [0.35, 0.95, 0.35], y: [4, -4, 4] }
                }
                exit={{ opacity: 0 }}
                transition={reduceMotion ? { duration: 0.3 } : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="pointer-events-none absolute inset-x-0 bottom-1 z-[4] flex justify-center"
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-background/85 px-2.5 py-1 text-[10.5px] font-semibold text-accent backdrop-blur-sm">
                  <ChevronUp className="h-3 w-3" strokeWidth={2.4} />
                  Swipe up for more
                </span>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// The swipe track: one card commands the view, the next peeks under it. The
// whole track translates so the focused card sits at the top of the zone.
interface MobileSwipeTrackProps {
  deck: DeckCard[];
  idx: number;
  reduceMotion: boolean;
  onFocus: (n: number) => void;
  onOpen: (card: DeckCard) => void;
  onReact?: (card: DeckCard, reaction: 'like' | 'dislike') => void;
  relevant: (card: DeckCard) => boolean;
}

function MobileSwipeTrack({ deck, idx, reduceMotion, onFocus, onOpen, onReact, relevant }: MobileSwipeTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  // position the focused card at the top of the bounded zone.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const cards = track.children;
    const el = cards[idx] as HTMLElement | undefined;
    if (!el) return;
    setOffset(-Math.max(0, el.offsetTop - 2));
  }, [idx, deck]);

  return (
    <>
      <div
        ref={trackRef}
        className="flex flex-col gap-3.5 will-change-transform"
        style={{
          transform: `translateY(${offset}px)`,
          transition: reduceMotion ? 'none' : 'transform .46s cubic-bezier(.22,1,.36,1)',
        }}
      >
        {deck.map((card, i) => {
          const focused = i === idx;
          return (
            <div
              key={card.id}
              onClick={() => { if (!focused) onFocus(i); }}
              className={cn(
                'flex shrink-0 flex-col origin-top transition-[opacity,transform] duration-300',
                // peeks stay clearly legible (a visible deck below), just secondary.
                focused ? '' : 'scale-[0.97] opacity-[0.72]',
              )}
              style={{ minHeight: focused ? '0' : undefined }}
            >
              {focused ? (
                <CockpitHero card={card} variant="feed" onOpen={onOpen} onReact={onReact} relevantToPinnedDecision={relevant(card)} />
              ) : (
                <PeekCard card={card} />
              )}
            </div>
          );
        })}
      </div>
      {/* soft fade at the bottom of the feed zone */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-[26px] bg-gradient-to-t from-background to-transparent" />
    </>
  );
}

// A non-focused peek card: the headline-card shell, dimmed, just the motif band +
// chip + headline (no body), so the next item is legible but clearly secondary.
function PeekCard({ card }: { card: DeckCard }) {
  const categoryId = resolveNewsCategory(card.category, `${card.headline} ${card.say ?? ''}`);
  return (
    <article className="overflow-hidden rounded-[18px] border border-border bg-[linear-gradient(180deg,#101620_0%,#0a0e12_100%)]">
      <div className="ctrl-motif-band relative h-[92px]">
        <CategoryMotif category={categoryId} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[40px]" style={{ background: 'linear-gradient(transparent, #0d121a)' }} />
      </div>
      <div className="p-[13px_16px_14px]">
        <h3 className="line-clamp-2 text-balance text-[15px] font-bold leading-[1.22] tracking-[-0.01em] text-foreground">
          {card.headline}
        </h3>
      </div>
    </article>
  );
}

/* ============================================================
   DESKTOP - the calm horizontal rail
   ============================================================ */
function DesktopHome({
  data,
  loading,
  greeting,
  onOpenCard,
  onReactDeck,
}: HomeFeedProps) {
  const deck = data.deck;
  const railRef = useRef<HTMLDivElement>(null);
  const relevant = useDeckRelevance();
  const scrollBy = (dx: number) => railRef.current?.scrollBy({ left: dx, behavior: 'smooth' });

  const railLabel = loading
    ? 'Reading the market and your world'
    : data.homeState === 'rich'
      ? 'What moved'
      : 'Worth a look today';

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* GREET + state-aware orientation */}
      <div className="flex shrink-0 items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground">{greeting}</h1>
          <p className="mt-2 max-w-[60ch] text-pretty text-[14px] leading-relaxed text-muted-foreground">
            {loading ? 'Reading the market and your world.' : framingFor(data.homeState)}
          </p>
        </div>
        <TuneFeedButton />
      </div>

      {/* rich-only strip: a quiet "curated to you" reassurance (news feed, no
          decision dialogue) */}
      {!loading && data.homeState === 'rich' && (
        <div className="mt-4 flex shrink-0 flex-wrap gap-2.5">
          <Chip own>Curated to your priorities</Chip>
          <Chip>Ranked by what matters to you</Chip>
        </div>
      )}

      {/* rail label + prev/next */}
      <div className="mt-5 flex shrink-0 items-center justify-between">
        <span className="font-gobold text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{railLabel}</span>
        {!loading && (
          <div className="flex gap-2">
            <RailBtn onClick={() => scrollBy(-360)} aria-label="Previous"><ChevronLeft className="h-4 w-4" strokeWidth={2.2} /></RailBtn>
            <RailBtn onClick={() => scrollBy(360)} aria-label="Next"><ChevronRight className="h-4 w-4" strokeWidth={2.2} /></RailBtn>
          </div>
        )}
      </div>

      {/* THE RAIL - the one browsable zone. min-h-0 so the doors keep their place. */}
      <div className="relative mt-3.5 flex min-h-0 flex-1 flex-col">
        {loading ? (
          <GlobeLoader caption="Reading the market and your world" />
        ) : data.needsProfile ? (
          <ProfileGateCard missing={data.missingProfile} variant="desktop" />
        ) : (
          <>
            <div
              ref={railRef}
              className="scrollbar-hide flex min-h-0 flex-1 gap-[18px] overflow-x-auto overflow-y-hidden pb-1"
            >
              {deck.map((card, i) => (
                <div key={card.id} className={cn('flex flex-col', i === 0 ? 'w-[480px] shrink-0' : 'w-[330px] shrink-0')}>
                  <CockpitHero card={card} variant={i === 0 ? 'lead' : 'feed'} onOpen={onOpenCard} onReact={i === 0 ? onReactDeck : undefined} relevantToPinnedDecision={relevant(card)} />
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-[60px] bg-gradient-to-l from-background to-transparent" />
          </>
        )}
      </div>
    </div>
  );
}

function Chip({ children, own }: { children: React.ReactNode; own?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-[11px] font-semibold text-[#aeb6c2]">
      <span className={cn('h-1.5 w-1.5 rounded-full', own ? 'bg-accent shadow-[0_0_7px_hsl(var(--accent))]' : 'bg-muted-foreground')} />
      {children}
    </span>
  );
}

function RailBtn({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-border bg-card/60 text-muted-foreground transition-colors hover:border-accent/30 hover:text-foreground"
    >
      {children}
    </button>
  );
}

