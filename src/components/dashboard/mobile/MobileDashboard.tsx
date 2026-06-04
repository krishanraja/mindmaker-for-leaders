import * as React from "react"
import { motion } from "framer-motion"
import { useDashboard } from "../DashboardProvider"
import { HeroStatusCard } from "../HeroStatusCard"
import { WeeklyActionCard } from "../WeeklyActionCard"
import { DailyProvocationCard } from "../DailyProvocationCard"
import { BriefingCard } from "../BriefingCard"
import { DecisionInboxCard } from "@/components/operator/decision/DecisionInboxCard"
import { BottomNav } from "./BottomNav"
import { useAuth } from "@/components/auth/AuthProvider"
import { MissionsDashboard } from "@/components/missions/MissionsDashboard"
import { useTodaysBriefing } from "@/hooks/useBriefing"
import { useBriefingContext } from "@/contexts/BriefingContext"
import { BriefingSheet, MiniPlayer } from "@/components/briefing"

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

export function MobileDashboard() {
  const { data, loading } = useDashboard()
  const { user } = useAuth()
  const firstName = user?.email?.split('@')[0] || 'there'
  const { briefing, loading: briefingLoading } = useTodaysBriefing()
  const { setBriefing, setSheetOpen, playback } = useBriefingContext()

  // Sync briefing into context
  React.useEffect(() => {
    if (briefing) setBriefing(briefing)
  }, [briefing, setBriefing])

  const handlePlayBriefing = () => {
    if (briefing) {
      setBriefing(briefing)
      setSheetOpen(true)
    }
  }

  return (
    <div className="h-screen-safe overflow-hidden flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 px-4 pt-4 pb-2">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-sm text-muted-foreground">Good {getGreeting()}</p>
          <h1 className="text-xl font-semibold capitalize">{firstName}</h1>
        </motion.div>
      </header>

      {/* Content */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 pb-24 scrollbar-hide">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="space-y-4 py-4"
        >
          {loading ? (
            <>
              <div className="h-40 bg-secondary rounded-2xl skeleton-shimmer" />
              <div className="h-32 bg-secondary rounded-2xl skeleton-shimmer" />
              <div className="h-32 bg-secondary rounded-2xl skeleton-shimmer" />
            </>
          ) : (
            <>
              {data.baseline && <HeroStatusCard baseline={data.baseline} />}
              {briefing && !briefingLoading && (
                <BriefingCard
                  briefing={briefing}
                  hasListened={playback.hasListened}
                  onPlay={handlePlayBriefing}
                />
              )}
              <DecisionInboxCard />
              <MissionsDashboard />
              {data.weeklyAction && <WeeklyActionCard action={data.weeklyAction} />}
              {data.dailyProvocation && <DailyProvocationCard provocation={data.dailyProvocation} />}
            </>
          )}
        </motion.div>
      </main>

      {/* Navigation */}
      <MiniPlayer />
      <BottomNav />
      <BriefingSheet />
    </div>
  )
}
