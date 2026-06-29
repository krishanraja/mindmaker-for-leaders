import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { CockpitView } from "@/components/cockpit/CockpitView"
import { DesktopHomeView } from "@/components/cockpit/DesktopHomeView"
import { BottomNav } from "@/components/memory-web/BottomNav"
import { DesktopShell } from "@/components/layout/DesktopShell"
import { AppHeader } from "@/components/memory-web/AppHeader"
import { useDevice } from "@/hooks/useDevice"
import type { EdgeView } from "@/types/edge"

const EdgeViewLazy = React.lazy(() => import("@/components/edge/EdgeView"))

/**
 * /dashboard - the unified 2028 Home (the cockpit), device-native.
 *
 * Onboarding is no longer a gate here: a brand-new leader lands directly on the
 * cockpit, and the lightweight inline setup (industry / role / interests) lives
 * INSIDE the Home feed zone (HomeFeed -> InlineProfileSetup), driven off the
 * leader's real lifecycle state. The legacy 40-minute voice OnboardingInterview
 * and the VITE_COCKPIT_ENABLED fork (with its legacy Memory dashboards) were
 * retired - the Memory web now lives at /memory and ?view=edge. See
 * docs/CTRL-SYSTEM-SPEC.md s3/s6.
 */
export default function Dashboard() {
  const { isMobile } = useDevice()
  const [searchParams] = useSearchParams()

  // Memory (default Home) or the Edge strategic-thinking surface.
  const activeView: EdgeView = (searchParams.get('view') as EdgeView) || 'memory'

  if (activeView === 'edge') {
    if (isMobile) {
      return (
        <div className="h-screen-safe overflow-hidden flex flex-col bg-background">
          <AppHeader />
          <div data-edge-scroll className="flex-1 overflow-y-auto px-4 py-4 pb-44">
            <React.Suspense fallback={<div className="flex items-center justify-center py-20">Loading...</div>}>
              <EdgeViewLazy />
            </React.Suspense>
          </div>
          <BottomNav />
        </div>
      )
    }
    return (
      <DesktopShell eyebrow="Edge" title="Strategic thinking">
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          <React.Suspense fallback={<div className="flex items-center justify-center py-20">Loading...</div>}>
            <EdgeViewLazy />
          </React.Suspense>
        </div>
      </DesktopShell>
    )
  }

  // The one Home: the cockpit, rendered device-native (mobile swipe feed /
  // desktop rail). It owns its own in-shell branded loading.
  return isMobile ? <CockpitView /> : <DesktopHomeView />
}
