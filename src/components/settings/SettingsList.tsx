/* eslint-disable react-refresh/only-export-components -- this file also exports the SETTINGS_SECTION_LABELS map */
import { useNavigate } from 'react-router-dom'
import { User, UserCircle, Radio, Shield, Sliders, Palette, Zap, Scroll, TrendingUp } from 'lucide-react'
import { SettingRow } from '@/components/system/surface'
import { useSettingsSheet } from '@/contexts/SettingsSheetContext'
import type { SettingsSection } from '@/contexts/SettingsSheetContext'

interface SettingsRow {
  section?: SettingsSection
  route?: string // navigate to a route instead of opening a section
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const ROWS: SettingsRow[] = [
  { section: 'account', label: 'Account', description: 'Email, password, sign out', icon: User },
  { section: 'profile', label: 'Profile', description: 'Work context and background', icon: UserCircle },
  { route: '/track-record', label: 'Track record', description: 'How your judgment is holding up', icon: TrendingUp },
  { section: 'briefing-interests', label: 'Tune your feed', description: 'What pops up in Home and your briefing', icon: Sliders },
  { section: 'briefing', label: 'Briefing rules', description: 'Voice directives for your daily brief', icon: Radio },
  { section: 'privacy', label: 'Privacy & data', description: 'Export, retention, consent', icon: Shield },
  { section: 'preferences', label: 'Preferences', description: 'Theme, units, appearance', icon: Palette },
  { section: 'edge-pro', label: 'Edge Pro', description: 'Subscription and billing', icon: Zap },
  { section: 'manifesto', label: 'Manifesto', description: 'Your operating principles', icon: Scroll },
]

interface SettingsListProps {
  onSelect: (section: SettingsSection) => void
}

export function SettingsList({ onSelect }: SettingsListProps) {
  const navigate = useNavigate()
  const { closeSheet } = useSettingsSheet()

  return (
    <div className="flex flex-col gap-2 px-4 py-2">
      {ROWS.map(({ section, route, label, description, icon }) => (
        <SettingRow
          key={section ?? route}
          icon={icon}
          label={label}
          description={description}
          onClick={() => {
            if (route) {
              // Close the sheet FIRST so the destination page is actually visible
              // (the drawer is a global overlay; without this it covers the route).
              closeSheet()
              navigate(route)
            } else if (section) {
              onSelect(section)
            }
          }}
        />
      ))}
    </div>
  )
}

export const SETTINGS_SECTION_LABELS: Record<SettingsSection, string> = {
  account: 'Account',
  profile: 'Profile',
  'briefing-interests': 'Tune your feed',
  briefing: 'Briefing rules',
  notifications: 'Notifications',
  privacy: 'Privacy & data',
  preferences: 'Preferences',
  'edge-pro': 'Edge Pro',
  manifesto: 'Manifesto',
}
