/**
 * ResolveDecisionSheet - the closing move. The leader says how a decision played
 * out and (optionally) leaves a one-line conclusion; it then drops into History.
 *
 * One ask per screen (CTRL-SYSTEM-SPEC s6): step 1 is the play-out pick, step 2 is
 * the optional conclusion + confirm. Plain English, no jargon, no required survey.
 */

import { useEffect, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import type { PlayedOut } from '@/types/track-record';

const OUTCOMES: { key: PlayedOut; label: string; hint: string }[] = [
  { key: 'true', label: 'It worked out', hint: 'It went the way I read it' },
  { key: 'false', label: 'It fell short', hint: 'It did not go the way I read it' },
  { key: 'too_early', label: 'Too early to tell', hint: 'Still playing out, but I am closing it for now' },
];

export function ResolveDecisionSheet({
  open, onOpenChange, statement, onResolve, resolving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  statement: string;
  onResolve: (playedOut: PlayedOut, conclusion: string) => void | Promise<void>;
  resolving: boolean;
}) {
  const [playedOut, setPlayedOut] = useState<PlayedOut | null>(null);
  const [conclusion, setConclusion] = useState('');

  // Fresh start every time the sheet opens.
  useEffect(() => {
    if (open) { setPlayedOut(null); setConclusion(''); }
  }, [open]);

  const pick = (k: PlayedOut) => { setPlayedOut(k); haptics.light(); };
  const back = () => { setPlayedOut(null); haptics.light(); };
  const confirm = async () => {
    if (!playedOut || resolving) return;
    haptics.success();
    await onResolve(playedOut, conclusion);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl sm:mx-auto sm:max-w-lg">
        <SheetTitle className="text-[15px] font-bold text-foreground">
          {playedOut === null ? 'How did this play out?' : 'Anything to remember?'}
        </SheetTitle>
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">{statement}</p>

        {playedOut === null ? (
          // ---- step 1: the play-out pick (one tap advances) ----
          <ul className="mt-4 space-y-2.5 pb-2">
            {OUTCOMES.map((o) => (
              <li key={o.key}>
                <button
                  type="button"
                  onClick={() => pick(o.key)}
                  className="flex w-full flex-col items-start gap-0.5 rounded-xl border border-border bg-foreground/[0.02] p-3.5 text-left transition-colors hover:border-accent/40 hover:bg-accent/[0.05]"
                >
                  <span className="text-[13.5px] font-bold text-foreground">{o.label}</span>
                  <span className="text-[11.5px] text-muted-foreground">{o.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          // ---- step 2: optional conclusion + confirm ----
          <div className="mt-4 space-y-3 pb-2">
            <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/[0.06] px-3 py-2">
              <Check className="h-3.5 w-3.5 flex-none text-accent" strokeWidth={3} />
              <span className="text-[12.5px] font-semibold text-foreground/90">
                {OUTCOMES.find((o) => o.key === playedOut)?.label}
              </span>
              <button
                type="button"
                onClick={back}
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" />Change
              </button>
            </div>
            <Textarea
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              placeholder="One line on what you learned (optional)"
              rows={3}
              className="resize-none text-[13px]"
            />
            <button
              type="button"
              onClick={confirm}
              disabled={resolving}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-accent px-3 py-3 text-[13.5px] font-bold text-accent-foreground shadow-[0_12px_26px_-12px_hsl(var(--accent)/0.5)] transition-opacity disabled:opacity-70"
            >
              {resolving ? 'Saving...' : (<><Check className="h-3.5 w-3.5" strokeWidth={3} />Resolve this decision</>)}
            </button>
            <p className="text-center text-[11px] text-muted-foreground">It moves into your history, where I keep score on how it ages.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
