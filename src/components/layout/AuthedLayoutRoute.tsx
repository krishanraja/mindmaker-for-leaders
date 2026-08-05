import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useDevice } from '@/hooks/useDevice'
import { useAuth } from '@/components/auth/AuthProvider'
import { SettingsSheetProvider } from '@/contexts/SettingsSheetContext'
import { GlobalFAB } from '@/components/mobile/GlobalFAB'
import { SettingsSheet } from '@/components/settings/SettingsSheet'
import { CommandPaletteProvider } from '@/components/layout/CommandPalette'
import { ContestProvider } from '@/contexts/ContestProvider'
import { GlobalBriefingPlayer } from '@/components/briefing/GlobalBriefingPlayer'

function AuthedChrome() {
  const { isAuthenticated } = useAuth()
  const { isMobile } = useDevice()

  if (!isAuthenticated || !isMobile) return null

  return (
    <>
      <GlobalFAB />
      <SettingsSheet />
    </>
  )
}

// The briefing audio drawer lives once, app-wide, on both devices, so the
// top-bar audio button can open + play it from any tab in a single tap.
function AuthedBriefingPlayer() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return null
  return <GlobalBriefingPlayer />
}

export function AuthedLayoutRoute() {
  // Lock body/window scroll across the whole authed app frame. This is the one
  // wrapper that mounts for every authed route on both mobile and desktop
  // (mobile pages do not render DesktopShell), so it guarantees `app-locked` is
  // present on authed mobile surfaces too. The CSS rule
  // `body.app-locked { overflow: hidden }` and the touchmove gate in
  // mobileViewport.ts both key off this class. Public marketing routes
  // (Landing, /agents, /try, /auth, /build, /kit, /preview) never
  // mount this wrapper, so they will not receive app-locked and scroll normally.
  useEffect(() => {
    document.body.classList.add('app-locked')
    return () => {
      document.body.classList.remove('app-locked')
    }
  }, [])

  return (
    <SettingsSheetProvider>
      <CommandPaletteProvider>
        <ContestProvider>
          <Outlet />
          <AuthedChrome />
          <AuthedBriefingPlayer />
        </ContestProvider>
      </CommandPaletteProvider>
    </SettingsSheetProvider>
  )
}
