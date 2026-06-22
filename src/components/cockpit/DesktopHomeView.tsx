import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCockpit } from '@/hooks/useCockpit';
import { useTodaysBriefing, useGenerateBriefing } from '@/hooks/useBriefing';
import { isBriefingGenerating, isBriefingReady } from '@/types/briefing';
import { HomeFeed } from './HomeFeed';
import { cockpitGreeting, resolveDisplayName } from './cockpitGreeting';

/**
 * The desktop Home - the SAME unified 2028 information model as the mobile swipe
 * feed (HomeFeed), rendered device-native as a calm horizontal RAIL inside the
 * DesktopShell: a wide lead headline card + tiles + prev/next, with the three
 * doors pinned in their own reserved row beneath.
 *
 * Replaces the legacy DesktopMemoryDashboard as the default `/dashboard` home.
 * The Memory web stays reachable at `/memory` and `?view=edge`. Loading is the
 * in-shell branded skeleton, never a spinner. DesktopShell is fit-to-viewport
 * (no page scroll); HomeFeed bounds the rail with min-h-0 so the doors always
 * keep their place.
 */
export function DesktopHomeView({ banner, forceLoading }: { banner?: ReactNode; forceLoading?: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, recordDeckReaction } = useCockpit();

  // The Briefing door is a trigger (see CockpitView): start, watch it build,
  // enter only once ready - driven by the real row stage.
  const { briefing: defaultBriefing, refetch: refetchBriefing } = useTodaysBriefing();
  const { generate, generating } = useGenerateBriefing();
  const briefingReady = isBriefingReady(defaultBriefing);
  const briefingBusy = generating || isBriefingGenerating(defaultBriefing);
  const briefingState: 'idle' | 'generating' | 'ready' = briefingBusy
    ? 'generating'
    : briefingReady
    ? 'ready'
    : 'idle';
  const handleBriefingDoor = () => {
    if (briefingReady) { navigate('/briefing'); return; }
    if (briefingBusy) return;
    void generate('default').then(() => { void refetchBriefing(); });
  };

  // Real name when we have one; null when the only identifier is an email /
  // handle / random id, so the greeting omits the ugly id gracefully.
  const firstName = resolveDisplayName(user);

  return (
    <DesktopShell eyebrow="Home" title="Worth a look">
      {banner}
      <HomeFeed
        variant="desktop"
        data={data}
        loading={loading || !!forceLoading}
        greeting={cockpitGreeting(firstName)}
        onPlayBriefing={handleBriefingDoor}
        briefingState={briefingState}
        onGoDecide={() => navigate('/decision')}
        onBuildSkill={() => navigate('/context')}
        onOpenCard={(card) => { if (card.betId) navigate(`/decision-map?case=${card.betId}`); }}
        onReactDeck={(card, reaction) => void recordDeckReaction(card, reaction)}
      />
    </DesktopShell>
  );
}
