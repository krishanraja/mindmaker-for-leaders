import { useEffect } from 'react';
import { LoadingCaption } from '@/components/system/SkeletonCard';
import { Surface, Eyebrow } from '@/components/system/surface';
import { StandardCard } from '@/components/standard/StandardCard';
import { useStandard } from '@/hooks/useStandard';
import type { CompileDetail, CompileStage, CompileStatus } from '@/hooks/useSort';
import { cn } from '@/lib/utils';

/**
 * SortCompilePanel - what came out of the check, once it has been compiled.
 *
 * Stage 3a had no door: compile-standard existed, was tested, and nothing in the
 * app had ever called it. So `criteria` rows never existed for a real person,
 * and with no criteria there is nothing for a built skill's [C#] pointers to
 * point AT. This panel is the visible half of closing that.
 *
 * THREE OF THE FOUR ENDINGS ARE NOT ERRORS, AND THE COPY HAS TO KNOW THAT.
 *
 *   ready               a rubric was built.
 *   halted              the matched pairs did not separate, so the grades are
 *                       attributed to the wrong dimension and a rubric built on
 *                       them would be internally consistent and about nothing.
 *                       Refusing to compile is the correct outcome, and the
 *                       fault is upstream in how the pieces were written, not
 *                       in anything the person did.
 *   template_and_voice  the same piece came back a different answer most times
 *                       it repeated. A measured standard is not available here
 *                       and saying so is worth more than a number.
 *   failed              something actually broke.
 *
 * Only the last one is a failure, and only the last one is allowed to read like
 * one. The reason line on the first three comes from the backend verbatim
 * (compile-standard writes it, discrimination.ts owns the wording) because the
 * same sentence has to appear in the run detail, the standard file and here,
 * and three copies of a claim is how they drift apart.
 *
 * Nothing in this file computes anything. Every count and the label are read
 * from the compile run's stage_detail, and the label on the card is re-derived
 * by useStandard through releaseVerdict, never asserted here.
 */

/** The live stage, in plain words. Never a percentage, never a fake step count. */
const STAGE_COPY: Record<string, string> = {
  loading: 'Reading back everything you graded.',
  probing: 'Testing which rules actually separate your work.',
  clustering: 'Folding together the ones that turned out to be the same check.',
  writing: 'Writing your standard.',
};

interface SortCompilePanelProps {
  status: CompileStatus;
  stage: CompileStage | null;
  detail: CompileDetail;
  error: string | null;
  className?: string;
}

function readyLines(detail: CompileDetail): string[] {
  const kept = detail.kept ?? 0;
  const untested = detail.untested ?? 0;
  const lines: string[] = [];

  if (kept === 0) {
    lines.push(
      'Nothing separated your work cleanly enough to become a check yet. What you said is all recorded, and another pass on this kind of work is what turns it into one.',
    );
  } else {
    lines.push(
      kept === 1
        ? 'One check came out of this that actually separates what you keep from what you drop.'
        : `${kept} checks came out of this that actually separate what you keep from what you drop.`,
    );
  }

  if (untested > 0) {
    lines.push(
      untested === 1
        ? 'One more is recorded but could not be tested, so it is in your standard marked as waiting rather than presented as a rule.'
        : `${untested} more are recorded but could not be tested, so they are in your standard marked as waiting rather than presented as rules.`,
    );
  }

  if (detail.merged && detail.merged > 0) {
    lines.push(
      detail.merged === 1
        ? 'Two of them landed the same way on the same pieces, so they were folded into one.'
        : `${detail.merged} of them landed the same way on the same pieces as another, so they were folded together.`,
    );
  }

  return lines;
}

export function SortCompilePanel({
  status,
  stage,
  detail,
  error,
  className,
}: SortCompilePanelProps) {
  const { meta, refresh, downloadMarkdown, logOpened } = useStandard();
  const isReady = stage === 'ready';

  // The artefact is written at the very end of the compile, so the copy fetched
  // when this mounted predates it. One refetch when the run lands.
  useEffect(() => {
    if (isReady) void refresh();
  }, [isReady, refresh]);

  if (status === 'idle') return null;

  if (status === 'failed' || stage === 'failed') {
    return (
      <Surface className={cn('p-4', className)}>
        <Eyebrow>Could not build it</Eyebrow>
        <p className="mt-1.5 text-[14px] font-bold leading-snug tracking-[-0.01em] text-foreground">
          Your answers are saved. The standard is not built.
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
          {error ?? 'Something went wrong putting your standard together.'}
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
          Nothing you graded is lost, so this can be built again without doing the check twice.
        </p>
      </Surface>
    );
  }

  if (stage === 'halted') {
    return (
      <Surface className={cn('p-4', className)}>
        <Eyebrow>Nothing was built, on purpose</Eyebrow>
        <p className="mt-1.5 text-[14px] font-bold leading-snug tracking-[-0.01em] text-foreground">
          The pieces I wrote did not differ in the one way they were meant to.
        </p>
        {detail.reason && (
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{detail.reason}</p>
        )}
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
          That is my fault, not yours. Your answers were real; what they were about was not clean
          enough to build on, and a standard built on it would look right and mean nothing.
        </p>
      </Surface>
    );
  }

  if (stage === 'template_and_voice') {
    return (
      <Surface className={cn('p-4', className)}>
        <Eyebrow>No number, and here is why</Eyebrow>
        <p className="mt-1.5 text-[14px] font-bold leading-snug tracking-[-0.01em] text-foreground">
          Some pieces came round twice and got different answers.
        </p>
        {detail.reason && (
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{detail.reason}</p>
        )}
      </Surface>
    );
  }

  if (isReady) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <Surface accent className="p-4">
          <Eyebrow>Built from your answers</Eyebrow>
          <p className="mt-1.5 text-[14px] font-bold leading-snug tracking-[-0.01em] text-foreground">
            Your standard exists now.
          </p>
          {readyLines(detail).map((line) => (
            <p key={line} className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
              {line}
            </p>
          ))}
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground/80">
            Every line in it points back at something you graded. Nothing in it came from what I
            assumed about you.
          </p>
        </Surface>
        <StandardCard meta={meta} onDownload={downloadMarkdown} onOpen={logOpened} />
      </div>
    );
  }

  return (
    <Surface className={cn('p-4', className)}>
      <Eyebrow>Building your standard</Eyebrow>
      <p className="mt-1.5 text-[14px] font-bold leading-snug tracking-[-0.01em] text-foreground">
        Working out which of your rules survive.
      </p>
      <div className="mt-2">
        <LoadingCaption>{(stage && STAGE_COPY[stage]) ?? 'Getting started.'}</LoadingCaption>
      </div>
    </Surface>
  );
}

export default SortCompilePanel;
