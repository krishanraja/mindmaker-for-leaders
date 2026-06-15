/* eslint-disable react-refresh/only-export-components -- co-locates the panel with its small copy helper */
import { motion } from 'framer-motion';
import { Check, ChevronRight, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CONTEST_KINDS, type ContestKind, type ContestResult, type ContestTarget } from '@/types/contest';

// Confirmation copy respects the kind: a factual overrule is re-checked, never argued with;
// a visual/functional report goes to the makers. (Locked honesty framing.)
export function confirmationCopy(result: ContestResult, kind: ContestKind | null): { title: string; body: string } {
  if (result.honored) {
    return {
      title: 'Marked - and re-checking',
      body: "We've flagged this and we're re-checking it against your sources. Your call stands until then.",
    };
  }
  if (kind === 'factual') {
    return { title: 'Logged', body: "Thanks - we'll re-check this against the evidence." };
  }
  return { title: 'Thanks', body: 'The team will see this. Appreciate you flagging it.' };
}

interface ContestPanelProps {
  target: ContestTarget | null;
  selectedKind: ContestKind | null;
  onSelectKind: (k: ContestKind) => void;
  note: string;
  onNoteChange: (v: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
  result?: ContestResult | null;
  onClose?: () => void;
  animated?: boolean; // false renders at final state (QC harness / static capture)
}

export function ContestPanel({
  target,
  selectedKind,
  onSelectKind,
  note,
  onNoteChange,
  onSubmit,
  submitting = false,
  result = null,
  onClose,
  animated = true,
}: ContestPanelProps) {
  if (result) {
    const copy = confirmationCopy(result, selectedKind);
    return (
      <motion.div
        initial={animated ? { opacity: 0, y: 6 } : false}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pb-7 pt-2 text-center"
      >
        <div className={cn('mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full', result.honored ? 'bg-accent/15 text-accent' : 'bg-secondary text-muted-foreground')}>
          <Check className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold text-foreground">{copy.title}</h3>
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
        <Button variant="secondary" className="mt-5 w-full" onClick={onClose}>Done</Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      className="px-5 pb-7 pt-2"
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground" aria-hidden>
          <Flag className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-tight text-foreground">Something off?</h3>
          {target?.element && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">on &ldquo;{target.element}&rdquo;</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {CONTEST_KINDS.map((k) => {
          const on = selectedKind === k.value;
          return (
            <button
              key={k.value}
              type="button"
              onClick={() => onSelectKind(k.value)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                on ? 'border-accent/50 bg-accent/[0.07]' : 'border-border bg-card hover:bg-secondary/40',
              )}
            >
              <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', on ? 'border-accent bg-accent text-accent-foreground' : 'border-muted-foreground/40')}>
                {on && <Check className="h-3 w-3" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{k.label}</span>
                <span className="block text-xs text-muted-foreground">{k.hint}</span>
              </span>
              <ChevronRight className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-opacity', on ? 'opacity-0' : 'opacity-60')} />
            </button>
          );
        })}
      </div>

      <Textarea
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="Add a line (optional) - what's off?"
        rows={2}
        className="mt-3 resize-none text-sm"
      />

      <Button className="mt-3 w-full" disabled={!selectedKind || submitting} onClick={onSubmit}>
        {submitting ? 'Sending...' : 'Send'}
      </Button>
    </motion.div>
  );
}
