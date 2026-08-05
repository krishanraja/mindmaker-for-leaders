/**
 * StandardCard - the compiled standard, and one button that gets it out.
 *
 * Deliberately quiet and deliberately unwired: this component is exported and
 * rendered nowhere yet. CH-18's measurement only means something once the card
 * sits on a surface a sort completer actually reaches, and choosing that surface
 * is a separate decision from building the card.
 *
 * The one rule the card has to hold: the label is shown as it was written.
 * Draft means nothing has been measured and the card says so in plain words
 * rather than implying a number by omission. A card that reads confident about
 * an unmeasured rubric is worse than no card, because the person believes it.
 */

import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Eyebrow, Surface } from '@/components/system/surface';
import type { StandardLabel, StandardMeta } from '@/hooks/useStandard';

const LABEL_TEXT: Record<StandardLabel, string> = {
  draft: 'Draft',
  provisional: 'Provisional',
  verified: 'Verified',
};

function labelLine(meta: StandardMeta): string {
  if (meta.label === 'verified' && meta.precision !== null) {
    const recall = meta.recall !== null ? `, recall ${meta.recall.toFixed(2)}` : '';
    return `Checked against ${meta.heldOutGraded ?? 0} pieces you graded before you saw any of this. ` +
      `Precision ${meta.precision.toFixed(2)}${recall}.`;
  }
  if (meta.label === 'provisional') {
    return 'Built from your real grades. It has not been checked against work it has never seen, so no accuracy number is claimed.';
  }
  return 'Nothing here is measured yet. No accuracy number is claimed, and every line is a proposal you can strike out.';
}

function countLine(meta: StandardMeta): string {
  const kept = meta.criteriaKept;
  const awaiting = meta.criteriaAwaiting;
  if (kept === 0) {
    return awaiting === 1
      ? '1 construct is recorded and none has become a check yet.'
      : `${awaiting} constructs are recorded and none has become a check yet.`;
  }
  const keptText = kept === 1 ? '1 check' : `${kept} checks`;
  if (awaiting === 0) return `${keptText} that separate your work.`;
  const awaitingText = awaiting === 1 ? '1 more is' : `${awaiting} more are`;
  return `${keptText} that separate your work. ${awaitingText} waiting on evidence.`;
}

export function StandardCard({
  meta,
  onDownload,
  onOpen,
  className,
}: {
  meta: StandardMeta | null;
  onDownload: () => void;
  /** Fires when the card is put in front of someone. CH-18's measurement. */
  onOpen?: () => void;
  className?: string;
}) {
  if (!meta) return null;

  return (
    <Surface className={className}>
      <div className="flex items-start gap-3 p-4">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
          <FileText className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <Eyebrow>{LABEL_TEXT[meta.label]}</Eyebrow>
          <h3 className="mt-1 text-[15px] font-bold tracking-[-0.01em] text-foreground">
            {meta.surface ? `Your standard for ${meta.surface}` : 'Your standard'}
          </h3>
          <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{countLine(meta)}</p>
          <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">{labelLine(meta)}</p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => {
              onOpen?.();
              onDownload();
            }}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Download my-standard.md
          </Button>
        </div>
      </div>
    </Surface>
  );
}

export default StandardCard;
