/**
 * DecisionRunning - the stunning "pressure-testing" thinking state.
 *
 * The show is NEVER faked: every element is driven by the REAL engine state as
 * useDecisionEngine polls it (decisionRunningModel maps it 1:1):
 *   - 'reading' is the genuinely in-flight kickoff (engine.starting);
 *   - the statement chip morphs into the engine's real sharpened title when the
 *     reframe/title row lands ("I understood you" made visible);
 *   - the six forces light up as the engine labels them or lands claims on them;
 *   - each claim line IS a decision_claims row, its verdict badge flipping live
 *     from "Checking" to the real verdict as verify writes it;
 *   - the footer strip + "N of M points checked" is the honest progress.
 * The only artifice is reveal animation on already-real data (the KitBuildTrace
 * precedent). Reduced-motion collapses every entrance to a plain fade.
 *
 * One focus zone, no page scroll: the claim list is capped (5 mobile / 7 desktop)
 * and the middle zone clips rather than scrolls.
 */

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { DecisionCase, DecisionClaim } from '@/hooks/useDecisionEngine';
import { buildRunningModel, RUNNING_STEP_COUNT, type RunningStage } from './decisionRunningModel';
import { VERDICT_STYLE } from './decisionParts';
import { DecisionOrb } from './DecisionOrb';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

function VerdictBadge({ verdict }: { verdict: DecisionClaim['verdict'] }) {
  const v = VERDICT_STYLE[verdict];
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-bold', v.cls)}>
      <v.Icon className={cn('h-2.5 w-2.5', verdict === 'pending' && 'motion-safe:animate-spin')} />
      {v.label}
    </span>
  );
}

export function DecisionRunning({
  stage,
  statement,
  decisionCase = null,
  claims = [],
  isDesktop = false,
}: {
  stage: RunningStage;
  statement: string;
  decisionCase?: DecisionCase | null;
  claims?: DecisionClaim[];
  isDesktop?: boolean;
}) {
  const reduced = useReducedMotion();
  const model = buildRunningModel(stage, decisionCase, claims, isDesktop ? 7 : 5);
  const hasLines = model.claimLines.length > 0;
  const litCount = model.forces.filter((f) => f.lit).length;

  const enter = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* what we are weighing - morphs into the engine's real sharpened framing when it lands */}
      <div
        className={cn(
          'shrink-0 rounded-xl border px-3 py-2.5 transition-colors duration-500',
          model.sharpened ? 'border-accent/25 bg-accent/[0.05]' : 'border-border bg-foreground/[0.025]',
          isDesktop && 'mx-auto w-full max-w-[640px]',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {model.sharpened ? (
            <motion.div key="sharpened" {...enter} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-accent">
                <Sparkles className="h-3 w-3" />I sharpened it to
              </p>
              <p className="mt-0.5 text-xs font-semibold leading-snug text-foreground line-clamp-2">{model.sharpened.title}</p>
              {model.sharpened.note && (
                <p className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground line-clamp-1">{model.sharpened.note}</p>
              )}
            </motion.div>
          ) : (
            <motion.p key="raw" {...enter} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="text-xs leading-snug text-muted-foreground line-clamp-2">
              <span className="font-semibold text-foreground">Weighing:</span> {statement}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* the orb + live stage caption + the deconstruction, balanced in the remaining height */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden">
        <DecisionOrb size={hasLines ? (isDesktop ? 116 : 92) : isDesktop ? 160 : 132} />

        <div className={cn('shrink-0 text-center', hasLines ? 'mt-2.5' : 'mt-3.5')}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={model.headline} {...enter} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <p className={cn('font-bold tracking-tight text-foreground', hasLines ? 'text-[15px]' : 'text-[17px] sm:text-lg')}>{model.headline}</p>
              <p className="mx-auto mt-1 max-w-[34ch] text-xs leading-snug text-muted-foreground">{model.detail}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* the six forces, lighting up as the engine really touches them */}
        <div className={cn('mt-3 flex w-full max-w-[360px] shrink-0 flex-wrap items-center justify-center gap-1.5', isDesktop && 'max-w-[560px]')}>
          {model.forces.map((f, i) => (
            <motion.span
              key={f.key}
              initial={false}
              animate={f.lit ? { opacity: 1, scale: 1 } : { opacity: 0.45, scale: reduced ? 1 : 0.97 }}
              transition={{ duration: 0.35, delay: reduced ? 0 : i * 0.05 }}
              className={cn(
                'max-w-[46vw] truncate rounded-full border px-2.5 py-1 text-[10.5px] font-bold transition-colors duration-500 sm:max-w-[220px]',
                f.lit ? 'border-accent/35 bg-accent/[0.08] text-accent' : 'border-border bg-foreground/[0.02] text-muted-foreground/70',
              )}
            >
              {f.label ?? f.name}
            </motion.span>
          ))}
        </div>

        {/* the claim lines: real decision_claims rows landing, verdicts flipping live */}
        {hasLines && (
          <ul className={cn('mt-3 flex w-full max-w-[400px] min-h-0 flex-col gap-1 overflow-hidden', isDesktop && 'max-w-[560px]')}>
            <AnimatePresence initial={false}>
              {model.claimLines.map((line) => (
                <motion.li
                  key={line.id}
                  layout={!reduced}
                  {...enter}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 rounded-lg border border-border bg-foreground/[0.02] px-2.5 py-1.5"
                >
                  <span className={cn('min-w-0 flex-1 truncate text-[11.5px] leading-snug', line.loadBearing ? 'font-semibold text-foreground' : 'text-foreground/80')}>
                    {line.text}
                  </span>
                  <VerdictBadge verdict={line.verdict} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* honest progress footer: the stage strip + how many points are really checked */}
      <div className="flex shrink-0 items-center justify-center gap-3 pb-1 pt-2">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {Array.from({ length: RUNNING_STEP_COUNT }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-500',
                i < model.stageIndex ? 'w-1.5 bg-accent/50'
                  : i === model.stageIndex ? 'w-5 bg-accent shadow-[0_0_8px_hsl(var(--accent)/0.5)]'
                    : 'w-1.5 bg-border',
              )}
            />
          ))}
        </div>
        {model.totalClaims > 0 && (
          <p className="text-[10.5px] font-semibold text-muted-foreground">
            {model.checkedCount} of {model.totalClaims} points checked
          </p>
        )}
        {model.totalClaims === 0 && litCount > 0 && (
          <p className="text-[10.5px] font-semibold text-muted-foreground">{litCount} of 6 forces mapped</p>
        )}
      </div>
    </div>
  );
}
