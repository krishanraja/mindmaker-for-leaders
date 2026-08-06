import { useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { PASSWORD_RULE_TEXT, checkPassword } from '@/lib/passwordPolicy'

/**
 * Change your password without leaving the app.
 *
 * Settings has never had this. The comment it replaces said to add one "when
 * there's a working backend for it", and there always was: the reason it feels
 * awkward is that the project sets
 * security_update_password_require_reauthentication = true, so Supabase refuses
 * a bare updateUser({ password }). It wants proof the person at the keyboard is
 * the account holder.
 *
 * So this is two steps rather than one. reauthenticate() emails a six-digit
 * code, and updateUser carries that code as a nonce. It is more friction than a
 * single field and it is the correct amount: changing a password from an
 * already-open session is exactly the thing a stolen laptop makes easy.
 *
 * Google-only accounts have no password to change. They are told that plainly
 * instead of being shown a form that cannot work.
 */
export function ChangePasswordCard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [stage, setStage] = useState<'idle' | 'code-sent'>('idle')
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  // identities is populated by Supabase; a Google-only account has no 'email'
  // provider and therefore no password.
  const hasPasswordIdentity =
    !user?.identities || user.identities.some((i) => i.provider === 'email')

  const sendCode = async () => {
    setSending(true)
    const { error } = await supabase.auth.reauthenticate()
    setSending(false)
    if (error) {
      toast({ title: 'Could not send the code', description: error.message, variant: 'destructive' })
      return
    }
    setStage('code-sent')
    toast({
      title: 'Code sent',
      description: `Check ${user?.email ?? 'your email'} for a six-digit code. It is good for a few minutes.`,
    })
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()

    const problem = checkPassword(password)
    if (problem) {
      toast({ title: 'That password will not be accepted', description: problem, variant: 'destructive' })
      return
    }
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', description: 'Both fields need to be the same.', variant: 'destructive' })
      return
    }

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password, nonce: code.trim() })
    setSaving(false)

    if (error) {
      // Surfaces the server-only rejections too, HIBP among them.
      toast({ title: 'Password not changed', description: error.message, variant: 'destructive' })
      return
    }

    setStage('idle')
    setCode('')
    setPassword('')
    setConfirm('')
    toast({ title: 'Password changed', description: 'Use the new one next time you sign in.' })
  }

  return (
    <div className="bg-card border border-border p-6 rounded-2xl">
      <h3 className="text-lg font-semibold text-foreground mb-1">Password</h3>

      {!hasPasswordIdentity ? (
        <p className="text-sm text-muted-foreground">
          You sign in with Google, so there is no password on this account to change. Manage it in your Google account.
        </p>
      ) : stage === 'idle' ? (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            We will email you a six-digit code first, so an open session on a borrowed laptop cannot change it.
          </p>
          <Button variant="outline" size="sm" onClick={sendCode} disabled={sending} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Change password
          </Button>
        </>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reauth-code">Code from your email</Label>
            <Input
              id="reauth-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">{PASSWORD_RULE_TEXT}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save new password
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setStage('idle')}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
