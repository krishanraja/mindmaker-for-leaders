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
import { NewsPreferencesPanel } from '@/components/cockpit/NewsPreferencesPanel'
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

// Stack related settings sections in one tab with a quiet divider between them,
// so the eight old tabs collapse to four calm groups without losing anything.
function StackedTab({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-10 divide-y divide-border [&>*:not(:first-child)]:pt-10">
      {children}
    </div>
  )
}

const TAB_CONTENT_CLASS =
  'flex-1 overflow-y-auto scrollbar-hide overscroll-contain min-h-0 mt-4'

function SettingsTabs() {
  return (
    <Tabs defaultValue="you" className="flex-1 flex flex-col overflow-hidden min-h-0">
      <TabsList className="flex-shrink-0 flex flex-nowrap overflow-x-auto scrollbar-hide w-full bg-secondary px-1 gap-0.5 md:flex-wrap md:h-auto md:overflow-x-visible">
        <TabsTrigger value="you" className="text-xs whitespace-nowrap flex-shrink-0">You</TabsTrigger>
        <TabsTrigger value="briefing" className="text-xs whitespace-nowrap flex-shrink-0">Briefing</TabsTrigger>
        <TabsTrigger value="privacy" className="text-xs whitespace-nowrap flex-shrink-0">Privacy &amp; data</TabsTrigger>
        <TabsTrigger value="account" className="text-xs whitespace-nowrap flex-shrink-0">Account</TabsTrigger>
      </TabsList>

      <TabsContent value="you" className={TAB_CONTENT_CLASS}>
        <WorkContextTab />
      </TabsContent>

      <TabsContent value="briefing" className={TAB_CONTENT_CLASS}>
        <StackedTab>
          <NewsPreferencesPanel />
          <BriefingDirectivesTab />
        </StackedTab>
      </TabsContent>

      <TabsContent value="privacy" className={TAB_CONTENT_CLASS}>
        <StackedTab>
          <PrivacyDataTab />
          <PreferencesTab />
        </StackedTab>
      </TabsContent>

      <TabsContent value="account" className={TAB_CONTENT_CLASS}>
        <StackedTab>
          <AccountTab />
          <EdgeProTab />
          <ManifestoTab />
        </StackedTab>
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
    <DesktopShell eyebrow="Account" title="Make CTRL yours">
      <div className="max-w-3xl w-full mx-auto flex-1 min-h-0 flex flex-col">
        <p className="flex-shrink-0 text-sm text-muted-foreground mb-3">
          Set me up the way you work. Pick a tab to change one thing at a time.
        </p>
        <SettingsTabs />
      </div>
    </DesktopShell>
  )
}
