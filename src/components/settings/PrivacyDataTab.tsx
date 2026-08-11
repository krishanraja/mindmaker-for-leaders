// src/components/settings/PrivacyDataTab.tsx
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, ShieldCheck, Brain, User, Building2, Target, Construction, Settings2, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  FACT_CATEGORY_META,
  type FactCategory,
  type UserMemoryFact,
} from '@/types/memory'
import { PrivacyControlsPanel } from '@/components/memory/PrivacyControlsPanel'

const CATEGORY_ORDER: FactCategory[] = [
  'identity',
  'business',
  'objective',
  'blocker',
  'preference',
]

export function PrivacyDataTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [facts, setFacts] = useState<UserMemoryFact[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadMemories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadMemories = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_memory')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .order('confidence_score', { ascending: false })

      if (error) throw error
      setFacts((data ?? []) as UserMemoryFact[])
    } catch (error) {
      console.error('Error loading memories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (factId: string) => {
    const confirmed = confirm('Delete this fact? This cannot be undone.')
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('user_memory')
        .delete()
        .eq('id', factId)

      if (error) throw error

      setFacts(facts.filter((f) => f.id !== factId))

      toast({
        title: 'Deleted',
        description: 'Fact removed from your memory',
      })
    } catch (error) {
      console.error('Error deleting fact:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete fact',
        variant: 'destructive',
      })
    }
  }

  const handleExportData = async () => {
    try {
      const { data: profileData } = await supabase
        .from('leaders')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle()

      const { data: memoryData } = await supabase
        .from('user_memory')
        .select('*')
        .eq('user_id', user?.id)

      const exportData = {
        profile: profileData,
        memory: memoryData,
        exportedAt: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mindmaker-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'Export Complete',
        description: 'Your data has been downloaded',
      })
    } catch (error) {
      console.error('Error exporting data:', error)
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'destructive',
      })
    }
  }

  const grouped = useMemo(() => {
    const buckets: Record<FactCategory, UserMemoryFact[]> = {
      identity: [],
      business: [],
      objective: [],
      blocker: [],
      preference: [],
    }
    for (const fact of facts) {
      const cat = (fact.fact_category ?? 'preference') as FactCategory
      if (buckets[cat]) buckets[cat].push(fact)
      else buckets.preference.push(fact)
    }
    return buckets
  }, [facts])

  const CategoryIcon = ({ category }: { category: FactCategory }) => {
    const icons: Record<FactCategory, typeof User> = {
      identity: User,
      business: Building2,
      objective: Target,
      blocker: Construction,
      preference: Settings2,
    }
    const Icon = icons[category] ?? FileText
    return <Icon className="h-4 w-4 text-accent" />
  }

  return (
    <div className="space-y-6">
      <PrivacyControlsPanel />

      {/* User Memory */}
      <div className="bg-card p-6 rounded-2xl border border-border">
        <div className="flex items-start justify-between mb-2 gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">User Memory</h3>
            <p className="text-sm text-muted-foreground">
              These facts were extracted from your conversations. You can delete any
              incorrect information.
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {facts.length} facts
          </Badge>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : facts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No facts captured yet</p>
        ) : (
          <div className="space-y-5 mt-4">
            {CATEGORY_ORDER.filter((cat) => grouped[cat].length > 0).map((cat) => {
              const meta = FACT_CATEGORY_META[cat]
              const items = grouped[cat]
              return (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CategoryIcon category={cat} />
                    <h4 className="text-sm font-semibold text-foreground">
                      {meta?.label ?? cat}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      ({items.length})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {items.map((fact) => {
                      const confidencePct = Math.round(
                        (fact.confidence_score ?? 0) * 100,
                      )
                      const isVerified =
                        fact.verification_status === 'verified' ||
                        fact.verification_status === 'corrected'
                      return (
                        <div
                          key={fact.id}
                          className="flex items-start justify-between bg-secondary p-3 rounded-md"
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-muted-foreground">
                                {fact.fact_label || fact.fact_key}
                              </span>
                              {isVerified ? (
                                <Badge
                                  variant="outline"
                                  className="h-5 px-1.5 text-[10px] gap-1 border-accent/40 text-accent"
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  Verified
                                </Badge>
                              ) : fact.verification_status === 'inferred' ? (
                                <Badge
                                  variant="outline"
                                  className="h-5 px-1.5 text-[10px] gap-1 border-amber-500/40 text-amber-500"
                                >
                                  <Brain className="w-3 h-3" />
                                  Inferred
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-sm text-foreground mt-0.5 break-words">
                              {fact.fact_value}
                            </p>
                            {fact.fact_context && (
                              <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
                                {fact.fact_context}
                              </p>
                            )}
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Confidence {confidencePct}%
                              {fact.source_type ? ` · ${fact.source_type}` : ''}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(fact.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Data Export */}
      <div className="bg-card p-6 rounded-2xl border border-border">
        <h3 className="text-lg font-semibold mb-2 text-foreground">Data Export</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Download all your profile and memory data in JSON format
        </p>
        <Button variant="outline" onClick={handleExportData}>
          Download All Data
        </Button>
      </div>

      {/* Account Deletion */}
      <div className="bg-card p-6 rounded-2xl border border-destructive/30">
        <h3 className="text-lg font-semibold mb-2 text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all data. This action cannot be undone.
        </p>
        <Button variant="destructive">Delete Account</Button>
      </div>
    </div>
  )
}
