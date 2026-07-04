// src/components/settings/WorkContextTab.tsx
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/integrations/supabase/client'
import { EditableField } from './EditableField'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import type { UserMemoryFact, FactCategory } from '@/types/memory'
import { FACT_CATEGORY_META, FACT_KEY_LABELS } from '@/types/memory'
import { Loader2, RefreshCw, Zap } from 'lucide-react'

type LeaderProfile = {
  title?: string | null
  role?: string | null
  company?: string | null
  industry?: string | null
  company_stage?: string | null
  strategic_problem?: string | null
  biggest_obstacle?: string | null
  biggest_fear?: string | null
  strategic_goal?: string | null
  quarterly_focus?: string | null
  profile_completeness?: number | null
}

// Map fact_keys → leader columns. Conservative: only obvious mappings.
const FACT_TO_LEADER: Record<string, keyof LeaderProfile> = {
  title: 'title',
  role: 'role',
  department: 'role',
  company: 'company',
  company_name: 'company',
  industry: 'industry',
  vertical: 'industry',
  company_size: 'company_stage',
  growth_stage: 'company_stage',
  main_blocker: 'strategic_problem',
  personal_blocker: 'biggest_obstacle',
  org_blocker: 'biggest_obstacle',
  team_blocker: 'biggest_obstacle',
  main_goal: 'strategic_goal',
  main_objective: 'strategic_goal',
  quarterly_priority: 'quarterly_focus',
  success_metric: 'quarterly_focus',
}

export function WorkContextTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [profile, setProfile] = useState<LeaderProfile | null>(null)
  const [memoryFacts, setMemoryFacts] = useState<UserMemoryFact[]>([])
  const [completeness, setCompleteness] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!user) return
    setIsLoading(true)

    try {
      // Load both in parallel - leaders may be missing while memory has data
      const [leadersRes, memoryRes] = await Promise.all([
        supabase
          .from('leaders')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_memory')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_current', true)
          .order('confidence_score', { ascending: false }),
      ])

      const leaderRow = leadersRes.data as LeaderProfile | null
      const facts = (memoryRes.data ?? []) as UserMemoryFact[]

      setProfile(leaderRow)
      setMemoryFacts(facts)
      setCompleteness(leaderRow?.profile_completeness ?? 0)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleUpdate = async (field: string, value: string) => {
    if (!user) return

    try {
      // Upsert so this also creates the leaders row on first edit when missing
      const { error } = await supabase
        .from('leaders')
        .upsert(
          {
            user_id: user.id,
            [field]: value,
          } as Record<string, unknown>,
          { onConflict: 'user_id' },
        )

      if (error) throw error

      await loadProfile()

      toast({
        title: 'Updated',
        description: 'Your profile has been updated successfully',
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      })
    }
  }

  /** Pull verified memory facts and write them into matching leaders columns. */
  const handleSyncFromMemory = async () => {
    if (!user) return
    if (memoryFacts.length === 0) {
      toast({
        title: 'No memories yet',
        description: 'Share some context first and we will sync it here.',
      })
      return
    }
    setIsSyncing(true)

    try {
      // Highest-confidence fact per leader column wins. Already sorted desc.
      const updates: Partial<LeaderProfile> = {}
      for (const fact of memoryFacts) {
        const column = FACT_TO_LEADER[fact.fact_key]
        if (!column) continue
        if (updates[column]) continue
        if (!fact.fact_value || !fact.fact_value.trim()) continue
        ;(updates as Record<string, string>)[column] = fact.fact_value.trim()
      }

      if (Object.keys(updates).length === 0) {
        toast({
          title: 'Nothing to sync',
          description: 'None of your memories map to profile fields yet.',
        })
        return
      }

      const { error } = await supabase
        .from('leaders')
        .upsert(
          { user_id: user.id, ...updates } as Record<string, unknown>,
          { onConflict: 'user_id' },
        )
      if (error) throw error

      await loadProfile()

      toast({
        title: 'Synced',
        description: `Filled in ${Object.keys(updates).length} field${
          Object.keys(updates).length === 1 ? '' : 's'
        } from your memories.`,
      })
    } catch (err) {
      console.error('sync from memory failed:', err)
      toast({
        title: 'Sync failed',
        description: (err as Error).message,
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
      </div>
    )
  }

  // Derived view from user_memory when no leaders row exists
  if (!profile && memoryFacts.length > 0) {
    const grouped = memoryFacts.reduce<Record<FactCategory, UserMemoryFact[]>>(
      (acc, fact) => {
        if (!acc[fact.fact_category]) acc[fact.fact_category] = []
        acc[fact.fact_category].push(fact)
        return acc
      },
      {} as Record<FactCategory, UserMemoryFact[]>,
    )

    return (
      <div className="space-y-6">
        <div className="bg-card border border-border p-6 rounded-2xl">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Profile · derived from memories
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                You don&apos;t have a structured profile yet, but we&apos;ve learned{' '}
                {memoryFacts.length} fact{memoryFacts.length === 1 ? '' : 's'}{' '}
                about you. Sync them into a profile or keep editing fields below.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleSyncFromMemory}
              disabled={isSyncing}
              className="gap-2 shrink-0"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Sync to profile
            </Button>
          </div>
        </div>

        {(Object.entries(grouped) as Array<[FactCategory, UserMemoryFact[]]>).map(
          ([category, facts]) => {
            const meta = FACT_CATEGORY_META[category]
            return (
              <div key={category} className="bg-card border border-border p-6 rounded-2xl">
                <h4 className="text-base font-semibold text-foreground mb-3">
                  {meta?.label ?? category}
                </h4>
                <div className="space-y-3">
                  {facts.map((fact) => (
                    <div
                      key={fact.id}
                      className="flex items-start justify-between gap-3 border-b border-border/50 last:border-b-0 pb-2 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {FACT_KEY_LABELS[fact.fact_key] ?? fact.fact_label ?? fact.fact_key}
                        </p>
                        <p className="text-sm text-foreground">{fact.fact_value}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          fact.verification_status === 'verified'
                            ? 'border-accent/40 text-accent shrink-0'
                            : 'border-border text-muted-foreground shrink-0'
                        }
                      >
                        {fact.verification_status === 'verified' ? 'Verified' : 'Inferred'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )
          },
        )}
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-muted-foreground">
          Your work profile has not been set up yet.
        </p>
        <p className="text-sm text-muted-foreground/70">
          Start by sharing context about your role on the Dashboard - your
          profile will build automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Completeness */}
      <div className="bg-card border border-border p-6 rounded-2xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-foreground">Profile Completeness</h3>
          {memoryFacts.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncFromMemory}
              disabled={isSyncing}
              className="gap-2 shrink-0"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync from memories
            </Button>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Your profile is {completeness}% complete
            </span>
            <span className="text-accent font-semibold">{completeness}/100</span>
          </div>
          <Progress value={completeness} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            A complete profile helps us give better recommendations and benchmark
            you accurately.
          </p>
        </div>
      </div>

      {/* Role & Company */}
      <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
          Role & Company
        </h3>

        <EditableField
          label="Title"
          value={profile.title || ''}
          onSave={(value) => handleUpdate('title', value)}
          placeholder="e.g., VP of Product"
          helpText="Your official job title"
        />

        <div className="border-t border-border pt-4" />

        <EditableField
          label="Functional Area"
          value={profile.role || ''}
          onSave={(value) => handleUpdate('role', value)}
          type="select"
          options={['Product', 'Engineering', 'Marketing', 'Sales', 'Operations', 'Finance', 'HR', 'Executive', 'Other']}
          helpText="Your primary functional area"
        />

        <div className="border-t border-border pt-4" />

        <EditableField
          label="Company"
          value={profile.company || ''}
          onSave={(value) => handleUpdate('company', value)}
          placeholder="e.g., Acme Inc"
        />

        <div className="border-t border-border pt-4" />

        <EditableField
          label="Industry"
          value={profile.industry || ''}
          onSave={(value) => handleUpdate('industry', value)}
          type="select"
          options={['SaaS', 'Fintech', 'Healthcare', 'E-commerce', 'Manufacturing', 'Consulting', 'Education', 'Media', 'Other']}
          helpText="Used for peer benchmarking"
        />

        <div className="border-t border-border pt-4" />

        <EditableField
          label="Company Stage"
          value={profile.company_stage || ''}
          onSave={(value) => handleUpdate('company_stage', value)}
          type="select"
          options={[
            'Startup (0-50 employees)',
            'Growth (51-250 employees)',
            'Mid-Market (251-1000 employees)',
            'Enterprise (1000+ employees)',
          ]}
        />
      </div>

      {/* Strategic Context */}
      <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
          Strategic Context
        </h3>
        <p className="text-sm text-muted-foreground">
          This information helps us tailor our recommendations to your specific
          situation.
        </p>

        <EditableField
          label="Top Challenge"
          value={profile.strategic_problem || ''}
          onSave={(value) => handleUpdate('strategic_problem', value)}
          type="textarea"
          placeholder="What's your biggest business challenge right now?"
          helpText="Be specific - this helps us give relevant advice"
        />

        <div className="border-t border-border pt-4" />

        <EditableField
          label="Biggest Obstacle"
          value={profile.biggest_obstacle || ''}
          onSave={(value) => handleUpdate('biggest_obstacle', value)}
          type="textarea"
          placeholder="What's holding you back from solving it?"
        />

        <div className="border-t border-border pt-4" />

        <EditableField
          label="Main Concern"
          value={profile.biggest_fear || ''}
          onSave={(value) => handleUpdate('biggest_fear', value)}
          type="textarea"
          placeholder="What are you most worried about? (optional)"
          helpText="Sensitive - only you can see this."
        />

        <div className="border-t border-border pt-4" />

        <EditableField
          label="Strategic Goal"
          value={profile.strategic_goal || ''}
          onSave={(value) => handleUpdate('strategic_goal', value)}
          type="textarea"
          placeholder="What are you trying to achieve?"
        />

        <div className="border-t border-border pt-4" />

        <EditableField
          label="Quarterly Focus"
          value={profile.quarterly_focus || ''}
          onSave={(value) => handleUpdate('quarterly_focus', value)}
          type="textarea"
          placeholder="What's your focus this quarter?"
          helpText="Helps us prioritize time-sensitive recommendations."
        />
      </div>
    </div>
  )
}
