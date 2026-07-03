/**
 * VerificationSwipeStack Component
 * Full-screen swipeable card stack for batch memory verification.
 * Swipe right to verify, left to reject, tap pencil to edit.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { X, Check, Pencil, User, Building, Target, AlertTriangle, Settings, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { VerificationCompletionScreen } from './VerificationCompletionScreen';
import type { PendingVerification, FactCategory } from '@/types/memory';

interface VerificationSwipeStackProps {
  facts: PendingVerification[];
  onVerify: (factId: string, newValue?: string) => Promise<boolean>;
  onReject: (factId: string) => Promise<boolean>;
  onDismiss: () => void;
  onComplete: () => void;
  unverifiedCount: number;
  verifiedRate: number;
  onContinue: () => Promise<void>;
}

const categoryIcons: Record<FactCategory, React.ElementType> = {
  identity: User,
  business: Building,
  objective: Target,
  blocker: AlertTriangle,
  preference: Settings,
};

const categoryColors: Record<FactCategory, string> = {
  identity: 'bg-blue-500/10 text-blue-600',
  business: 'bg-purple-500/10 text-purple-600',
  objective: 'bg-green-500/10 text-green-600',
  blocker: 'bg-orange-500/10 text-orange-600',
  preference: 'bg-gray-500/10 text-gray-600',
};

const swipeVariants = {
  enter: { opacity: 0, y: 30, scale: 0.97 },
  center: { opacity: 1, y: 0, scale: 1, x: 0, rotate: 0 },
  exit: (direction: 'left' | 'right' | null) => ({
    x: direction === 'right' ? 400 : direction === 'left' ? -400 : 0,
    opacity: 0,
    rotate: direction === 'right' ? 12 : direction === 'left' ? -12 : 0,
    transition: { type: 'tween', duration: 0.25, ease: 'easeIn' },
  }),
};

function ProgressRing({ current, total }: { current: number; total: number }) {
  const size = 40;
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const rate = total > 0 ? (current / total) * 100 : 0;
  const offset = circumference - (rate / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-emerald-500"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        />
      </svg>
      <span className="absolute text-[10px] font-semibold text-foreground">
        {current}/{total}
      </span>
    </div>
  );
}

interface SwipeCardProps {
  fact: PendingVerification;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onEdit: () => void;
  isProcessing: boolean;
}

function SwipeCard({ fact, onSwipeRight, onSwipeLeft, onEdit, isProcessing }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const verifyOpacity = useTransform(x, [0, 100], [0, 1]);
  const rejectOpacity = useTransform(x, [-100, 0], [1, 0]);

  const CategoryIcon = categoryIcons[fact.fact_category] || User;
  const categoryColor = categoryColors[fact.fact_category] || categoryColors.identity;

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold || info.velocity.x > 500) {
      onSwipeRight();
    } else if (info.offset.x < -threshold || info.velocity.x < -500) {
      onSwipeLeft();
    }
  };

  return (
    <motion.div
      style={{ x, rotate }}
      drag={isProcessing ? false : 'x'}
      dragConstraints={{ left: -300, right: 300 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.02, zIndex: 10 }}
      variants={swipeVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute inset-0 touch-none"
    >
      <div
        className={cn(
          'relative h-full rounded-3xl border border-border bg-card',
          'shadow-xl overflow-hidden flex flex-col',
        )}
      >
        {/* Swipe overlays */}
        <motion.div
          style={{ opacity: verifyOpacity }}
          className="absolute inset-0 bg-emerald-500/10 rounded-3xl z-10 flex items-center justify-center pointer-events-none"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-emerald-500" />
          </div>
        </motion.div>
        <motion.div
          style={{ opacity: rejectOpacity }}
          className="absolute inset-0 bg-red-500/10 rounded-3xl z-10 flex items-center justify-center pointer-events-none"
        >
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <X className="w-8 h-8 text-red-500" />
          </div>
        </motion.div>

        {/* Card content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 relative z-0">
          {/* Category badge */}
          <div className={cn('px-3 py-1.5 rounded-full flex items-center gap-1.5 mb-6', categoryColor)}>
            <CategoryIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-medium capitalize">{fact.fact_category}</span>
          </div>

          {/* Label */}
          <p className="text-sm text-muted-foreground mb-2">{fact.fact_label}</p>

          {/* Value */}
          <p className="text-2xl font-semibold text-foreground text-center leading-snug mb-4">
            {fact.fact_value}
          </p>

          {/* Context */}
          {fact.fact_context && (
            <p className="text-xs text-muted-foreground/60 italic text-center line-clamp-3 max-w-[280px]">
              "{fact.fact_context}"
            </p>
          )}

          {/* Confidence indicator */}
          {fact.confidence_score < 0.7 && (
            <div className="mt-4 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">
              Low confidence ({Math.round(fact.confidence_score * 100)}%)
            </div>
          )}
        </div>

        {/* Swipe hints */}
        <div className="flex justify-between px-6 pb-4 text-xs text-muted-foreground/40">
          <span>← Reject</span>
          <span>Verify →</span>
        </div>
      </div>
    </motion.div>
  );
}

export const VerificationSwipeStack: React.FC<VerificationSwipeStackProps> = ({
  facts,
  onVerify,
  onReject,
  onDismiss,
  onComplete,
  unverifiedCount,
  verifiedRate,
  onContinue,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [correctedCount, setCorrectedCount] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLearnedNote, setShowLearnedNote] = useState(false);

  // The correction-loop beat: a correction is a signal that persists, and the
  // leader should see that land. Auto-dismisses; never blocks the flow.
  useEffect(() => {
    if (!showLearnedNote) return;
    const timer = setTimeout(() => setShowLearnedNote(false), 2600);
    return () => clearTimeout(timer);
  }, [showLearnedNote]);

  const currentFact = facts[currentIndex];
  const nextFact = facts[currentIndex + 1];
  const processedTotal = verifiedCount + rejectedCount;

  const advanceOrComplete = useCallback(() => {
    if (currentIndex < facts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsComplete(true);
    }
    // Do NOT reset exitDirection here - AnimatePresence needs it for the exit variant
  }, [currentIndex, facts.length]);

  const handleSwipeRight = useCallback(async () => {
    if (!currentFact || isProcessing || isExiting) return;
    setIsProcessing(true);
    setError(null);
    const factId = currentFact.id;
    try {
      const result = await onVerify(factId);
      if (result) {
        setVerifiedCount((prev) => prev + 1);
        setExitDirection('right');
        setIsExiting(true);
        haptics.success();
      } else {
        setError('Could not save. Tap to retry.');
        haptics.error();
      }
    } catch {
      setError('Could not save. Tap to retry.');
      haptics.error();
    } finally {
      setIsProcessing(false);
    }
  }, [currentFact, isProcessing, isExiting, onVerify]);

  const handleSwipeLeft = useCallback(async () => {
    if (!currentFact || isProcessing || isExiting) return;
    setIsProcessing(true);
    setError(null);
    const factId = currentFact.id;
    try {
      const result = await onReject(factId);
      if (result) {
        setRejectedCount((prev) => prev + 1);
        setExitDirection('left');
        setIsExiting(true);
        haptics.medium();
      } else {
        setError('Could not save. Tap to retry.');
        haptics.error();
      }
    } catch {
      setError('Could not save. Tap to retry.');
      haptics.error();
    } finally {
      setIsProcessing(false);
    }
  }, [currentFact, isProcessing, isExiting, onReject]);

  const handleEdit = useCallback(() => {
    if (!currentFact) return;
    setEditingId(currentFact.id);
    setEditValue(currentFact.fact_value);
  }, [currentFact]);

  const handleSaveEdit = useCallback(async () => {
    if (!currentFact || !editValue.trim()) return;
    setIsProcessing(true);
    setError(null);
    const factId = currentFact.id;
    const value = editValue.trim();
    try {
      const result = await onVerify(factId, value);
      if (result) {
        setEditingId(null);
        setEditValue('');
        setVerifiedCount((prev) => prev + 1);
        setCorrectedCount((prev) => prev + 1);
        setShowLearnedNote(true);
        setExitDirection('right');
        setIsExiting(true);
        haptics.success();
      } else {
        setError('Could not save correction. Try again.');
        haptics.error();
      }
    } catch {
      setError('Could not save correction. Try again.');
      haptics.error();
    } finally {
      setIsProcessing(false);
    }
  }, [currentFact, editValue, onVerify]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  const handleContinue = useCallback(async () => {
    await onContinue();
    setCurrentIndex(0);
    setVerifiedCount(0);
    setRejectedCount(0);
    setCorrectedCount(0);
    setIsComplete(false);
    setExitDirection(null);
  }, [onContinue]);

  const remainingUnverified = Math.max(0, unverifiedCount - processedTotal);

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background"
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-end p-4">
            <button
              onClick={onDismiss}
              className="p-2 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <VerificationCompletionScreen
              verifiedCount={verifiedCount}
              rejectedCount={rejectedCount}
              correctedCount={correctedCount}
              totalUnverified={remainingUnverified}
              verifiedRate={verifiedRate}
              onDone={onDismiss}
              onContinue={handleContinue}
            />
          </div>
        </div>
        <div className="h-safe pb-safe sm:hidden" />
      </motion.div>
    );
  }

  if (!currentFact) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background"
    >
      <div className="h-full flex flex-col safe-area-inset">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
          <button
            onClick={onDismiss}
            className="p-2 rounded-xl hover:bg-secondary/50 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground font-medium">
              {currentIndex + 1} of {facts.length}
            </span>
          </div>

          <ProgressRing current={processedTotal} total={facts.length} />
        </div>

        {/* Card stack area */}
        <div className="flex-1 min-h-0 px-5 pb-4 relative">
          {/* Next card peek - outside AnimatePresence so it's always visible underneath */}
          {nextFact && !editingId && (
            <motion.div
              key={nextFact.id}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 0.3, scale: 0.95, y: 8 }}
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 0 }}
            >
              <div className="h-full rounded-3xl border border-border bg-card shadow-lg" />
            </motion.div>
          )}

          <AnimatePresence
            mode="popLayout"
            initial={false}
            custom={exitDirection}
            onExitComplete={() => {
              setIsExiting(false);
              advanceOrComplete();
              setExitDirection(null);
            }}
          >
            {editingId === currentFact.id ? (
              /* Edit mode */
              <motion.div
                key="edit"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 flex flex-col"
              >
                <div
                  className={cn(
                    'flex-1 rounded-3xl border border-border bg-card',
                    'shadow-xl overflow-hidden flex flex-col',
                  )}
                >
                  <div className="flex-1 flex flex-col items-center justify-center px-8 py-6">
                    <p className="text-sm text-muted-foreground mb-4">
                      {currentFact.fact_label}
                    </p>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                      className={cn(
                        'w-full px-4 py-3 rounded-xl text-center',
                        'bg-secondary/50 border border-border',
                        'text-foreground text-lg font-medium',
                        'focus:outline-none focus:ring-2 focus:ring-accent/30',
                      )}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    {currentFact.fact_context && (
                      <p className="text-xs text-muted-foreground/60 italic text-center mt-4 line-clamp-2">
                        "{currentFact.fact_context}"
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 px-6 pb-6">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCancelEdit}
                      className={cn(
                        'flex-1 py-3.5 rounded-xl',
                        'bg-secondary/50 text-muted-foreground text-sm font-medium',
                        'hover:bg-secondary transition-colors',
                      )}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSaveEdit}
                      disabled={!editValue.trim() || isProcessing}
                      className={cn(
                        'flex-1 py-3.5 rounded-xl',
                        'bg-accent text-accent-foreground text-sm font-medium',
                        'hover:bg-accent/90 transition-colors',
                        'flex items-center justify-center gap-2',
                        (!editValue.trim() || isProcessing) && 'opacity-50',
                      )}
                    >
                      <Check className="w-4 h-4" />
                      Save
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ) : !isExiting ? (
              /* Swipe card - direct child of AnimatePresence for proper exit animations */
              <SwipeCard
                key={currentFact.id}
                fact={currentFact}
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={handleSwipeLeft}
                onEdit={handleEdit}
                isProcessing={isProcessing}
              />
            ) : null}
          </AnimatePresence>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={() => setError(null)}
                className="absolute bottom-2 left-0 right-0 mx-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2 z-10"
              >
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Learned banner - a correction just persisted as a signal */}
          <AnimatePresence>
            {showLearnedNote && !error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-2 left-0 right-0 mx-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 z-10 pointer-events-none"
              >
                <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-sm text-emerald-500">
                  Fixed. I noted what I got wrong - I won't infer that again.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        {editingId === null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-5 px-6 pb-6 flex-shrink-0"
          >
            {/* Reject button */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleSwipeLeft}
              disabled={isProcessing}
              className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center',
                'bg-red-500/10 border-2 border-red-500/20',
                'text-red-500 hover:bg-red-500/20 transition-colors',
                isProcessing && 'opacity-50',
              )}
              aria-label="Reject"
            >
              <X className="w-6 h-6" />
            </motion.button>

            {/* Edit button */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleEdit}
              disabled={isProcessing}
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                'bg-secondary/50 border-2 border-border',
                'text-muted-foreground hover:bg-secondary transition-colors',
                isProcessing && 'opacity-50',
              )}
              aria-label="Edit"
            >
              <Pencil className="w-5 h-5" />
            </motion.button>

            {/* Verify button */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleSwipeRight}
              disabled={isProcessing}
              className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center',
                'bg-emerald-500/10 border-2 border-emerald-500/20',
                'text-emerald-500 hover:bg-emerald-500/20 transition-colors',
                isProcessing && 'opacity-50',
              )}
              aria-label="Verify"
            >
              <Check className="w-6 h-6" />
            </motion.button>
          </motion.div>
        )}

        {/* Safe area padding */}
        <div className="h-safe pb-safe sm:hidden" />
      </div>
    </motion.div>
  );
};

export default VerificationSwipeStack;
