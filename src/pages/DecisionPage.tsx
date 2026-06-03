import { AppHeader } from '@/components/memory-web/AppHeader';
import { BottomNav } from '@/components/memory-web/BottomNav';
import { PressureTestPanel } from '@/components/operator/decision/PressureTestPanel';

/**
 * Pressure-test a decision. Surfaces the decision engine (decompose, verify,
 * cross-examine, advise, WATCH) that shipped behind a never-set flag. Reached
 * from Edge; mounted directly, not via the orphaned OperatorDashboard.
 */
export default function DecisionPage() {
  return (
    <div className="h-screen-safe overflow-hidden flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 min-h-0 overflow-y-auto px-4 pb-24 scrollbar-hide">
        <div className="mx-auto w-full max-w-3xl py-4">
          <PressureTestPanel />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
