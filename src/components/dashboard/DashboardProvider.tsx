import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { supabase } from "@/integrations/supabase/client"

interface DashboardData {
  baseline: {
    score: number
    tier: string
    percentile: number
  } | null
  weeklyAction: {
    text: string
    why: string
    cta?: string
  } | null
  dailyProvocation: {
    question: string
  } | null
}

interface DashboardContextType {
  data: DashboardData
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

const DashboardContext = createContext<DashboardContextType | null>(null)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData>({
    baseline: null,
    weeklyAction: null,
    dailyProvocation: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch baseline from leaders table
      const { data: leaderData, error: leaderError } = await supabase
        .from('leaders')
        .select('baseline')
        .eq('id', user.id)
        .maybeSingle()

      if (leaderError && leaderError.code !== 'PGRST116') {
        throw leaderError
      }

      // Parse baseline or use defaults
      const baseline = leaderData?.baseline ? {
        score: leaderData.baseline.score || 72,
        tier: leaderData.baseline.tier || "Advancing",
        percentile: leaderData.baseline.percentile || 18,
      } : {
        score: 72,
        tier: "Advancing",
        percentile: 18,
      }

      // Mock weekly action (would come from edge function in production)
      const weeklyAction = {
        text: "Schedule a 15-minute AI exploration session with your team this week.",
        why: "Teams that experiment together build AI confidence 3x faster than individuals.",
        cta: "Schedule Now",
      }

      // Mock daily provocation
      const dailyProvocation = {
        question: "What decision did you make today that AI could have informed better?",
      }

      setData({
        baseline,
        weeklyAction,
        dailyProvocation,
      })
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err as Error)
      // Set fallback data
      setData({
        baseline: { score: 72, tier: "Advancing", percentile: 18 },
        weeklyAction: {
          text: "Schedule a 15-minute AI exploration session with your team this week.",
          why: "Teams that experiment together build AI confidence 3x faster.",
        },
        dailyProvocation: {
          question: "What decision did you make today that AI could have informed better?",
        },
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user?.id])

  return (
    <DashboardContext.Provider value={{ data, loading, error, refresh: fetchData }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}
