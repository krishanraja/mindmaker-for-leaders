import { AccountTab } from './AccountTab'
import { WorkContextTab } from './WorkContextTab'
import { PrivacyDataTab } from './PrivacyDataTab'
import { PreferencesTab } from './PreferencesTab'
import { EdgeProTab } from './EdgeProTab'
import { ManifestoTab } from './ManifestoTab'
import { BriefingDirectivesTab } from './BriefingDirectivesTab'
import { NewsPreferencesPanel } from '@/components/cockpit/NewsPreferencesPanel'
import type { SettingsSection } from '@/contexts/SettingsSheetContext'

interface SettingsSectionViewProps {
  section: SettingsSection
}

// 'notifications' was a placeholder tab and is intentionally not handled
// here; the mobile sheet falls through to `default` and shows nothing.
// Once a real notifications backend exists, route the case back here.
export function SettingsSectionView({ section }: SettingsSectionViewProps) {
  switch (section) {
    case 'account':
      return <AccountTab />
    case 'profile':
      return <WorkContextTab />
    case 'briefing-interests':
      return <NewsPreferencesPanel showHeader={false} />
    case 'briefing':
      return <BriefingDirectivesTab />
    case 'privacy':
      return <PrivacyDataTab />
    case 'preferences':
      return <PreferencesTab />
    case 'edge-pro':
      return <EdgeProTab />
    case 'manifesto':
      return <ManifestoTab />
    default:
      return null
  }
}
