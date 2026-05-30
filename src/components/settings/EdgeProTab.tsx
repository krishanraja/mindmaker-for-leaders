// src/components/settings/EdgeProTab.tsx
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useEdgeSubscription } from '@/hooks/useEdgeSubscription'
import { EDGE_PRO_PRICE_LONG } from '@/constants/billing'
import {
  Loader2,
  Mail,
  Crown,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

const STATUS_LABEL: Record<string, { label: string; tone: 'ok' | 'warn' | 'muted' }> = {
  active: { label: 'Active', tone: 'ok' },
  past_due: { label: 'Past due', tone: 'warn' },
  canceled: { label: 'Canceled', tone: 'muted' },
  inactive: { label: 'Inactive', tone: 'muted' },
}

function formatDate(value: string | null | undefined): string {
  if (!value) return ' - '
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ' - '
  }
}

export function EdgeProTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { subscription, isActive, isLoading: subLoading, isProcessing, subscribe, refresh } =
    useEdgeSubscription()

  const [email, setEmail] = useState('')
  const [initialEmail, setInitialEmail] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPortalLoading, setIsPortalLoading] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState(false)

  useEffect(() => {
    if (!user) return

    async function loadEmail() {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('edge_delivery_email')
        .eq('id', user!.id)
        .single()

      if (!error && data) {
        const saved = (data as Record<string, unknown>).edge_delivery_email as string || ''
        setEmail(saved)
        setInitialEmail(saved)
      }
      setIsLoading(false)
    }

    loadEmail()
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({ edge_delivery_email: email.trim() } as Record<string, unknown>)
      .eq('id', user.id)

    setIsSaving(false)

    if (error) {
      toast({
        title: 'Failed to save',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      setInitialEmail(email.trim())
      toast({
        title: 'Saved',
        description: 'Your delivery email has been updated.',
      })
    }
  }

  const handleSubscribe = async () => {
    const url = await subscribe()
    if (url) window.location.assign(url)
  }

  const handleManageBilling = async () => {
    setIsPortalLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke(
        'create-billing-portal-session',
      )
      if (error) throw error
      if (!data?.url) throw new Error('No portal URL returned')
      window.location.assign(data.url as string)
    } catch (err) {
      console.error('billing portal failed:', err)
      toast({
        title: 'Could not open billing portal',
        description: (err as Error).message,
        variant: 'destructive',
      })
    } finally {
      setIsPortalLoading(false)
    }
  }

  const handleSendTest = async () => {
    const target = email.trim() || user?.email || ''
    if (!target) {
      toast({
        title: 'No email to test',
        description: 'Save a delivery address first.',
        variant: 'destructive',
      })
      return
    }
    setIsSendingTest(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-edge-test-email', {
        body: { email: target },
      })
      if (error) throw error
      if ((data as { error?: string } | null)?.error) {
        throw new Error((data as { error: string }).error)
      }
      toast({
        title: 'Test email sent',
        description: `Check ${target} in a moment.`,
      })
    } catch (err) {
      console.error('test email failed:', err)
      toast({
        title: 'Could not send test email',
        description: (err as Error).message,
        variant: 'destructive',
      })
    } finally {
      setIsSendingTest(false)
    }
  }

  const hasChanged = email.trim() !== initialEmail
  const status = subscription?.status ?? 'inactive'
  const statusMeta = STATUS_LABEL[status] ?? STATUS_LABEL.inactive

  return (
    <div className="space-y-6">
      {/* Subscription card */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-accent" />
            <h3 className="text-lg font-semibold text-foreground">Edge Pro Subscription</h3>
          </div>
          {!subLoading && (
            <Badge
              variant="outline"
              className={
                statusMeta.tone === 'ok'
                  ? 'border-emerald-500/40 text-emerald-600'
                  : statusMeta.tone === 'warn'
                  ? 'border-amber-500/40 text-amber-600'
                  : 'border-border text-muted-foreground'
              }
            >
              {statusMeta.tone === 'ok' ? (
                <CheckCircle2 className="w-3 h-3 mr-1" />
              ) : statusMeta.tone === 'warn' ? (
                <AlertTriangle className="w-3 h-3 mr-1" />
              ) : null}
              {statusMeta.label}
            </Badge>
          )}
        </div>

        {subLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading subscription...
          </div>
        ) : isActive ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You have full access to Edge capabilities including custom voice
              briefings and unlimited generation.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Current period ends</p>
                <p className="font-medium text-foreground">
                  {formatDate(subscription?.current_period_end ?? null)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="font-medium text-foreground">Edge Pro · {EDGE_PRO_PRICE_LONG}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={handleManageBilling}
                disabled={isPortalLoading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {isPortalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Manage subscription
              </Button>
              <Button
                onClick={refresh}
                variant="ghost"
                size="sm"
                disabled={subLoading}
              >
                Refresh status
              </Button>
            </div>
          </div>
        ) : status === 'past_due' ? (
          <div className="space-y-3">
            <p className="text-sm text-amber-600">
              Your last payment failed. Update your card to keep Edge Pro active.
            </p>
            <Button
              onClick={handleManageBilling}
              disabled={isPortalLoading}
              size="sm"
              className="gap-2"
            >
              {isPortalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Update payment method
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Subscribe to unlock unlimited Edge generation, Custom via Voice
              briefings, and email delivery for every artifact.
            </p>
            <Button
              onClick={handleSubscribe}
              disabled={isProcessing}
              size="sm"
              className="gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Crown className="h-4 w-4" />
              )}
              Subscribe - {EDGE_PRO_PRICE_LONG}
            </Button>
            {subscription?.stripe_customer_id && (
              <Button
                onClick={handleManageBilling}
                disabled={isPortalLoading}
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                {isPortalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                View past invoices
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Email delivery card */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-semibold text-foreground">Email Delivery</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Generated artifacts (memos, strategy docs, emails) can be delivered
          straight to your inbox. Enter the address you want them sent to.
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanged}
                size="sm"
                className="whitespace-nowrap"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {initialEmail
                  ? `Currently delivering to ${initialEmail}.`
                  : 'No delivery address yet - falls back to your account email.'}
              </p>
              <Button
                onClick={handleSendTest}
                disabled={isSendingTest || (!initialEmail && !user?.email)}
                size="sm"
                variant="outline"
                className="gap-2 shrink-0"
              >
                {isSendingTest ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send test
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
