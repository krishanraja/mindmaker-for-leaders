import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { SortItem } from '@/hooks/useSort';
import { formatProgress, type SortVerdict } from '@/lib/sortModel';
import { Surface } from '@/components/system/surface';
import { cn } from '@/lib/utils';

/**
 * SortRunner - one piece of work, one screen.
 *
 * Two poles and an escape, exactly as the protocol requires
 * (skills/ctrl-intake/leaves/sort.md):
 *
 *   - Send and Would not send are the only two answers. There is no middle
 *     option and there never will be: the moment a middle exists people default
 *     to it, and the difference between adjacent points on a scale is not
 *     stable enough across a session to be worth anything.
 *   - Skip is an ESCAPE, not a third rating. It is styled as a quiet
 *     non-answer, says out loud that it is left out of everything, and is
 *     excluded from every calculation server-side.
 *   - The one line is asked EVERY time and blocks nothing. It is the highest
 *     value thing this produces: the verdict says what, the line says why, and
 *     the why is the only thing that can become a rule in the person's own
 *     words.
 *
 * After a verdict the screen holds for a beat so the line can still be added
 * (typing cancels the pending auto-advance through onHold, the KitIntake
 * pattern). The page never scrolls: a long piece of work scrolls INSIDE its own
 * card, so the poles never move and never fall off a phone screen.
 *
 * Progress is a count of real screens. Not a percentage: the deck can honestly
 * run short, and a percentage over a moving denominator is a made-up number.
 */

interface SortRunnerProps {
  item: SortItem;
  /** 1-based screen number. */
  screen: number;
  total: number;
  /** Set once this screen has been graded; drives the confirm beat. */
  lastVerdict: SortVerdict | null;
  onGrade: (verdict: SortVerdict, why: string) => void;
  /** Cancel the pending auto-advance (called the moment they start typing). */
  onHold: () => void;
  /** Attach the line to the grade already sent. */
  onAmendWhy: (why: string) => void;
  onNext: () => void;
}

const VERDICT_LABEL: Record<SortVerdict, string> = {
  send: 'Send',
  would_not_send: 'Would not send',
  skip: 'Skipped',
};

export function SortRunner({
  item,
  screen,
  total,
  lastVerdict,
  onGrade,
  onHold,
  onAmendWhy,
  onNext,
}: SortRunnerProps) {
  const [why, setWhy] = useState('');
  const graded = lastVerdict !== null;

  const handleWhyChange = (value: string) => {
    setWhy(value);
    // Typing after a verdict must never race the auto-advance. Same cancel
    // that KitIntake does before it moves a step.
    if (graded) onHold();
  };

  const handleNext = () => {
    if (why.trim()) onAmendWhy(why);
    onNext();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-gobold text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {formatProgress(screen, total)}
        </p>
        {graded && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10.5px] font-semibold text-accent">
            <Check className="h-3 w-3" strokeWidth={3} />
            {VERDICT_LABEL[lastVerdict]}
          </span>
        )}
      </div>

      <Surface className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-foreground">
          {item.body}
        </p>
      </Surface>

      <div className="flex flex-col gap-2.5">
        {!graded && (
          <>
            <p className="text-center text-[14px] font-semibold text-foreground">
              Would you send this?
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onGrade('send', why)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3.5 text-[15px] font-bold text-accent transition-colors hover:bg-accent/20 active:bg-accent/25"
              >
                <Check className="h-4 w-4" strokeWidth={2.5} />
                Send
              </button>
              <button
                type="button"
                onClick={() => onGrade('would_not_send', why)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/60 px-4 py-3.5 text-[15px] font-bold text-foreground transition-colors hover:border-foreground/30 hover:bg-secondary/50 active:bg-secondary"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
                Would not send
              </button>
            </div>
          </>
        )}

        <label className="block">
          <span className="sr-only">What makes it that?</span>
          <input
            type="text"
            value={why}
            onChange={(e) => handleWhyChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && graded) handleNext();
            }}
            placeholder="What makes it that? (optional)"
            maxLength={600}
            className="w-full rounded-2xl border border-border bg-card/40 px-3.5 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:border-accent/40 focus:outline-none"
          />
        </label>

        {graded ? (
          <button
            type="button"
            onClick={handleNext}
            className="w-full rounded-2xl bg-accent px-4 py-3 text-[14.5px] font-bold text-accent-foreground transition-colors hover:bg-accent/90"
          >
            Next
          </button>
        ) : (
          <div className="text-center">
            <button
              type="button"
              onClick={() => onGrade('skip', why)}
              className="text-[12.5px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Skip this one
            </button>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground/70">
              A skip is left out of everything. It is not a middle answer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
