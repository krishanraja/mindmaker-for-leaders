import { useLocation } from 'react-router-dom';
import { AppHeader } from '@/components/memory-web/AppHeader';
import { BottomNav } from '@/components/memory-web/BottomNav';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { useDevice } from '@/hooks/useDevice';
import { PressureTestPanel } from '@/components/operator/decision/PressureTestPanel';

/**
 * Pressure-test a decision. Surfaces the decision engine (decompose, verify,
 * cross-examine, advise, WATCH) that shipped behind a never-set flag. Reached
 * from Edge; mounted directly, not via the orphaned OperatorDashboard.
 *
 * Wears the unified DesktopShell (sidebar + top bar) on desktop so it matches
 * every other authenticated surface; falls back to the mobile header + bottom
 * nav on phones. PressureTestPanel renders its own mobile/desktop layouts.
 */
export default function DecisionPage() {
  const { isMobile } = useDevice();
  const location = useLocation();
  // A starter picked on the Decision Map empty state arrives as location.state.prefill.
  const prefill = (location.state as { prefill?: string } | null)?.prefill;

  if (!isMobile) {
    return (
      <DesktopShell eyebrow="Decide" title="Pressure-test a decision">
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          <div className="mx-auto w-full max-w-5xl">
            <PressureTestPanel initialStatement={prefill} />
          </div>
        </div>
      </DesktopShell>
    );
  }

  return (
    <div className="h-screen-safe overflow-hidden flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 min-h-0 overflow-y-auto px-4 pb-24 scrollbar-hide">
        <div className="mx-auto w-full max-w-3xl py-4">
          <PressureTestPanel initialStatement={prefill} />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
