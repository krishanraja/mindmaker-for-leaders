import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppHeader } from '@/components/memory-web/AppHeader';
import { BottomNav } from '@/components/memory-web/BottomNav';
import { useCockpit } from '@/hooks/useCockpit';
import { CockpitHome } from './CockpitHome';

/**
 * The mobile home, behind VITE_COCKPIT_ENABLED. The daily read (hero) + the
 * bets board, in the standard mobile frame (AppHeader + BottomNav). A bet / the
 * read routes into the decision map; "pressure-test" routes to Decide.
 */
export function CockpitView() {
  const navigate = useNavigate();
  const { data, loading } = useCockpit();

  return (
    <div className="h-screen-safe flex flex-col overflow-hidden bg-background">
      <AppHeader />
      <main className="flex-1 min-h-0 overflow-y-auto px-4 pb-24 scrollbar-hide">
        <div className="mx-auto w-full max-w-md py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <CockpitHome
              data={data}
              onOpenRead={(betId) => navigate(betId ? `/decision-map?case=${betId}` : '/decision-map')}
              onOpenBet={(id) => navigate(`/decision-map?case=${id}`)}
              onGoDecide={() => navigate('/decision')}
              onAutomate={(b) =>
                navigate('/context', { state: { seed: { kind: 'blocker', text: b.value, fact_id: b.id, label: b.label } } })
              }
            />
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
