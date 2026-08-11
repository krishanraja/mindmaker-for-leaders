import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCockpit } from '@/hooks/useCockpit';
import { BrandedAppLoader } from '@/components/system/BrandedAppLoader';
import { HomeFeed } from './HomeFeed';
import { FirstLens } from './FirstLens';
import { useHandoffWelcome } from './HandoffWelcome';
import { cockpitGreeting, resolveDisplayName } from './cockpitGreeting';

/**
 * The mobile Home - the one unified 2028 Home (the VITE_COCKPIT_ENABLED fork was retired):
 * browsable industry headlines (a thumb-first SWIPE feed) + the three doors
 * (Briefing / Weigh / Build) in a fixed reserved place above the nav, all in ONE
 * composed, non-scrolling frame between the AppHeader and the BottomNav.
 *
 * Same information model as the desktop rail (HomeFeed), rendered device-native.
 * Loading is an IN-SHELL branded skeleton (chrome present, skeleton headline
 * cards + an anticipatory caption), never a raw spinner. See HomeFeed.tsx and
 * prototypes/home-2028.html for the design + CTRL-SYSTEM-SPEC s0,1,2,6 for the rules.
 *
 * THE no-clip / no-scroll contract: MobileFrame owns a single CSS grid (header /
 * bounded <main> / pinned BottomNav). HomeFeed fills <main> as a flex column
 * whose feed zone is min-h-0 + overflow-hidden, so the headlines can never blow
 * past the viewport or collide with the doors/nav (the live clip bug fix).
 */
interface CockpitViewProps {
  /** Optional onboarding banner, rendered inside the frame so the whole home
      still fits one viewport with no page scroll for a brand-new leader. */
  banner?: ReactNode;
  /** Hold the in-shell skeleton while an upstream gate (the onboarding check) is
      still resolving, so the Home route never flashes a raw text loader. */
  forceLoading?: boolean;
}

export function CockpitView({ banner, forceLoading }: CockpitViewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, recordDeckReaction, reload } = useCockpit();
  const handoff = useHandoffWelcome(reload);
  const handoffActive = handoff.phase !== 'idle';
  const showingHandoff = handoff.phase === 'ready' && !!handoff.signal;

  // Real name when we have one; null when the only identifier is an email /
  // handle / random id, so the greeting reads "Good morning." not
  // "Good morning, ctrl-qa-1782077550632."
  const firstName = resolveDisplayName(user);

  return (
    <MobileFrame
      banner={showingHandoff ? undefined : banner}
      padding="px-4"
      scroll={showingHandoff}
      hideScrollbar={showingHandoff}
      handoff={handoffActive}
    >
      {handoff.phase === 'resolving' ? (
        <BrandedAppLoader caption="Carrying your starting point into CTRL" />
      ) : showingHandoff && handoff.signal ? (
        <FirstLens
          variant="mobile"
          signal={handoff.signal}
          saving={handoff.saving}
          error={handoff.error}
          onConfirm={() => void handoff.confirm()}
          onDismiss={handoff.dismiss}
          onWeigh={(decision) => {
            void handoff.confirm().then((confirmed) => {
              if (confirmed) navigate('/decision', { state: { prefill: decision } });
            });
          }}
        />
      ) : (
        <div className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col pt-3 pb-[calc(4rem+env(safe-area-inset-bottom,0px))]">
          <HomeFeed
            variant="mobile"
            data={data}
            loading={loading || !!forceLoading}
            greeting={cockpitGreeting(firstName)}
            onOpenCard={(card) => {
              if (card.route) navigate(card.route, card.prefill ? { state: { prefill: card.prefill } } : undefined);
              else if (card.betId) navigate(`/decision-map?case=${card.betId}`);
              else if (card.url) window.open(card.url, '_blank', 'noopener,noreferrer');
            }}
            onReactDeck={(card, reaction) => void recordDeckReaction(card, reaction)}
            onWeighCard={(prefill) => navigate('/decision', { state: { prefill } })}
            onProfileComplete={reload}
          />
        </div>
      )}
    </MobileFrame>
  );
}
