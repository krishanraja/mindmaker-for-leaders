import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCockpit } from '@/hooks/useCockpit';
import { HomeFeed } from './HomeFeed';
import { cockpitGreeting } from './cockpitGreeting';

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

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    '';

  return (
    <DesktopShell eyebrow="Home" title="Worth a look">
      {banner}
      <HomeFeed
        variant="desktop"
        data={data}
        loading={loading || !!forceLoading}
        greeting={cockpitGreeting(firstName)}
        onPlayBriefing={() => navigate('/briefing')}
        onGoDecide={() => navigate('/decision')}
        onBuildSkill={() => navigate('/context')}
        onOpenCard={(card) => { if (card.betId) navigate(`/decision-map?case=${card.betId}`); }}
        onReactDeck={(card, reaction) => void recordDeckReaction(card, reaction)}
      />
    </DesktopShell>
  );
}
