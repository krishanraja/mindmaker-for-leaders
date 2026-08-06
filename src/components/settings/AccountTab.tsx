// src/components/settings/AccountTab.tsx
import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { LogOut, Loader2, Hand, Shield, ArrowUpRight } from 'lucide-react'
import { ChangePasswordCard } from './ChangePasswordCard'

export function AccountTab() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/auth', { replace: true })
    } catch (err) {
      console.error('sign out failed:', err)
      toast({
        title: 'Sign out failed',
        description: (err as Error).message,
        variant: 'destructive',
      })
      setSigningOut(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-foreground mb-4">Profile</h3>
        <div>
          <label className="text-sm text-muted-foreground">Email</label>
          <p className="text-foreground">{user?.email}</p>
        </div>
      </div>

      <ChangePasswordCard />

      <div className="bg-card border border-border p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-foreground mb-1">Security &amp; compliance</h3>
        <p className="text-sm text-muted-foreground mb-4">
          See our SOC 2, HIPAA, GDPR, CCPA, and ISO 27001 controls, plus the
          full list of subprocessors.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/compliance')}
          className="gap-2"
        >
          <Shield className="h-4 w-4" />
          Open compliance page
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="bg-card border border-border p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-foreground mb-1">Replay setup tour</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Show the welcome banner again on the dashboard so you can re-run the
          one-minute guided setup.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            try {
              window.localStorage.removeItem('mindmaker_onboarded')
            } catch {
              /* localStorage unavailable */
            }
            toast({
              title: 'Tour reset',
              description: 'The welcome banner will be back on the dashboard.',
            })
            window.location.assign('/dashboard')
          }}
          className="gap-2"
        >
          <Hand className="h-4 w-4" />
          Replay setup tour
        </Button>
      </div>

      <div className="bg-card border border-border p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-foreground mb-1">Sign out</h3>
        <p className="text-sm text-muted-foreground mb-4">
          You&apos;ll need to sign in again to access your data on this device.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleSignOut}
          disabled={signingOut}
          className="gap-2"
        >
          {signingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Sign out
        </Button>
      </div>
    </div>
  )
}
