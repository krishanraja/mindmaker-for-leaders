import { Surface, Eyebrow } from '@/components/system/surface';
import type { SortSelfAgreement, SortSplit } from '@/hooks/useSort';
import {
  canReportSelfAgreement,
  canReportSplit,
  formatProgress,
  selectBeat,
  shortfallNotes,
  type Beat,
  type SortRunDetail,
  type WhyLine,
} from '@/lib/sortModel';
import { cn } from '@/lib/utils';

/**
 * SortRevealPanel - what is taking shape, live, while they grade.
 *
 * Desktop: the right pane, the same two-pane idea as AutomatorScaffold. Mobile:
 * a compact strip pinned under the card, never a sheet, because a sheet that
 * covers the piece of work turns a grading screen into a reading screen.
 *
 * Every beat here is gated on the thing it claims actually existing
 * (src/lib/sortModel.ts selects it, and the honest-fire predicate is tested):
 *
 *   - the first four screens say plainly that this is raw signal, not a
 *     pattern. No construct is named, because none has been separated yet.
 *   - the first line in their own words only lands when there is a line about
 *     something they KEPT and a line about something they DROPPED. One side
 *     alone is a preference, and quoting it as a distinction would be inventing
 *     the other half.
 *   - nothing about whether a rule separates their work appears before the
 *     backend's can_show_kill is true (never before screen 16, and only when
 *     both sides of the split are on the board). When it is not true the panel
 *     says it is still watching. A staged beat at a fixed screen number,
 *     rendered when the computation cannot run, is exactly the faked green tick
 *     this instrument exists to prevent (CH-03).
 *   - screen 20 shows their own lines back, unranked and unweighted, and NOT
 *     the compiled standard. About a third of the test set is still ungraded
 *     there, and grading it against a standard they had just read and endorsed
 *     would inflate the one number this whole thing calls earned (CH-08).
 *   - the standard and the numbers belong after the last screen.
 */

interface BeatCopy {
  eyebrow: string;
  headline: string;
  /** Sentences under the headline. */
  body: string[];
  /** Their own words, rendered as quotes. */
  quotes?: string[];
  note?: string;
}

function beatCopy(beat: Beat, total: number): BeatCopy {
  const tally =
    beat.kept + beat.dropped === 0
      ? 'Nothing yet.'
      : `${beat.kept} kept, ${beat.dropped} dropped so far.`;

  switch (beat.kind) {
    case 'first_construct':
      return {
        eyebrow: 'In your words',
        headline: `You reject these when "${beat.reject}".`,
        body: [`You keep them when "${beat.keep}".`],
        note: 'Nobody told me that. You did.',
      };

    case 'separation_ready':
      return {
        eyebrow: 'Enough on both sides',
        headline: 'A rule can now be tested against your own work.',
        body: [
          `${tally} That is enough of each for me to check whether a rule actually separates what you keep from what you drop.`,
          'Which of your rules survive that check gets decided after the last screen, not now.',
        ],
      };

    case 'watching':
      return {
        eyebrow: 'Still watching',
        headline: 'Not enough on both sides yet.',
        body: [
          tally,
          'I cannot check whether a rule really separates your work until there is enough of each. Until then I am not going to pretend I can.',
        ],
      };

    case 'constructs_so_far':
      return {
        eyebrow: 'What you have said so far',
        headline: 'Your own lines, back to you.',
        body: [],
        quotes: beat.lines ?? [],
        note: 'In the order you said them. Nothing ranked, nothing weighted, nothing renamed. Your standard gets built after the last screen, so what is left does not get graded against something you have already agreed with.',
      };

    case 'complete':
      return {
        eyebrow: 'Done',
        headline: 'That is the check finished.',
        body: [
          `${beat.kept} kept, ${beat.dropped} dropped, ${beat.skipped} skipped, across ${formatProgress(
            beat.kept + beat.dropped + beat.skipped,
            total,
          )} screens.`,
        ],
      };

    case 'accumulating':
    default: {
      const body =
        beat.holdBack === 'no_two_sided_lines'
          ? [
              tally,
              'I need a line about something you kept and a line about something you dropped before I can say what separates them. One side on its own is a preference, not a rule.',
            ]
          : [tally, 'That is raw signal, not a pattern. Too early to tell you what you judge on.'];
      return { eyebrow: 'Still listening', headline: 'Picking up what you keep and what you drop.', body };
    }
  }
}

interface SortRevealPanelProps {
  /** rail = desktop right pane, strip = mobile bottom strip, full = the completion column. */
  variant: 'rail' | 'strip' | 'full';
  lines: WhyLine[];
  /** Screens the person has answered. */
  gradedCount: number;
  total: number;
  /** The backend gate. Never inferred here. */
  canShowKill: boolean;
  splitRate: SortSplit | null;
  selfAgreement: SortSelfAgreement | null;
  detail: SortRunDetail;
  unsavedGrades: number;
  className?: string;
}

export function SortRevealPanel({
  variant,
  lines,
  gradedCount,
  total,
  canShowKill,
  splitRate,
  selfAgreement,
  detail,
  unsavedGrades,
  className,
}: SortRevealPanelProps) {
  const beat = selectBeat({ gradedCount, total, lines, canShowKill });
  const copy = beatCopy(beat, total);
  const complete = beat.kind === 'complete';

  // The strip is one glance while they work: the beat's headline, nothing more.
  if (variant === 'strip') {
    return (
      <div
        className={cn(
          'rounded-2xl border border-border bg-card/40 px-3.5 py-2.5',
          className,
        )}
      >
        <p className="font-gobold text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
          {copy.eyebrow}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-foreground">
          {copy.headline}
        </p>
      </div>
    );
  }

  const notes = complete ? shortfallNotes(detail) : [];
  const showSplit = complete && splitRate !== null && canReportSplit(splitRate.total);
  // Only after the last screen (CH-12): a live count would tell them some
  // pieces come back a second time, which is the one thing that breaks it.
  const showAgreement =
    selfAgreement !== null && canReportSelfAgreement(selfAgreement.total, complete);

  return (
    <Surface accent={complete} className={cn('p-4', className)}>
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <p className="mt-1.5 text-[14px] font-bold leading-snug tracking-[-0.01em] text-foreground">
        {copy.headline}
      </p>

      {copy.body.map((line) => (
        <p key={line} className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
          {line}
        </p>
      ))}

      {copy.quotes && copy.quotes.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-2">
          {copy.quotes.map((quote) => (
            <li
              key={quote}
              className="border-l-2 border-accent/40 pl-2.5 text-[12.5px] leading-relaxed text-foreground/90"
            >
              &quot;{quote}&quot;
            </li>
          ))}
        </ul>
      )}

      {copy.note && (
        <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground/80">{copy.note}</p>
      )}

      {complete && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          {showSplit && splitRate && (
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Some of these came in twos, written to differ in one way. You told those two apart{' '}
              {splitRate.split} times out of {splitRate.total}.
            </p>
          )}
          {showAgreement && selfAgreement && (
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              {selfAgreement.total} of these came back a second time, on purpose. You gave the same
              answer {selfAgreement.matched} of those {selfAgreement.total} times.
            </p>
          )}
          {notes.map((note) => (
            <p key={note} className="text-[12.5px] leading-relaxed text-muted-foreground">
              {note}
            </p>
          ))}
          {unsavedGrades > 0 && (
            <p className="text-[12.5px] leading-relaxed text-amber-500">
              {unsavedGrades} of your answers did not reach us. They are missing from what gets built
              next, and I would rather say so than quietly count them.
            </p>
          )}
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            Your standard is not written yet. That comes next, and it gets built from these answers
            and your own lines, not from anything I assumed about you.
          </p>
        </div>
      )}
    </Surface>
  );
}
