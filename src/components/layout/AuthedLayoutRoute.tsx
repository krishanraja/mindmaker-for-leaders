import { lazy, Suspense, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useDevice } from '@/hooks/useDevice'
import { useAuth } from '@/components/auth/AuthProvider'
import { SettingsSheetProvider, useSettingsSheet } from '@/contexts/SettingsSheetContext'
import { CommandPaletteProvider } from '@/components/layout/CommandPalette'
import { ContestProvider } from '@/contexts/ContestProvider'
import { useBriefingContext } from '@/contexts/BriefingContext'

const GlobalFAB = lazy(() => import('@/components/mobile/GlobalFAB').then((module) => ({ default: module.GlobalFAB })))
const SettingsSheet = lazy(() => import('@/components/settings/SettingsSheet').then((module) => ({ default: module.SettingsSheet })))
const GlobalBriefingPlayer = lazy(() => import('@/components/briefing/GlobalBriefingPlayer').then((module) => ({ default: module.GlobalBriefingPlayer })))

function AuthedChrome() {
  const { isAuthenticated } = useAuth()
  const { isMobile } = useDevice()
  const { open: settingsOpen } = useSettingsSheet()
  const [settingsActivated, setSettingsActivated] = useState(false)

  useEffect(() => {
    if (settingsOpen) setSettingsActivated(true)
  }, [settingsOpen])

  if (!isAuthenticated) return null

  return (
    <>
      <Suspense fallback={null}>
        {isMobile && <GlobalFAB />}
        {settingsActivated && <SettingsSheet />}
      </Suspense>
    </>
  )
}

// The briefing audio drawer lives once, app-wide, on both devices, so the
// top-bar audio button can open + play it from any tab in a single tap.
function AuthedBriefingPlayer() {
  const { isAuthenticated } = useAuth()
  const { isSheetOpen, isMiniPlayerVisible } = useBriefingContext()
  const [playerActivated, setPlayerActivated] = useState(false)

  useEffect(() => {
    if (isSheetOpen || isMiniPlayerVisible) setPlayerActivated(true)
  }, [isMiniPlayerVisible, isSheetOpen])

  if (!isAuthenticated) return null
  return playerActivated
    ? <Suspense fallback={null}><GlobalBriefingPlayer /></Suspense>
    : null
}

export function AuthedLayoutRoute() {
  // Lock body/window scroll across the whole authed app frame. This is the one
  // wrapper that mounts for every authed route on both mobile and desktop
  // (mobile pages do not render DesktopShell), so it guarantees `app-locked` is
  // present on authed mobile surfaces too. The CSS rule
  // `body.app-locked { overflow: hidden }` and the touchmove gate in
  // mobileViewport.ts both key off this class. Public marketing routes
  // (Landing, /agents, /try, /auth, /build, /preview) never
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
