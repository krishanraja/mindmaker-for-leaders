import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useDevice } from '@/hooks/useDevice'
import { useAuth } from '@/components/auth/AuthProvider'
import { SettingsSheetProvider } from '@/contexts/SettingsSheetContext'
import { GlobalFAB } from '@/components/mobile/GlobalFAB'
import { SettingsSheet } from '@/components/settings/SettingsSheet'
import { CommandPaletteProvider } from '@/components/layout/CommandPalette'
import { ContestProvider } from '@/contexts/ContestProvider'

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

export function AuthedLayoutRoute() {
  // Lock body/window scroll across the whole authed app frame. This is the one
  // wrapper that mounts for every authed route on both mobile and desktop
  // (mobile pages do not render DesktopShell), so it guarantees `app-locked` is
  // present on authed mobile surfaces too. The CSS rule
  // `body.app-locked { overflow: hidden }` and the touchmove gate in
  // mobileViewport.ts both key off this class. Public marketing routes
  // (Landing, /agents, /try, /auth, /booking, /build, /kit, /preview) never
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
        </ContestProvider>
      </CommandPaletteProvider>
    </SettingsSheetProvider>
  )
}
