// src/pages/Settings.tsx
import { useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccountTab } from '@/components/settings/AccountTab'
import { WorkContextTab } from '@/components/settings/WorkContextTab'
import { PrivacyDataTab } from '@/components/settings/PrivacyDataTab'
import { PreferencesTab } from '@/components/settings/PreferencesTab'
import { EdgeProTab } from '@/components/settings/EdgeProTab'
import { ManifestoTab } from '@/components/settings/ManifestoTab'
import { BriefingDirectivesTab } from '@/components/settings/BriefingDirectivesTab'
import { BriefingInterestsTab } from '@/components/settings/BriefingInterestsTab'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DesktopShell } from '@/components/layout/DesktopShell'
import { useDevice } from '@/hooks/useDevice'
import {
  useSettingsSheet,
  type SettingsSection,
} from '@/contexts/SettingsSheetContext'

// 'notifications' was an unimplemented placeholder tab and has been removed
// from the navigation as part of the audit cleanup. The SettingsSection
// type still allows the value so any deep link from older notification
// emails redirects gracefully via the SettingsSheetContext default.
const VALID_SECTIONS: SettingsSection[] = [
  'account',
  'profile',
  'briefing',
  'briefing-interests',
  'privacy',
  'preferences',
  'edge-pro',
  'manifesto',
]

function isValidSection(value: string | null): value is SettingsSection {
  return value !== null && (VALID_SECTIONS as string[]).includes(value)
}

function SettingsTabs() {
  return (
    <Tabs defaultValue="work" className="flex-1 flex flex-col overflow-hidden min-h-0">
      <TabsList className="flex-shrink-0 flex flex-nowrap overflow-x-auto scrollbar-hide w-full bg-secondary px-1 gap-0.5">
        <TabsTrigger value="account" className="text-xs whitespace-nowrap flex-shrink-0">Account</TabsTrigger>
        <TabsTrigger value="work" className="text-xs whitespace-nowrap flex-shrink-0">Work context</TabsTrigger>
        <TabsTrigger value="briefing-interests" className="text-xs whitespace-nowrap flex-shrink-0">Briefing interests</TabsTrigger>
        <TabsTrigger value="briefing-directives" className="text-xs whitespace-nowrap flex-shrink-0">Briefing tone & rules</TabsTrigger>
        <TabsTrigger value="privacy" className="text-xs whitespace-nowrap flex-shrink-0">Privacy</TabsTrigger>
        <TabsTrigger value="preferences" className="text-xs whitespace-nowrap flex-shrink-0">Preferences</TabsTrigger>
        <TabsTrigger value="edge-pro" className="text-xs whitespace-nowrap flex-shrink-0">Edge Pro</TabsTrigger>
        <TabsTrigger value="manifesto" className="text-xs whitespace-nowrap flex-shrink-0">Leadership manifesto</TabsTrigger>
      </TabsList>

      <TabsContent value="account" className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain min-h-0 mt-4">
        <AccountTab />
      </TabsContent>

      <TabsContent value="work" className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain min-h-0 mt-4">
        <WorkContextTab />
      </TabsContent>

      <TabsContent value="privacy" className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain min-h-0 mt-4">
        <PrivacyDataTab />
      </TabsContent>

      <TabsContent value="preferences" className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain min-h-0 mt-4">
        <PreferencesTab />
      </TabsContent>

      <TabsContent value="edge-pro" className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain min-h-0 mt-4">
        <EdgeProTab />
      </TabsContent>

      <TabsContent value="manifesto" className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain min-h-0 mt-4">
        <ManifestoTab />
      </TabsContent>

      <TabsContent value="briefing-interests" className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain min-h-0 mt-4">
        <BriefingInterestsTab />
      </TabsContent>

      <TabsContent value="briefing-directives" className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain min-h-0 mt-4">
        <BriefingDirectivesTab />
      </TabsContent>
    </Tabs>
  )
}

/**
 * Mobile branch: /settings is not a full page on mobile. It opens the global
 * SettingsSheet (honoring ?section=...) and redirects to /dashboard so the
 * user keeps their underlying context.
 */
function MobileSettingsRedirect() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { openTo, openSheet } = useSettingsSheet()

  useEffect(() => {
    const param = searchParams.get('section')
    if (isValidSection(param)) {
      openTo(param)
    } else {
      openSheet()
    }
    navigate('/dashboard', { replace: true })
  }, [searchParams, openTo, openSheet, navigate])

  return null
}

export default function Settings() {
  const { isMobile } = useDevice()

  if (isMobile) {
    return <MobileSettingsRedirect />
  }

  return (
    <DesktopShell eyebrow="Account" title="Settings">
      <div className="max-w-3xl mx-auto">
        <SettingsTabs />
      </div>
    </DesktopShell>
  )
}
