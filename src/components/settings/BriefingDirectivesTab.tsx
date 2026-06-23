// src/components/settings/BriefingDirectivesTab.tsx
//
// Simple free-form text field stored on user_briefing_directives. The body is
// injected verbatim into the briefing system prompt under <user-directives>
// so the user can steer their briefings without any schema or UI complexity.
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Check, Loader2 } from 'lucide-react'

const MAX_LEN = 2000

export function BriefingDirectivesTab() {
  const { user } = useAuth()
  const [body, setBody] = useState('')
  const [initial, setInitial] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.id) return
      const { data } = await supabase
        .from('user_briefing_directives' as never)
        .select('body')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      const text = (data as unknown as { body?: string } | null)?.body ?? ''
      setBody(text)
      setInitial(text)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const dirty = body !== initial
  const tooLong = body.length > MAX_LEN

  async function handleSave() {
    if (!user?.id || !dirty || tooLong) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_briefing_directives' as never)
        .upsert({ user_id: user.id, body, updated_at: new Date().toISOString() })
      if (!error) {
        setInitial(body)
        setSavedAt(new Date())
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-lg font-semibold">Your briefing rules</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Tell me what every briefing should do or avoid, and I will follow it. I
          already handle the voice and formatting, so just focus on what to
          emphasize, what to skip, and how to open.
        </p>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder='Example: "Always open with the single number that matters most today." Or: "Never speculate on competitor pricing; only cite named sources."'
          disabled={loading}
          className="mt-4 w-full min-h-[180px] rounded-md border border-border bg-background p-3 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent"
          maxLength={MAX_LEN + 200}
        />

        <div className="flex items-center justify-between mt-3">
          <span className={`text-xs ${tooLong ? 'text-red-500' : 'text-muted-foreground'}`}>
            {body.length} / {MAX_LEN} characters
          </span>
          <div className="flex items-center gap-3">
            {savedAt && !dirty && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={!dirty || tooLong || saving || loading}
              size="sm"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
