import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMissions, useCompleteMission, useExtendMission } from '@/hooks/useMissions';
import type { MomentumLevel } from '@/types/missions';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const momentumConfig: Record<
  MomentumLevel,
  { label: string; color: string; icon: typeof TrendingUp }
> = {
  accelerating: {
    label: 'Accelerating',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    icon: TrendingUp,
  },
  steady: {
    label: 'Steady',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    icon: Minus,
  },
  slowing: {
    label: 'Slowing',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    icon: TrendingDown,
  },
  new: {
    label: 'Getting Started',
    color: 'bg-primary/10 text-primary border-primary/30',
    icon: Star,
  },
};

export function MissionsDashboard() {
  const navigate = useNavigate();
  const { stats, loading, refetch } = useMissions();
  const { completeMission, loading: completing } = useCompleteMission();
  const { extendMission, loading: extending } = useExtendMission();
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  if (loading) {
    return (
      <Card className="border rounded-2xl">
        <CardContent className="p-4">
          <div className="h-20 bg-secondary rounded-xl skeleton-shimmer" />
        </CardContent>
      </Card>
    );
  }

  const { activeMission, completedCount, momentum } = stats;
  const momentumInfo = momentumConfig[momentum];
  const MomentumIcon = momentumInfo.icon;

  // Calculate days remaining
  const daysRemaining = activeMission
    ? Math.max(
        0,
        Math.ceil(
          (new Date(activeMission.check_in_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;
  const totalDays = activeMission
    ? Math.ceil(
        (new Date(activeMission.check_in_date).getTime() -
          new Date(activeMission.created_at || '').getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 14;
  const progressPct = totalDays > 0 ? Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100) : 0;

  const handleComplete = async () => {
    if (!activeMission) return;
    try {
      await completeMission(activeMission.id, completionNotes || undefined);
      setShowCompleteDialog(false);
      setCompletionNotes('');
      refetch();
    } catch (err) {
      console.error('Failed to complete mission:', err);
    }
  };

  const handleExtend = async () => {
    if (!activeMission) return;
    const newDate = new Date(activeMission.check_in_date);
    newDate.setDate(newDate.getDate() + 7);
    try {
      await extendMission(activeMission.id, newDate.toISOString().split('T')[0]);
      refetch();
    } catch (err) {
      console.error('Failed to extend mission:', err);
    }
  };

  // Empty state
  if (!activeMission && completedCount === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border rounded-2xl border-dashed border-muted-foreground/30">
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No active mission</p>
            <p className="text-xs text-muted-foreground mt-1">
              Complete your assessment to get personalized first moves
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border rounded-2xl overflow-hidden">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-semibold text-foreground">Your Mission</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={momentumInfo.color} variant="outline">
                  <MomentumIcon className="h-3 w-3 mr-1" />
                  {momentumInfo.label}
                </Badge>
                {completedCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {completedCount}
                  </Badge>
                )}
              </div>
            </div>

            {activeMission ? (
              <>
                {/* Mission text */}
                <p className="text-sm text-foreground leading-relaxed mb-3">
                  {activeMission.mission_text}
                </p>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {daysRemaining} days left
                    </span>
                    <span>Check-in {new Date(activeMission.check_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <Progress value={progressPct} className="h-1.5" />
                </div>

                {/* CTAs */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setShowCompleteDialog(true)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={handleExtend}
                    disabled={extending}
                  >
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    Extend
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate('/booking?source=mission-help')}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground">
                  All missions completed! Take your next assessment to set a new mission.
                </p>
              </div>
            )}

            {/* History link */}
            {completedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-xs text-muted-foreground"
                onClick={() => navigate('/missions/history')}
              >
                View mission history
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Complete mission dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Complete Mission
            </DialogTitle>
            <DialogDescription>
              How did it go? Share a quick reflection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg">
              {activeMission?.mission_text}
            </p>
            <textarea
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="What happened? What did you learn? (optional)"
              className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowCompleteDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleComplete}
                disabled={completing}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {completing ? 'Saving...' : 'Mark Complete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
