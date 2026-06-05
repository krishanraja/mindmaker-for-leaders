// src/components/settings/PreferencesTab.tsx
import { useEffect, useState } from 'react'
import { useTheme } from '@/components/ui/theme-provider'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Moon, Sun } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/hooks/use-toast'

export function PreferencesTab() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const { toast } = useToast()
  const [dailyBriefing, setDailyBriefing] = useState(false)
  const [savingDaily, setSavingDaily] = useState(false)

  // Load the current daily-briefing email preference.
  useEffect(() => {
    if (!user?.id) return
    let active = true
    supabase
      .from('leader_notification_prefs' as never)
      .select('daily_briefing_enabled')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setDailyBriefing(Boolean((data as { daily_briefing_enabled?: boolean }).daily_briefing_enabled))
      })
    return () => { active = false }
  }, [user?.id])

  const handleToggleDaily = async (next: boolean) => {
    setDailyBriefing(next) // optimistic
    setSavingDaily(true)
    const { error } = await supabase.functions.invoke('upsert-notification-prefs', {
      body: { daily_briefing_enabled: next },
    })
    setSavingDaily(false)
    if (error) {
      setDailyBriefing(!next) // revert
      toast({ title: 'Could not save', description: 'Please try again.', variant: 'destructive' })
    } else {
      toast({
        title: next ? 'Daily briefing on' : 'Daily briefing off',
        description: next
          ? "We'll email your morning briefing each day."
          : 'You will no longer get the daily briefing email.',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Appearance</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-2">Theme</label>
            <div className="flex gap-2">
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                onClick={() => setTheme('dark')}
                className="flex items-center gap-2"
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                onClick={() => setTheme('light')}
                className="flex items-center gap-2"
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Notifications</h3>
        <div className="flex items-start justify-between gap-4">
          <div>
            <label className="text-sm font-medium block">Daily briefing email</label>
            <p className="text-sm text-gray-400 mt-1">
              A short morning email with your briefing, tuned to your priorities.
            </p>
          </div>
          <Switch
            checked={dailyBriefing}
            disabled={savingDaily}
            onCheckedChange={handleToggleDaily}
            aria-label="Daily briefing email"
          />
        </div>
      </div>
    </div>
  )
}
