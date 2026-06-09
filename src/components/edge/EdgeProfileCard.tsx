import { motion } from 'framer-motion';
import { Star, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { EdgeStrength, EdgeWeakness, FeedbackType } from '@/types/edge';
import { StrengthPill } from './StrengthPill';
import { GapPill } from './GapPill';

interface Props {
  strengths: EdgeStrength[];
  weaknesses: EdgeWeakness[];
  onFeedback: (type: FeedbackType, key: string) => void;
  isPaid?: boolean;
  onAction?: (capability: string, targetKey: string) => void;
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

export function EdgeProfileCard({
  strengths,
  weaknesses,
  onFeedback,
  isPaid = false,
  onAction = () => {},
}: Props) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-teal-500/10">
                <Star className="h-4 w-4 text-teal-500" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Your Edge</h3>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {strengths.map((s) => (
                <StrengthPill
                  key={s.key}
                  strength={s}
                  onFeedback={onFeedback}
                  isPaid={isPaid}
                  onAction={onAction}
                />
              ))}
              {strengths.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No strengths identified yet. Keep sharing context.
                </p>
              )}
            </motion.div>
          </div>

          {/* Weaknesses column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Your Gaps</h3>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {weaknesses.map((w) => (
                <GapPill
                  key={w.key}
                  weakness={w}
                  onFeedback={onFeedback}
                  isPaid={isPaid}
                  onAction={onAction}
                />
              ))}
              {weaknesses.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No gaps identified yet. Keep sharing context.
                </p>
              )}
            </motion.div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
