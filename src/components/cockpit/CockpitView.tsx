import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppHeader } from '@/components/memory-web/AppHeader';
import { BottomNav } from '@/components/memory-web/BottomNav';
import { useCockpit } from '@/hooks/useCockpit';
import { CockpitHome } from './CockpitHome';

/**
 * The mobile home, behind VITE_COCKPIT_ENABLED. The greeting + the "worth a
 * look" deck (the one primary read) + the value actions, all in ONE
 * non-scrolling frame between the AppHeader and the BottomNav. No page scroll
 * on any device. A signal card routes into the decision map.
 */
interface CockpitViewProps {
  /** Optional onboarding banner, rendered inside the frame so the whole home
      still fits one viewport with no page scroll for a brand-new leader. */
  banner?: ReactNode;
}

export function CockpitView({ banner }: CockpitViewProps) {
  const navigate = useNavigate();
  const { data, loading, recordDeckReaction } = useCockpit();

  return (
    <div className="h-screen-safe flex flex-col overflow-hidden bg-background">
      <AppHeader />
      {banner}
      {/* No page scroll: <main> is a bounded, non-scrolling column between the
          header and the fixed bottom nav, and CockpitHome (a flex column) fills
          it. pb-20 clears the 64px nav. */}
      <main className="min-h-0 flex-1 overflow-hidden px-4 pb-20">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col py-3">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <CockpitHome
              data={data}
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
