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

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import type { CockpitData, DeckCard, HomeState, UserPosture } from '@/types/cockpit';
import { CockpitHero } from './CockpitHero';
import { CardReadSheet } from './CardReadSheet';
import { KickstartCard } from './KickstartCard';
import { TrendCard } from './TrendCard';
import { CategoryMotif } from './CategoryMotif';
import { TuneFeedButton } from './TuneFeedButton';
import { InlineProfileSetup } from './onboarding/InlineProfileSetup';
import { GlobeLoader } from '@/components/system/GlobeLoader';
import { SkeletonCard } from '@/components/system/SkeletonCard';
import { isHomeReady } from '@/lib/bootGate';
import { resolveNewsCategory } from '@/types/newsCategory';
import { usePinnedDecision } from '@/hooks/usePinnedDecision';
import { useCapabilitySignals } from '@/hooks/useCapabilitySignals';
import { applyNextMoveToKickstart } from '@/lib/capabilityLadder';
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
  /** Route into the decision weigher with a prefill (the read sheet's Weigh it). */
  onWeighCard?: (prefill: string) => void;
  /** Re-pull the cockpit after the inline onboarding saves (clears the gate). */
  onProfileComplete?: () => void;
  /** desktop = the spacious rail; mobile = the swipe feed. */
  variant: 'mobile' | 'desktop';
}

// One-time dismissal so a NEW leader who chose "Browse first" isn't re-prompted
// every load this session. A real server gate (needsProfile) ignores this.
const INLINE_ONBOARD_DISMISS_KEY = 'ctrl:inline_onboard_dismissed_v1';

function useInlineOnboarding(data: CockpitData) {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return window.localStorage.getItem(INLINE_ONBOARD_DISMISS_KEY) === '1'; } catch { return false; }
  });
  const gated = !!data.needsProfile;
  // Show for the server gate (forced) OR a brand-new leader (invited, skippable).
  const show = gated || (data.userState === 'new' && !dismissed);
  const dismiss = useCallback(() => {
    setDismissed(true);
    try { window.localStorage.setItem(INLINE_ONBOARD_DISMISS_KEY, '1'); } catch { /* ignore */ }
  }, []);
  return { show, gated, dismiss };
}

// The one-line chief-of-staff orientation. Warm, advisory, AI-native, never
// empty, no em dashes. It adapts to BOTH posture (guide vs partner) and the
// DEVICE CONTEXT the leader is in: mobile is on-the-go (a quick read, fast
// triage), desktop is deep work (room to think a decision through). The shell
// never moves; only this line + the deck contents change.
function framingFor(state: HomeState, posture: UserPosture, variant: 'mobile' | 'desktop'): string {
  if (posture === 'guide') {
    return variant === 'mobile'
      ? "A quick read on what's moving in AI, plus one call worth weighing. Start at the top."
      : "Here's what's moving in AI, and a decision worth thinking through properly. Let's get into it.";
  }
  // partner
  switch (state) {
    case 'rich':
      return variant === 'mobile'
        ? 'The few AI-native moves worth a glance right now. Swipe to triage.'
        : "Today's AI-native headlines, ranked for you, with room to dig into what matters.";
    case 'warm':
    default:
      return variant === 'mobile'
        ? 'Curated to what you are building. A fast read for on the move.'
        : 'Curated to what you are building - the AI-native headlines that matter, with space to go deep.';
  }
}

export function HomeFeed(props: HomeFeedProps) {
  // The kickstart slot doubles as the ladder's "next move": when the one
  // behaviour that compounds lives somewhere other than the weigher (check
  // facts, teach your voice, put context to work), the card carries it there.
  // Cached + shared query; on any miss the deck renders exactly as before.
  const { capability } = useCapabilitySignals();
  const data = useMemo(() => {
    const deck = applyNextMoveToKickstart(props.data.deck, capability);
    return deck === props.data.deck ? props.data : { ...props.data, deck, capabilityStage: capability?.stage };
  }, [props.data, capability]);

  // THE READ LAYER: a news OR trend card opens the in-app read sheet (full
  // summary, the Take/evidence, benchmark, the for-you read) instead of bouncing
  // straight out. Kickstart/signal cards keep their in-app routing.
  const [readCard, setReadCard] = useState<DeckCard | null>(null);
  const relevant = useDeckRelevance();
  // Destructure so the callback depends on the specific prop, not the whole
  // props object (react-hooks/exhaustive-deps; CI lints changed lines at
  // --max-warnings=0).
  const { onOpenCard } = props;
  const handleOpenCard = useCallback(
    (card: DeckCard) => {
      if (card.kind === 'news' || card.kind === 'trend') setReadCard(card);
      else onOpenCard(card);
    },
    [onOpenCard],
  );

  return (
    <>
      {props.variant === 'desktop' ? (
        <DesktopHome {...props} data={data} onOpenCard={handleOpenCard} />
      ) : (
        <MobileHome {...props} data={data} onOpenCard={handleOpenCard} />
      )}
      <CardReadSheet
        card={readCard}
        onClose={() => setReadCard(null)}
        leaderRole={data.leaderRole}
        leaderSector={data.leaderSector}
        relevantToPinnedDecision={readCard ? relevant(readCard) : false}
        onWeigh={
          props.onWeighCard
            ? (prefill) => { setReadCard(null); props.onWeighCard?.(prefill); }
            : undefined
        }
      />
    </>
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
  onProfileComplete,
}: HomeFeedProps) {
  const onboard = useInlineOnboarding(data);
  const deck = data.deck;
  // The branded GlobeLoader is the FIRST-ENTRY experience only. Snapshot at mount
  // whether Home has ever loaded this session; a return visit (Home -> Decisions
  // -> Home) renders the quiet in-shell skeleton instead, matching how landing on
  // Decisions/Memory feels. With the useCockpit cache warm, `loading` is already
  // false on return, so usually neither shows.
  const [firstLoad] = useState(() => !isHomeReady());
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

  // the hint only earns its place when there is somewhere to swipe to.
  const showSwipeHint = !loading && !hasSwiped && deck.length > 1 && idx < deck.length - 1;

  // Measure the feed zone so every card gets ONE exact height derived from the
  // space actually available (uniform + always fits; predictability is the UX).
  // useLayoutEffect measures before paint so there is no unmeasured flash, and
  // the ResizeObserver keeps it honest across rotation / viewport chrome.
  const zoneRef = useRef<HTMLDivElement>(null);
  const [zoneH, setZoneH] = useState(0);
  useLayoutEffect(() => {
    const el = zoneRef.current;
    if (!el) return;
    setZoneH(el.clientHeight);
    const ro = new ResizeObserver(() => setZoneH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* GREET + state-aware orientation (the shell stays put across states).
          The tune-feed control now lives in the top bar with the other chrome. */}
      <div className="flex shrink-0 flex-col gap-1 px-0.5">
        <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-foreground">{greeting}</h1>
        <p className="text-pretty text-[12.5px] leading-snug text-muted-foreground">
          {loading ? 'Curating what you need to know in AI today.' : framingFor(data.homeState, data.posture, 'mobile')}
        </p>
      </div>

      {/* THE FEED - the one browsable zone. min-h-0 + overflow-hidden so the cards
          never spill onto the doors/nav (the live clip bug fix). A VERTICAL
          progress rail + a one-time "swipe up" hint make the vertical gesture
          unmistakable (the dots used to imply a sideways swipe). */}
      <div
        ref={zoneRef}
        className="relative mt-3 flex min-h-0 flex-1 flex-col overflow-hidden pr-3.5"
        onTouchStart={loading ? undefined : onTouchStart}
        onTouchEnd={loading ? undefined : onTouchEnd}
        onWheel={loading ? undefined : onWheel}
      >
        {/* The real feed renders underneath once data is ready; the globe loader
            overlays on top and cross-fades out (no abrupt swap). */}
        {!loading &&
          (onboard.show ? (
            <InlineProfileSetup
              variant="mobile"
              gated={onboard.gated}
              missing={data.missingProfile}
              onComplete={() => { onboard.dismiss(); onProfileComplete?.(); }}
              onSkip={onboard.dismiss}
            />
          ) : (
            <>
              <MobileSwipeTrack
                deck={deck}
                idx={idx}
                zoneH={zoneH}
                reduceMotion={!!reduceMotion}
                onFocus={go}
                onOpen={onOpenCard}
                onReact={onReactDeck}
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
          ))}
        {/* Do not cross-fade the loading copy over live headlines. The previous
            exit overlap briefly rendered two readable layers on top of each
            other when data resolved, which looked like a broken card. */}
        {loading && firstLoad && <GlobeLoader className="absolute inset-0 z-[5]" />}
        {loading && !firstLoad && (
          <div className="absolute inset-0 z-[5] flex flex-col">
            <SkeletonCard variant="feed" className="min-h-0 flex-1" />
          </div>
        )}
      </div>
    </div>
  );
}

// The swipe track: one card commands the view, the next peeks under it. The
// whole track translates so the focused card sits at the top of the zone.
//
// UNIFORM-HEIGHT GUARANTEE: the focused card's wrapper gets an explicit pixel
// height derived from the measured feed zone (zoneH - PEEK_ALLOWANCE), so every
// card renders at exactly the same height and always fits the space available -
// regardless of how much content it carries. The card's internals absorb the
// variance (clamps + bounded middle); the card itself NEVER grows.
// PEEK_ALLOWANCE keeps a consistent sliver of the next peek card visible below
// (~42px of card top + the 14px track gap), preserving the swipe affordance.
const PEEK_ALLOWANCE = 56;

interface MobileSwipeTrackProps {
  deck: DeckCard[];
  idx: number;
  /** Measured feed-zone height; 0 until the first layout measure lands. */
  zoneH: number;
  reduceMotion: boolean;
  onFocus: (n: number) => void;
  onOpen: (card: DeckCard) => void;
  onReact?: (card: DeckCard, reaction: 'like' | 'dislike') => void;
}

function MobileSwipeTrack({ deck, idx, zoneH, reduceMotion, onFocus, onOpen, onReact }: MobileSwipeTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const cardH = Math.max(0, zoneH - PEEK_ALLOWANCE);

  // position the focused card at the top of the bounded zone. Re-runs when the
  // zone (and therefore the card heights) resizes, so the pin stays exact.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const cards = track.children;
    const el = cards[idx] as HTMLElement | undefined;
    if (!el) return;
    setOffset(-Math.max(0, el.offsetTop - 2));
  }, [idx, deck, cardH]);

  return (
    <>
      <div
        ref={trackRef}
        className="flex flex-col gap-3.5 will-change-transform"
        style={{
          transform: `translateY(${offset}px)`,
          transition: reduceMotion ? 'none' : 'transform .46s cubic-bezier(.22,1,.36,1)',
          // hold the first frame until the zone is measured, never content-sized
          visibility: cardH > 0 ? undefined : 'hidden',
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
              // the one exact height every focused card shares (see PEEK_ALLOWANCE)
              style={focused ? { height: cardH > 0 ? cardH : undefined, minHeight: 0 } : undefined}
            >
              {focused ? (
                card.kind === 'kickstart' ? (
                  <KickstartCard card={card} variant="feed" onOpen={onOpen} />
                ) : card.kind === 'trend' ? (
                  <TrendCard card={card} variant="feed" onOpen={onOpen} />
                ) : (
                  <CockpitHero card={card} variant="feed" onOpen={onOpen} onReact={onReact} />
                )
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
  onProfileComplete,
}: HomeFeedProps) {
  const onboard = useInlineOnboarding(data);
  const deck = data.deck;
  // Globe is the first-entry experience only (see MobileHome); returns render the
  // quiet skeleton rail instead.
  const [firstLoad] = useState(() => !isHomeReady());
  const railRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dx: number) => railRef.current?.scrollBy({ left: dx, behavior: 'smooth' });

  // The rail label stays stable across load. During loading it must NOT echo the
  // subtitle ("Curating what you need to know in AI today.") verbatim - that read
  // as a duplicated line on desktop - so it holds its eventual "Worth a look
  // today" value until the data resolves the rich-state "What moved".
  const railLabel = loading
    ? 'Worth a look today'
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
            {loading ? 'Curating what you need to know in AI today.' : framingFor(data.homeState, data.posture, 'desktop')}
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

      {/* THE RAIL - the one browsable zone. It may shrink on a short laptop,
          but it never stretches into a wall of empty card on a tall desktop. */}
      <div
        data-testid="desktop-home-rail"
        className="relative mt-3.5 flex min-h-0 max-h-[520px] flex-1 flex-col"
      >
        {/* The real rail renders underneath once data is ready; the globe loader
            overlays on top and cross-fades out (no abrupt swap). */}
        {!loading &&
          (onboard.show ? (
            <InlineProfileSetup
              variant="desktop"
              gated={onboard.gated}
              missing={data.missingProfile}
              onComplete={() => { onboard.dismiss(); onProfileComplete?.(); }}
              onSkip={onboard.dismiss}
            />
          ) : (
            <>
              <div
                ref={railRef}
                className="scrollbar-hide flex min-h-0 flex-1 gap-[18px] overflow-x-auto overflow-y-hidden pb-1"
              >
                {deck.map((card, i) => (
                  // h-full min-h-0 declares the uniform height bound explicitly.
                  // The narrower default widths let a 1280-1440 desktop see the
                  // whole lead and two supporting reads instead of a cut-off wall.
                  <div
                    key={card.id}
                    className={cn(
                      'flex h-full min-h-0 flex-col',
                      i === 0
                        ? 'w-[400px] shrink-0 2xl:w-[460px]'
                        : 'w-[270px] shrink-0 2xl:w-[320px]',
                    )}
                  >
                    {card.kind === 'kickstart' ? (
                      <KickstartCard card={card} variant={i === 0 ? 'lead' : 'feed'} onOpen={onOpenCard} />
                    ) : card.kind === 'trend' ? (
                      <TrendCard card={card} variant={i === 0 ? 'lead' : 'feed'} onOpen={onOpenCard} />
                    ) : (
                      <CockpitHero card={card} variant={i === 0 ? 'lead' : 'feed'} onOpen={onOpenCard} onReact={i === 0 ? onReactDeck : undefined} />
                    )}
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-[60px] bg-gradient-to-l from-background to-transparent" />
            </>
          ))}
        {loading && firstLoad && <GlobeLoader className="absolute inset-0 z-[5]" />}
        {loading && !firstLoad && (
          <div className="absolute inset-0 z-[5] flex gap-[18px] overflow-hidden">
            <SkeletonCard variant="lead" className="h-full w-[400px] shrink-0 2xl:w-[460px]" />
            <SkeletonCard variant="feed" className="h-full w-[270px] shrink-0 2xl:w-[320px]" />
            <SkeletonCard variant="feed" className="h-full w-[270px] shrink-0 2xl:w-[320px]" />
          </div>
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

