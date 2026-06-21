import { useLocation } from 'react-router-dom';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { useDevice } from '@/hooks/useDevice';
import { PressureTestPanel } from '@/components/operator/decision/PressureTestPanel';

/**
 * Weigh a decision with CTRL. Surfaces the decision engine (decompose, verify,
 * cross-examine, advise, WATCH). Reached from Edge / the Decision Map; mounted
 * directly, not via the orphaned OperatorDashboard.
 *
 * No-scroll on all devices (docs/MAIN-APP-POLISH-SPEC.md section 3): the page is
 * pinned to the viewport and the panel owns its own internal fit / depth, so the
 * window never scrolls. The empty state leads with the one clear ask (capture);
 * the result is a fit-to-viewport instrument with depth one tap away.
 *
 * Wears the unified DesktopShell (sidebar + top bar) on desktop; the mobile
 * header + bottom nav on phones. PressureTestPanel renders both layouts.
 */
export default function DecisionPage() {
  const { isMobile } = useDevice();
  const location = useLocation();
  // A starter picked on the Decision Map empty state arrives as location.state.prefill.
  const prefill = (location.state as { prefill?: string } | null)?.prefill;

  if (!isMobile) {
    return (
      <DesktopShell eyebrow="Decide" title="Weigh a decision">
        {/* fit-to-viewport: no page scroll; the panel fits + opens depth internally */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="mx-auto w-full max-w-5xl flex-1 min-h-0 flex flex-col">
            <PressureTestPanel initialStatement={prefill} />
          </div>
        </div>
      </DesktopShell>
    );
  }

  return (
    <MobileFrame padding="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+5rem)]">
      <div className="mx-auto w-full max-w-3xl flex-1 min-h-0 flex flex-col">
        <PressureTestPanel initialStatement={prefill} />
      </div>
    </MobileFrame>
  );
}
