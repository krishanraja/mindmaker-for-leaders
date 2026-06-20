import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Hand, X } from "lucide-react"
import { MobileMemoryDashboard } from "@/components/memory-web/MobileMemoryDashboard"
import { DesktopMemoryDashboard } from "@/components/memory-web/DesktopMemoryDashboard"
import { CockpitView } from "@/components/cockpit/CockpitView"
import { OnboardingInterview } from "@/components/onboarding/OnboardingInterview"
import { BottomNav } from "@/components/memory-web/BottomNav"
import { DesktopShell } from "@/components/layout/DesktopShell"
import { AppHeader } from "@/components/memory-web/AppHeader"
import { Button } from "@/components/ui/button"
import { useDevice } from "@/hooks/useDevice"
import { useGuidedCapture } from "@/hooks/useGuidedCapture"
import { useAuth } from "@/components/auth/AuthProvider"
import { supabase } from "@/integrations/supabase/client"
import type { EdgeView } from "@/types/edge"

const EdgeViewLazy = React.lazy(() => import("@/components/edge/EdgeView"))

// Cockpit v1: on mobile, the cockpit replaces the Memory-Web home (desktop keeps
// its command-centre). Behind a flag for safe rollout.
const COCKPIT_ENABLED = import.meta.env.VITE_COCKPIT_ENABLED === 'true'

export default function Dashboard() {
  const { isMobile } = useDevice()
  const { isFirstTime, completeOnboarding } = useGuidedCapture()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  // Onboarding is an opt-in overlay, not a full-screen blocker. Default-off:
  // the dashboard always renders so a busy leader can land and explore. The
  // dismissible top banner offers a 60-second guided setup for users who
  // want it.
  const [onboardingOpen, setOnboardingOpen] = React.useState(false)
  const [bannerDismissed, setBannerDismissed] = React.useState(false)

  // Determine which view to show: Memory or Edge
  const activeView: EdgeView = (searchParams.get('view') as EdgeView) || 'memory'

  const alreadyOnboarded = !!localStorage.getItem('mindmaker_onboarded')

  const { data: hasExistingFacts, isLoading: checkingDb } = useQuery({
    queryKey: ['memory', 'onboarding-check', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('user_memory')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_current', true)

      if (count && count > 0) {
        localStorage.setItem('mindmaker_onboarded', 'true')
        return true
      }
      return false
    },
    enabled: !!user && !alreadyOnboarded,
    staleTime: 1000 * 60 * 5,
  })

  // First-run lands in the guided value-moment interview by default (the old
  // passive 4-card tour is gone). Offered once per browser; "Skip for now" in
  // the interview returns the leader to the dashboard to explore.
  const autoOfferedRef = React.useRef(false)
  React.useEffect(() => {
    if (autoOfferedRef.current || checkingDb) return
    if (
      isFirstTime &&
      !hasExistingFacts &&
      !alreadyOnboarded &&
      !localStorage.getItem('mindmaker_onboard_offered')
    ) {
      autoOfferedRef.current = true
      localStorage.setItem('mindmaker_onboard_offered', '1')
      setOnboardingOpen(true)
    }
  }, [checkingDb, isFirstTime, hasExistingFacts, alreadyOnboarded])

  if (checkingDb) {
    return <div className="h-screen-safe flex items-center justify-center">Loading...</div>
  }

  // First-time prompt: offered, never enforced. The user can start the guided
  // setup, defer (dismiss until next session), or skip permanently. Any one
  // captured fact also flips alreadyOnboarded via the query above.
  const showOnboardingPrompt =
    isFirstTime && !hasExistingFacts && !alreadyOnboarded && !bannerDismissed

  // If the user actively chose to do guided onboarding, render it full-screen
  // as before. Completing it (or backing out) returns them to the dashboard.
  if (onboardingOpen) {
    return (
      <OnboardingInterview
        onComplete={() => {
          completeOnboarding()
          setOnboardingOpen(false)
        }}
      />
    )
  }

  const onboardingBanner = showOnboardingPrompt ? (
    <div className="shrink-0 bg-accent/10 border-b border-accent/20 px-4 py-2.5">
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        <Hand className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
        <p className="text-xs text-foreground flex-1 min-w-0">
          <span className="font-medium">Welcome.</span>{" "}
          <span className="text-muted-foreground">
            New here? Take about 2 minutes to introduce yourself, or look around first.
          </span>
        </p>
        <Button
          size="sm"
          onClick={() => setOnboardingOpen(true)}
          className="h-7 px-3 text-xs"
        >
          Show me
        </Button>
        <button
          type="button"
          onClick={() => {
            setBannerDismissed(true)
            // Mark as onboarded on permanent skip so the prompt doesn't
            // come back next session unless they explicitly trigger it.
            completeOnboarding()
          }}
          aria-label="Dismiss"
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  ) : null

  // Edge view
  if (activeView === 'edge') {
    if (isMobile) {
      return (
        <div className="h-screen-safe overflow-hidden flex flex-col bg-background">
          <AppHeader />
          {onboardingBanner}
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
        {onboardingBanner}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          <React.Suspense fallback={<div className="flex items-center justify-center py-20">Loading...</div>}>
            <EdgeViewLazy />
          </React.Suspense>
        </div>
      </DesktopShell>
    )
  }

  // Memory view (default). On the mobile cockpit the banner is handed INTO the
  // frame so it sits inside the single viewport (header + banner + home + nav)
  // and the home still fits with no page scroll for a brand-new leader. The
  // other surfaces own their own scroll, so the banner wraps them as before.
  if (isMobile && COCKPIT_ENABLED) {
    return <CockpitView banner={onboardingBanner} />
  }

  return (
    <>
      {onboardingBanner}
      {isMobile ? <MobileMemoryDashboard /> : <DesktopMemoryDashboard />}
    </>
  )
}
