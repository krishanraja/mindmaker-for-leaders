import { LoadingCaption } from '@/components/system/SkeletonCard';
import { Surface, Eyebrow } from '@/components/system/surface';
import { cn } from '@/lib/utils';

/**
 * SortPreamble - the face-saving preamble, shown once before the first screen.
 *
 * THE TWO LINES BELOW ARE VERBATIM AND MUST STAY VERBATIM. They are not copy to
 * improve; they are part of a measured instrument, and every clause is doing
 * work (skills/ctrl-intake/leaves/sort.md):
 *
 *   - "Most of these are deliberately mediocre" pre-normalises rejecting, which
 *     is the highest-efficacy debiasing move measured;
 *   - "Some are yours" stops the person pattern-matching for the trap;
 *   - "I will not tell you which" announces the test set once without naming
 *     it, because naming the items contaminates them;
 *   - "nobody else sees this" is the anonymity assurance, and it has to be
 *     specific about who does not see it, because vague reassurance measurably
 *     underperforms.
 *
 * Rewriting any of it changes the measurement. Do not tidy it.
 *
 * It doubles as the honest cover for the build: the deck takes a model call to
 * assemble, and this is the thing worth reading while that happens. The
 * continue button stays disabled until the deck genuinely exists, with the real
 * stage named rather than a spinner over a fake percentage.
 */

const PREAMBLE_LINE_ONE =
  'Most of these are deliberately mediocre. Some are yours. Rejecting a lot of them is the normal result and it is the useful one.';
const PREAMBLE_LINE_TWO =
  'Some of these are a test and I will not tell you which. There is no right answer and nobody else sees this.';

/** The real stage, in plain words. Never a percentage, never a fake step count. */
const STAGE_COPY: Record<string, string> = {
  created: 'Getting started.',
  planning: 'Working out what to show you.',
  generating_pairs: 'Writing the pieces you will look at.',
  assembling: 'Laying them out in order.',
  ready: 'Ready when you are.',
};

interface SortPreambleProps {
  /** The live harness_runs stage. */
  stage: string | null;
  ready: boolean;
  error: string | null;
  onContinue: () => void;
  onRetry: () => void;
  className?: string;
}

export function SortPreamble({
  stage,
  ready,
  error,
  onContinue,
  onRetry,
  className,
}: SortPreambleProps) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col justify-center gap-5', className)}>
      <div>
        <Eyebrow>Before we start</Eyebrow>
        <h2 className="mt-1.5 text-[19px] font-bold leading-tight tracking-[-0.01em] text-foreground">
          Read this once
        </h2>
      </div>

      <Surface accent className="p-5">
        <p className="text-[15px] leading-relaxed text-foreground">{PREAMBLE_LINE_ONE}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground">{PREAMBLE_LINE_TWO}</p>
      </Surface>

      {error ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] leading-relaxed text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="w-full rounded-2xl border border-border bg-card/60 px-4 py-3 text-[14px] font-semibold text-foreground transition-colors hover:border-accent/30 hover:bg-secondary/50"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onContinue}
            disabled={!ready}
            className={cn(
              'w-full rounded-2xl px-4 py-3.5 text-[15px] font-bold transition-colors',
              ready
                ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                : 'cursor-not-allowed border border-border bg-card/40 text-muted-foreground',
            )}
          >
            {ready ? 'Start' : 'Putting it together'}
          </button>
          {!ready && (
            <LoadingCaption>{STAGE_COPY[stage ?? 'created'] ?? 'Getting started.'}</LoadingCaption>
          )}
        </div>
      )}
    </div>
  );
}
