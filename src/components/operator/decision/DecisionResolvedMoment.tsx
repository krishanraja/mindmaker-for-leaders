/**
 * DecisionResolvedMoment - the world-class beat between closing one decision and
 * voicing the next. Two beats, one ask per screen:
 *
 *   1. CLOSURE: a spring-in emerald check inside a ring (echoing the DecisionOrb
 *      geometry), the resolved statement, and an honest outcome-keyed line. This
 *      is a celebration, not a loading state - the resolve write has ALREADY
 *      committed when this renders, so a fixed beat is honest. Auto-advances
 *      (~1.4s); tap anywhere to skip.
 *   2. THE ASK: "What's the next big call on your plate?" with the full capture
 *      (type or talk) embedded, so the natural next move IS loading the next
 *      decision. Quiet secondary exits underneath: open decisions / history.
 *
 * Fits the no-scroll MobileFrame column and centers like DecisionCold on desktop.
 * Reduced-motion renders the check static and still advances on the same timer.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { PlayedOut } from '@/types/track-record';
import { resolvedMomentCopy } from './resolveFlow';
import { DecisionCapture } from './DecisionCapture';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const CLOSURE_MS = 1400;

function ClosureCheck({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
      animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className="relative grid h-24 w-24 place-items-center"
      aria-hidden="true"
    >
      {/* the ring, echoing the orb's instrument geometry */}
      <span className="absolute inset-0 rounded-full border border-accent/30" />
      <span className="absolute inset-2 rounded-full border border-accent/15" />
      <span className="absolute inset-0 rounded-full bg-accent/[0.06] shadow-[0_0_40px_-8px_hsl(var(--accent)/0.45)]" />
      <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-b from-accent to-accent text-accent-foreground shadow-[0_10px_24px_-10px_hsl(var(--accent)/0.7)]">
        <Check className="h-6 w-6" strokeWidth={3.2} />
      </span>
    </motion.div>
  );
}

export function DecisionResolvedMoment({
  statement,
  playedOut,
  openCount,
  resolvedCount,
  captureValue,
  onCaptureChange,
  onWeigh,
  starting,
  onOpenNext,
  onSeeHistory,
  isDesktop = false,
}: {
  statement: string;
  playedOut: PlayedOut;
  openCount: number;
  resolvedCount: number;
  captureValue: string;
  onCaptureChange: (v: string) => void;
  onWeigh: () => void;
  starting: boolean;
  onOpenNext: () => void;
  onSeeHistory: () => void;
  isDesktop?: boolean;
}) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<'closure' | 'ask'>('closure');
  const copy = resolvedMomentCopy(playedOut, resolvedCount);

  const advance = () => setPhase((p) => (p === 'closure' ? 'ask' : p));

  useEffect(() => {
    if (phase !== 'closure') return;
    const t = setTimeout(() => { advance(); haptics.light(); }, CLOSURE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className="flex h-full min-h-0 flex-col justify-center">
      <div className={cn('min-h-0', isDesktop && 'mx-auto w-full max-w-[620px]')}>
        <AnimatePresence mode="wait" initial={false}>
          {phase === 'closure' ? (
            <motion.button
              key="closure"
              type="button"
              onClick={() => { advance(); haptics.light(); }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="flex w-full cursor-default flex-col items-center gap-4 text-center outline-none"
              aria-label="Decision closed. Continue."
            >
              <ClosureCheck reduced={Boolean(reduced)} />
              <div>
                <h1 className={cn('font-extrabold tracking-tight text-foreground', isDesktop ? 'text-[23px]' : 'text-[22px]')}>
                  {copy.headline}
                </h1>
                <p className="mx-auto mt-2 max-w-[44ch] text-[13px] leading-relaxed text-muted-foreground text-pretty">
                  {copy.sub}
                  {copy.record ? ` ${copy.record}` : ''}
                </p>
              </div>
              <p className="max-w-[46ch] rounded-xl border border-border bg-foreground/[0.02] px-3 py-2 text-xs leading-snug text-muted-foreground line-clamp-2">
                {statement}
              </p>
            </motion.button>
          ) : (
            <motion.div
              key="ask"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <h1 className={cn('font-extrabold tracking-tight text-foreground', isDesktop ? 'text-[23px]' : 'text-[22px]')}>
                What's the next big call on your plate?
              </h1>
              <p className={cn('mt-2 leading-relaxed text-muted-foreground text-pretty', isDesktop ? 'max-w-[48ch] text-sm' : 'text-[13px]')}>
                Say it or type it. I'll pull it apart before you commit.
              </p>
              <div className="mt-4">
                <DecisionCapture
                  value={captureValue}
                  onChange={onCaptureChange}
                  onStart={onWeigh}
                  starting={starting}
                  autoFocus={isDesktop}
                  isDesktop={isDesktop}
                />
              </div>
              <div className="mt-4 flex items-center justify-center gap-3 text-[11.5px] text-muted-foreground">
                {openCount > 0 && (
                  <>
                    <button type="button" onClick={() => { onOpenNext(); haptics.light(); }} className="font-semibold transition-colors hover:text-foreground">
                      Open decisions ({openCount})
                    </button>
                    <span aria-hidden className="text-muted-foreground/40">&middot;</span>
                  </>
                )}
                <button type="button" onClick={() => { onSeeHistory(); haptics.light(); }} className="font-semibold transition-colors hover:text-foreground">
                  See history
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
