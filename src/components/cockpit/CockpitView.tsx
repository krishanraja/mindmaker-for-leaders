import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCockpit } from '@/hooks/useCockpit';
import { HomeFeed } from './HomeFeed';
import { cockpitGreeting } from './cockpitGreeting';

/**
 * The mobile Home (behind VITE_COCKPIT_ENABLED) - the unified 2028 Home:
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
}

export function CockpitView({ banner }: CockpitViewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, recordDeckReaction } = useCockpit();

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    '';

  return (
    <MobileFrame banner={banner} padding="px-4">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col py-3">
        <HomeFeed
          variant="mobile"
          data={data}
          loading={loading}
          greeting={cockpitGreeting(firstName)}
          onPlayBriefing={() => navigate('/briefing')}
          onGoDecide={() => navigate('/decision')}
          onBuildSkill={() => navigate('/context')}
          onOpenCard={(card) => { if (card.betId) navigate(`/decision-map?case=${card.betId}`); }}
          onReactDeck={(card, reaction) => void recordDeckReaction(card, reaction)}
        />
      </div>
    </MobileFrame>
  );
}
