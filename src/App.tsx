/**
 * App Component
 * Main app with splash screen, routing, and providers.
 */

import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { OfflineIndicator } from '@/components/ui/offline-indicator'
import { SplashScreen } from '@/components/ui/splash-screen'
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
  const { appState, advanceToSplash, advanceToReady } = useAppState()

  useEffect(() => {
    // Initialize app (theme, viewport, etc.)
    const initializeApp = async () => {
      // Initialize mobile viewport
      initMobileViewport()

      // Wait minimum 100ms to ensure theme is applied
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check if splash already shown
      const splashShown = sessionStorage.getItem('mindmaker-splash-shown')
      if (splashShown) {
        console.log('🔄 Splash already shown, advancing to READY')
        advanceToReady()
      } else {
        console.log('🎬 First visit, advancing to SPLASH')
        advanceToSplash()
      }
    }

    initializeApp()
  }, [advanceToSplash, advanceToReady])

  const handleSplashComplete = () => {
    sessionStorage.setItem('mindmaker-splash-shown', 'true')
    advanceToReady()
  }

  // Render based on state machine
  if (appState === 'LOADING') {
    return <InitializationLoader />
  }

  if (appState === 'SPLASH') {
    return <SplashScreen onComplete={handleSplashComplete} />
  }

  // Only render router when READY
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
