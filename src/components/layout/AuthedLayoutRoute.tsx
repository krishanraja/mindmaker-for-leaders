import { Outlet } from 'react-router-dom'
import { useDevice } from '@/hooks/useDevice'
import { useAuth } from '@/components/auth/AuthProvider'
import { SettingsSheetProvider } from '@/contexts/SettingsSheetContext'
import { GlobalFAB } from '@/components/mobile/GlobalFAB'
import { SettingsSheet } from '@/components/settings/SettingsSheet'
import { CommandPaletteProvider } from '@/components/layout/CommandPalette'

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
  return (
    <SettingsSheetProvider>
      <CommandPaletteProvider>
        <Outlet />
        <AuthedChrome />
      </CommandPaletteProvider>
    </SettingsSheetProvider>
  )
}
