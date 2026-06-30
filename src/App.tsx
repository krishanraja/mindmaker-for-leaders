/**
 * App Component
 * Main app with splash screen, routing, and providers.
 */

import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider'
import { OfflineIndicator } from '@/components/ui/offline-indicator'
import { InitializationLoader } from '@/components/ui/InitializationLoader'
import { AppStateProvider, useAppState } from '@/contexts/AppStateContext'
import { BriefingProvider } from '@/contexts/BriefingContext'
import { DiagnosticsPanel } from '@/components/dev/DiagnosticsPanel'
import { initMobileViewport } from '@/utils/mobileViewport'
import { router } from '@/router'
import '@/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function AppContent() {
  const { appState, advanceToReady } = useAppState()
  const { isLoading: authLoading } = useAuth()
  // The ONE branded boot splash (rotating ring + Mindmaker icon) stays up until BOTH a short
  // minimum brand time has passed AND auth has resolved, then content is revealed in a single
  // swap. Holding one static splash - instead of fading it out on a fixed timer into a second
  // "Bringing your workspace up" loader - is what removes the old duplicate-loader flip.
  const [minElapsed, setMinElapsed] = useState(false)

  useEffect(() => {
    initMobileViewport()
    // First visit gets a short branded hold; a returning session in the same tab skips it and
    // only waits on auth. The static index.html boot icon already covered the very first paint,
    // so this continues the SAME visual rather than introducing a new one.
    const splashShown = sessionStorage.getItem('mindmaker-splash-shown')
    const minMs = splashShown ? 0 : 1500
    const t = setTimeout(() => {
      sessionStorage.setItem('mindmaker-splash-shown', 'true')
      setMinElapsed(true)
    }, minMs)
    return () => clearTimeout(t)
  }, [])

  // Reveal the app only when the brand hold AND auth have both resolved, so the router mounts
  // with auth already settled - one continuous splash, never a flip to a second branded loader.
  useEffect(() => {
    if (minElapsed && !authLoading && appState !== 'READY') {
      advanceToReady()
    }
  }, [minElapsed, authLoading, appState, advanceToReady])

  // Hold the single branded splash for the whole boot, then swap straight to content.
  if (appState !== 'READY') {
    return <InitializationLoader />
  }

  // Only render router when READY (auth already settled)
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
      <SonnerToaster position="top-center" />
      <OfflineIndicator />
      {/* Dev-only diagnostics. Mount only when actually shown so its data
          hooks never run (and never 406 on empty tables) for real users. */}
      {(import.meta.env.DEV ||
        new URLSearchParams(window.location.search).get('diagnostics') === 'true') && (
        <DiagnosticsPanel />
      )}
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BriefingProvider>
            <AppStateProvider>
              <AppContent />
            </AppStateProvider>
          </BriefingProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
