// src/components/settings/EdgeProTab.tsx
import { useState, useEffect } from 'react'
import { McpTokensPanel } from './McpTokensPanel'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useEdgeSubscription } from '@/hooks/useEdgeSubscription'
import { EDGE_PRO_PRICE_LONG } from '@/constants/billing'
import { PLAN_MATRIX } from '@/constants/planMatrix'
import {
  Loader2,
  Mail,
  Crown,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Check,
  Minus,
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
        .maybeSingle()

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
      // supabase-js surfaces a generic "non-2xx status code" message. The real,
      // human reason is in the response body, so read it and show that instead.
      let description = 'We could not open billing right now. Please try again in a moment.'
      const ctx = (err as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        try {
          const body = await ctx.json()
          if (body?.error) description = body.error as string
        } catch {
          /* keep the friendly fallback */
        }
      } else if (err instanceof Error && err.message && !/non-2xx/i.test(err.message)) {
        description = err.message
      }
      toast({
        title: 'Billing portal unavailable',
        description,
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

  // A Pro grant can be Stripe-backed (real subscription) or complimentary
  // (granted manually, no Stripe customer). Only the former has anything to
  // manage in a billing portal; offering the button otherwise guarantees an error.
  const isStripeBacked = Boolean(
    subscription?.stripe_subscription_id || subscription?.stripe_customer_id,
  );

  return (
    <div className="space-y-6">
      {/* Feature matrix - Free vs Edge Pro */}
      <PlanMatrix />

      {/* Subscription card */}
      <div className="bg-card p-6 rounded-2xl border border-border">
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
                  ? 'border-accent/40 text-accent'
                  : statusMeta.tone === 'warn'
                  ? 'border-amber-500/40 text-amber-500'
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
                <p className="font-medium text-foreground">
                  {isStripeBacked ? `Edge Pro · ${EDGE_PRO_PRICE_LONG}` : 'Edge Pro · Complimentary'}
                </p>
              </div>
            </div>
            {!isStripeBacked && (
              <p className="text-xs text-muted-foreground">
                This is complimentary Pro access granted by Mindmaker. There is no
                Stripe billing to manage.
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {isStripeBacked && (
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
              )}
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
            <p className="text-sm text-amber-500">
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
      <div className="bg-card p-6 rounded-2xl border border-border">
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

      {/* Agent access (MCP) - only for active Edge Pro */}
      {status === 'active' && (
        <div className="bg-card p-6 rounded-2xl border border-border">
          <McpTokensPanel />
        </div>
      )}
    </div>
  )
}

const MATRIX = PLAN_MATRIX

function PlanMatrix() {
  return (
    <div className="bg-card p-6 rounded-2xl border border-border">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-foreground">What you get</h3>
        <p className="text-xs text-muted-foreground">
          Free includes Memory Web, Voice Profile, unlimited Automator skills, the daily briefing,
          and 3 decision weighs a month. Edge Pro ({EDGE_PRO_PRICE_LONG}) unlocks unlimited weighs,
          a multi-model cross-examination of every decision, decision watch, Edge artifacts, and the
          live pull of your skills into any AI.
        </p>
      </div>
      <div className="grid grid-cols-[1fr,auto,auto] gap-x-4 gap-y-1.5 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Capability
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
          Free
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-accent text-center">
          Edge Pro
        </span>
        {MATRIX.map((row) => (
          <div key={row.label} className="contents">
            <span className="text-foreground/90">{row.label}</span>
            <span className="flex items-center justify-center text-muted-foreground">{renderCell(row.free, 'free')}</span>
            <span className="flex items-center justify-center text-foreground">{renderCell(row.pro, 'pro')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function renderCell(value: string | true | false, tier: 'free' | 'pro'): React.ReactNode {
  if (value === true) {
    return <Check className={tier === 'pro' ? 'h-4 w-4 text-accent' : 'h-4 w-4 text-muted-foreground'} strokeWidth={2.6} />
  }
  if (value === false) return <Minus className="h-4 w-4 text-muted-foreground/50" strokeWidth={2.4} />
  return value
}

