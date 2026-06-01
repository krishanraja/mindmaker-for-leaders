import * as React from "react"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BaselineCard } from "./BaselineCard"
import { TensionsCard } from "./TensionsCard"
import { RiskSignalsCard } from "./RiskSignalsCard"
import { useAuth } from "@/components/auth/AuthProvider"
import { supabase } from "@/integrations/supabase/client"

interface PulseData {
  baseline: {
    score: number
    tier: string
    percentile: number
  }
  tensions: Array<{
    id: string
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
  }>
  risks: Array<{
    id: string
    title: string
    level: 'high' | 'medium' | 'low'
  }>
}

export function StrategicPulse() {
  const { user } = useAuth()
  const [data, setData] = useState<PulseData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPulseData = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        // Fetch baseline from leaders table
        const { data: leaderData } = await supabase
          .from('leaders')
          .select('baseline')
          .eq('id', user.id)
          .maybeSingle()

        // Use real data or defaults
        setData({
          baseline: leaderData?.baseline || {
            score: 72,
            tier: "Advancing",
            percentile: 18,
          },
          tensions: [], // Would come from edge function
          risks: [], // Would come from edge function
        })
      } catch (error) {
        console.error('Error fetching pulse data:', error)
        // Set fallback data
        setData({
          baseline: { score: 72, tier: "Advancing", percentile: 18 },
          tensions: [],
          risks: [],
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPulseData()
  }, [user?.id])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 bg-secondary rounded-2xl skeleton-shimmer" />
        <div className="h-32 bg-secondary rounded-2xl skeleton-shimmer" />
        <div className="h-32 bg-secondary rounded-2xl skeleton-shimmer" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No pulse data available
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <BaselineCard baseline={data.baseline} />
      <TensionsCard tensions={data.tensions} />
      <RiskSignalsCard risks={data.risks} />
    </motion.div>
  )
}
