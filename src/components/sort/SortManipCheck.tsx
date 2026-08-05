import { useState } from 'react';
import type { SortItem } from '@/hooks/useSort';
import { Surface, Eyebrow } from '@/components/system/surface';
import { cn } from '@/lib/utils';

/**
 * SortManipCheck - the one open question, asked three times.
 *
 * CH-09. The original form of this question asserted its own answer ("those two
 * were meant to differ in one way: one names a specific client fact and the
 * other does not. Is that the difference you saw?") and then asked for
 * agreement. Acquiescence points at "yes", "yes" is fully consistent with a
 * pair that differs on two things, and a phase-gating decision was resting on
 * three biased binary samples. So:
 *
 *   - the question is OPEN and it is asked FIRST. Nothing about the intended
 *     difference is on screen until their own words have been sent. The hook
 *     keeps the answer key in a ref precisely so this component cannot render
 *     it early even by mistake.
 *   - there is no yes/no anywhere in here, and no option that names a
 *     dimension for them.
 *   - passing is real. Skip sends nothing and reveals nothing, because a
 *     reveal without a committed answer teaches them the shape of the test for
 *     the remaining screens and buys no diagnostic at all.
 *
 * Both pieces have already been graded by the time this appears, and which one
 * they sent is never shown: this asks what is different, not what they did.
 */

/** Enough to recognise it again; they have already read the whole thing. */
const EXCERPT_CHARS = 260;

function excerpt(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= EXCERPT_CHARS) return trimmed;
  return `${trimmed.slice(0, EXCERPT_CHARS).trimEnd()}...`;
}

interface SortManipCheckProps {
  first: SortItem;
  second: SortItem;
  submitting: boolean;
  /** True once the answer has been sent and the reveal may be shown. */
  revealed: boolean;
  /** What those two were testing. null once revealed means no note was stored. */
  dimension: string | null;
  onSubmit: (answer: string) => void;
  onSkip: () => void;
  onContinue: () => void;
  className?: string;
}

export function SortManipCheck({
  first,
  second,
  submitting,
  revealed,
  dimension,
  onSubmit,
  onSkip,
  onContinue,
  className,
}: SortManipCheckProps) {
  const [answer, setAnswer] = useState('');
  const canSubmit = answer.trim().length > 0 && !submitting;

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-4', className)}>
      <div>
        <Eyebrow>One quick question</Eyebrow>
        <h2 className="mt-1.5 text-[18px] font-bold leading-tight tracking-[-0.01em] text-foreground">
          You have seen both of these
        </h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
        {[first, second].map((item, index) => (
          <Surface key={item.id} className="p-3.5">
            <p className="font-gobold text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {index === 0 ? 'One of them' : 'The other one'}
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
              {excerpt(item.body)}
            </p>
          </Surface>
        ))}
      </div>

      {revealed ? (
        <div className="flex flex-col gap-3">
          <Surface accent className="p-4">
            <Eyebrow>What those two were testing</Eyebrow>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-foreground">
              {dimension ?? 'I do not have a note on what those two were testing.'}
            </p>
            <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
              There was no right answer. Your line tells me whether those two really differed on one
              thing, which is the part of this I cannot check on my own.
            </p>
          </Surface>
          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded-2xl bg-accent px-4 py-3.5 text-[15px] font-bold text-accent-foreground transition-colors hover:bg-accent/90"
          >
            Keep going
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <p className="text-[14.5px] font-semibold leading-snug text-foreground">
            In one line, what is the difference between those two?
          </p>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={2}
            maxLength={600}
            placeholder="In your own words"
            className="w-full resize-none rounded-2xl border border-border bg-card/40 px-3.5 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:border-accent/40 focus:outline-none"
          />
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onSubmit(answer)}
            className={cn(
              'w-full rounded-2xl px-4 py-3.5 text-[15px] font-bold transition-colors',
              canSubmit
                ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                : 'cursor-not-allowed border border-border bg-card/40 text-muted-foreground',
            )}
          >
            {submitting ? 'Sending' : 'Done'}
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={onSkip}
              className="text-[12.5px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Skip this question
            </button>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground/70">
              Nobody else sees this.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
