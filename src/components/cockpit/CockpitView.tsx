import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppHeader } from '@/components/memory-web/AppHeader';
import { BottomNav } from '@/components/memory-web/BottomNav';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCockpit } from '@/hooks/useCockpit';
import { CockpitHome } from './CockpitHome';
import { cockpitGreeting, COCKPIT_FRAMING } from './cockpitGreeting';

/**
 * The mobile home, behind VITE_COCKPIT_ENABLED. The chief-of-staff ONE-THING
 * surface: a warm greeting + a single framing line, ONE hero (the top of the
 * useCockpit ranked stream), a small secondary peek of the next item, then a
 * thin footer rail of quiet doors - all in ONE composed, non-scrolling frame
 * between the AppHeader and the BottomNav.
 *
 * THE BUG FIX (the deck used to overlap the other home blocks): the frame is a
 * single CSS grid - header (auto) / focus (1fr) / footer rail + nav (auto). The
 * focus row is min-h-0 + overflow-hidden, so the hero (and the in-place stream
 * reveal) can never blow past the viewport width or collide with the rail/nav.
 * Nothing is absolutely positioned over a sibling.
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
    // ONE composed frame: a grid of header / content / nav. The content row is
    // bounded + non-scrolling; CockpitHome fills it as a flex column.
    <div className="grid h-screen-safe grid-rows-[auto_1fr_auto] overflow-hidden bg-background">
      <div className="min-h-0">
        <AppHeader />
        {banner}
      </div>
      <main className="min-h-0 overflow-hidden px-4">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col py-3">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <CockpitHome
              data={data}
              greeting={cockpitGreeting(firstName)}
              framing={COCKPIT_FRAMING}
              onPlayBriefing={() => navigate('/briefing')}
              onGoDecide={() => navigate('/decision')}
              onBuildSkill={() => navigate('/context')}
              onOpenBet={(id) => navigate(`/decision-map?case=${id}`)}
              onReactDeck={(card, reaction) => void recordDeckReaction(card, reaction)}
            />
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
