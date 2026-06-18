import { TrendingUp, AlertTriangle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { AutomatePainCard } from './AutomatePainCard';
import type { EdgeStrength, EdgeWeakness, FeedbackType } from '@/types/edge';

/**
 * The Full Read: the demoted home for strengths and gaps.
 *
 * Read-only rows, full labels (no truncation), summary always visible. One
 * quiet correction per row, no per-row capability buttons. The Skill Builder
 * lives here as a secondary value prop, not above the identity read.
 */

interface EdgeFullReadSheetProps {
  isOpen: boolean;
  onClose: () => void;
  strengths: EdgeStrength[];
  weaknesses: EdgeWeakness[];
  onReject: (feedbackType: FeedbackType, key: string) => void;
  onMakeNextMove: () => void;
  isPaid: boolean;
  onUpgrade: () => void;
}

function Row({
  label,
  summary,
  evidence,
  onReject,
}: {
  label: string;
  summary: string;
  evidence: string[];
  onReject: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      {summary && (
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{summary}</p>
      )}
      {evidence?.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {evidence.slice(0, 3).map((e, i) => (
            <span
              key={i}
              className="rounded-md bg-foreground/5 px-2 py-0.5 text-xs text-muted-foreground"
            >
              {e}
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onReject}
        className="mt-3 text-xs text-muted-foreground/60 underline-offset-4 transition-colors hover:text-muted-foreground hover:underline"
      >
        This is not me
      </button>
    </div>
  );
}

function FullReadBody({
  strengths,
  weaknesses,
  onReject,
  onMakeNextMove,
}: Omit<EdgeFullReadSheetProps, 'isOpen' | 'onClose'>) {
  return (
    <div className="space-y-6">
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">What you lead with</h3>
        </div>
        {strengths.length > 0 ? (
          strengths.map((s) => (
            <Row
              key={s.key}
              label={s.label}
              summary={s.summary}
              evidence={s.evidence}
              onReject={() => onReject('strength_reject', s.key)}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Not enough context yet. Add one thought and your read sharpens.
          </p>
        )}
      </section>

      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">Where you are exposed</h3>
        </div>
        {weaknesses.length > 0 ? (
          weaknesses.map((w) => (
            <Row
              key={w.key}
              label={w.label}
              summary={w.summary}
              evidence={w.evidence}
              onReject={() => onReject('weakness_reject', w.key)}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No clear gap yet.</p>
        )}
      </section>

      {/* Secondary value prop, demoted below the identity read */}
      <AutomatePainCard />

      <Button onClick={onMakeNextMove} className="w-full">
        Make my next move
      </Button>
    </div>
  );
}

export function EdgeFullReadSheet({
  isOpen,
  onClose,
  ...rest
}: EdgeFullReadSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          side="bottom"
          className="max-h-[88vh] overflow-y-auto rounded-t-2xl px-6 pb-10 pt-6"
        >
          <SheetHeader className="mb-4 text-left">
            <SheetTitle>The full read</SheetTitle>
            <SheetDescription>
              Your strengths and gaps, in plain language.
            </SheetDescription>
          </SheetHeader>
          <FullReadBody {...rest} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="mb-2 text-left">
          <DialogTitle>The full read</DialogTitle>
          <DialogDescription>
            Your strengths and gaps, in plain language.
          </DialogDescription>
        </DialogHeader>
        <FullReadBody {...rest} />
      </DialogContent>
    </Dialog>
  );
}
