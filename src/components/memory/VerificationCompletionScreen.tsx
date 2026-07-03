/**
 * VerificationCompletionScreen Component
 * Celebration screen shown when a verification batch is complete.
 * Features animated checkmark, confetti burst, and milestone copy.
 */

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface VerificationCompletionScreenProps {
  verifiedCount: number;
  rejectedCount: number;
  correctedCount?: number;
  totalUnverified: number;
  verifiedRate: number;
  onDone: () => void;
  onContinue: () => void;
}

function getMilestoneCopy(rate: number): string {
  if (rate >= 100) return 'All memories verified. Your AI knows you well.';
  if (rate >= 75) return 'Almost perfect. Just a few left.';
  if (rate >= 50) return 'Most of your memories are verified.';
  if (rate >= 25) return 'Halfway there. Your memory is more reliable now.';
  return 'Great start! Your AI is getting sharper.';
}

const CONFETTI_COLORS = [
  'bg-emerald-400',
  'bg-accent',
  'bg-amber-400',
  'bg-blue-400',
  'bg-purple-400',
  'bg-rose-400',
];

function ConfettiParticle({ index }: { index: number }) {
  const angle = (index / 8) * Math.PI * 2;
  const distance = 60 + Math.random() * 40;
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;
  const size = 6 + Math.random() * 6;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];

  return (
    <motion.div
      className={cn('absolute rounded-full', color)}
      style={{ width: size, height: size }}
      initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
      animate={{
        x,
        y,
        scale: [0, 1.2, 0.8],
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: 0.8,
        delay: 0.4 + index * 0.04,
        ease: 'easeOut',
      }}
    />
  );
}

export const VerificationCompletionScreen: React.FC<VerificationCompletionScreenProps> = ({
  verifiedCount,
  rejectedCount,
  correctedCount = 0,
  totalUnverified,
  verifiedRate,
  onDone,
  onContinue,
}) => {
  useEffect(() => {
    haptics.success();
  }, []);

  const processedCount = verifiedCount + rejectedCount;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center px-8 py-12 text-center min-h-[60vh]"
    >
      {/* Animated checkmark with confetti */}
      <div className="relative mb-8">
        {/* Confetti particles */}
        <div className="absolute inset-0 flex items-center justify-center">
          {Array.from({ length: 8 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>

        {/* Circle background */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center"
        >
          {/* Checkmark SVG with draw animation */}
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <motion.path
              d="M8 18L15 25L28 11"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-500"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.3, ease: 'easeInOut' }}
            />
          </svg>
        </motion.div>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-2 mb-6"
      >
        <h2 className="text-2xl font-bold text-foreground">
          {verifiedCount > 0
            ? `You verified ${verifiedCount} ${verifiedCount === 1 ? 'memory' : 'memories'}`
            : `${processedCount} ${processedCount === 1 ? 'memory' : 'memories'} reviewed`}
        </h2>
        {rejectedCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {rejectedCount} rejected
          </p>
        )}
      </motion.div>

      {/* Milestone copy */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-sm text-muted-foreground mb-8 max-w-xs"
      >
        {getMilestoneCopy(verifiedRate)}
        {(correctedCount > 0 || rejectedCount > 0) && (
          <>
            {' '}
            {correctedCount > 0
              ? 'The ones you fixed are logged. Future reads start from your version, not my guess.'
              : 'What you rejected is logged. I won\'t infer it again.'}
          </>
        )}
      </motion.p>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        {totalUnverified > 0 && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onContinue}
            className={cn(
              'w-full py-3.5 rounded-xl',
              'bg-accent text-accent-foreground',
              'text-sm font-medium',
              'hover:bg-accent/90 transition-colors',
            )}
          >
            Verify More ({totalUnverified} remaining)
          </motion.button>
        )}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onDone}
          className={cn(
            'w-full py-3.5 rounded-xl',
            'bg-secondary/50 text-foreground',
            'text-sm font-medium',
            'hover:bg-secondary transition-colors',
          )}
        >
          Done
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default VerificationCompletionScreen;
