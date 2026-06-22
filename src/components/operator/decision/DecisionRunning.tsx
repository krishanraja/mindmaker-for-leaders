/**
 * DecisionRunning - the stunning "pressure-testing" thinking state.
 *
 * Faithful to prototypes/decisions-2028.html (.run): the branded orb + a live
 * four-step pipeline (decompose -> read sources -> cross-examine -> weigh) that
 * lights up in sequence. Critically, the pipeline is NEVER faked: it is driven by
 * the REAL useDecisionEngine `stage`, which the engine advances as it actually
 * decomposes, verifies, cross-examines, and advises. The "now doing" label and
 * detail track the same real stage.
 *
 * Stage mapping (real engine stage -> mock pipeline step index):
 *   decomposing      -> 0  Decompose      (into what it rests on)
 *   verifying        -> 1  Read sources   (real, not guessed)
 *   cross_examining  -> 2  Cross-examine  (argue both sides)
 *   advising         -> 3  Weigh          (the honest call)
 *
 * One focus zone, no page scroll. All from ctrl-ds tokens; reduced-motion safe
 * (the orb owns its own reduced-motion guard; the spinner glyph is the only other
 * motion and it is a small, in-place affordance).
 */

import type { Stage } from '@/hooks/useDecisionEngine';
import { DecisionOrb } from './DecisionOrb';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface PipelineStep {
  t: string;
  sub: string;
  lab: string;
  det: string;
}

const STEPS: PipelineStep[] = [
  { t: 'Break it down', sub: 'what it rests on', lab: 'Breaking the decision down', det: 'Splitting your decision into the points it actually depends on.' },
  { t: 'Read sources', sub: 'real, not guessed', lab: 'Reading real sources', det: 'Checking each point against the record, not guessing.' },
  { t: 'Argue both sides', sub: 'for and against', lab: 'Arguing both sides', det: 'Testing where each point is strong and where it is weak.' },
  { t: 'Weigh it up', sub: 'the honest answer', lab: 'Weighing it up', det: "Turning the evidence into what's solid and what's shaky." },
];

// Real engine stage -> active pipeline index. `complete` lands on the last step
// (all done); anything unexpected holds at decompose so we never show a blank.
const STAGE_TO_INDEX: Record<Stage, number> = {
  decomposing: 0,
  verifying: 1,
  cross_examining: 2,
  advising: 3,
  complete: 4,
  error: 3,
};

function StepDot({ state }: { state: 'done' | 'active' | 'todo' }) {
  return (
    <span
      className={cn(
        'relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors',
        state === 'done' && 'border-accent/30 bg-accent/10 text-accent',
        state === 'active' && 'border-accent text-accent shadow-[0_0_0_4px_hsl(var(--accent)/0.1)]',
        state === 'todo' && 'border-border text-muted-foreground/60',
      )}
    >
      {state === 'done' ? (
        <Check className="h-3 w-3" strokeWidth={3} />
      ) : state === 'active' ? (
        <svg className="h-3 w-3 motion-safe:animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
          <path d="M12 3a9 9 0 1 0 9 9" />
        </svg>
      ) : (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3.4" />
        </svg>
      )}
    </span>
  );
}

export function DecisionRunning({
  stage,
  statement,
  isDesktop = false,
}: {
  stage: Stage;
  statement: string;
  isDesktop?: boolean;
}) {
  const activeIdx = Math.min(STAGE_TO_INDEX[stage] ?? 0, STEPS.length);
  const now = STEPS[Math.min(activeIdx, STEPS.length - 1)];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* what we are weighing - quiet, pinned at top */}
      <div className={cn('flex shrink-0 items-center gap-2 rounded-xl border border-border bg-foreground/[0.025] px-3 py-2.5', isDesktop && 'mx-auto w-full max-w-[640px]')}>
        <p className="text-xs leading-snug text-muted-foreground line-clamp-2">
          <span className="font-semibold text-foreground">Weighing:</span> {statement}
        </p>
      </div>

      {/* the orb + status + pipeline, balanced in the remaining height */}
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center">
        <DecisionOrb size={isDesktop ? 160 : 132} />

        <div className="mt-3.5 text-center">
          <p className="text-[17px] font-bold tracking-tight text-foreground sm:text-lg">{now.lab}</p>
          <p className="mx-auto mt-1.5 max-w-[30ch] text-xs leading-snug text-muted-foreground">{now.det}</p>
        </div>

        {/* the live pipeline - one step per real stage, lit in sequence */}
        <ol className={cn('mt-4 flex w-full max-w-[360px] flex-col gap-0.5', isDesktop && 'max-w-[520px]')}>
          {STEPS.map((s, i) => {
            const state: 'done' | 'active' | 'todo' = i < activeIdx ? 'done' : i === activeIdx ? 'active' : 'todo';
            return (
              <li
                key={s.t}
                className={cn('relative flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors', state === 'active' && 'bg-accent/10')}
              >
                {/* connector line between dots */}
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn('absolute left-[22px] top-[34px] h-3 w-px', state === 'done' ? 'bg-accent/30' : 'bg-border')}
                  />
                )}
                <StepDot state={state} />
                <span className={cn('flex-1 text-[13px] font-semibold transition-colors', state === 'todo' ? 'text-muted-foreground/60' : 'text-foreground')}>
                  {s.t}
                </span>
                <span className={cn('text-[11px] font-medium', state === 'active' ? 'text-accent' : 'text-muted-foreground/60')}>{s.sub}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
