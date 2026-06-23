// BriefingPlay - the dead-simple, no-scroll, Play-first briefing landing.
//
// The briefing is the easiest thing in the app: one big Play button near the top,
// one plain sentence, nothing else to read or decide. Press Play -> hear a short
// audio rundown of today's AI news in your voice. Zero app jargon. Past briefings
// (and any custom ones) live behind a single quiet link that opens a sheet, so
// the main screen never has to ask more than one thing.

import { Play } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { BRIEFING_TYPES } from '@/types/briefing';
import type { Briefing } from '@/types/briefing';

interface BriefingPlayLandingProps {
  /** The bold line under the button (e.g. "Play today's briefing"). */
  title: string;
  /** One plain sentence describing what playing does. */
  line: string;
  /** Optional tiny line below (e.g. freshness "Updated 4 minutes ago"). */
  sub?: string | null;
  onPlay: () => void;
  busy?: boolean;
  hasPast?: boolean;
  onOpenPast?: () => void;
  className?: string;
}

/** Big Play button at the top + one plain sentence. Fits the viewport, no scroll. */
export function BriefingPlayLanding({
  title,
  line,
  sub,
  onPlay,
  busy,
  hasPast,
  onOpenPast,
  className,
}: BriefingPlayLandingProps) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col items-center px-2 pt-6 text-center', className)}>
      <button
        type="button"
        onClick={onPlay}
        disabled={busy}
        aria-label={title}
        className="grid h-24 w-24 place-items-center rounded-full bg-accent text-accent-foreground shadow-[0_18px_44px_-14px_hsl(var(--accent)/0.65)] transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
      >
        <Play className="h-10 w-10 translate-x-0.5 fill-current" strokeWidth={0} />
      </button>
      <h2 className="mt-6 text-2xl font-bold tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{line}</p>
      {sub && <p className="mt-1.5 text-xs text-muted-foreground/70">{sub}</p>}
      {hasPast && onOpenPast && (
        <button
          type="button"
          onClick={onOpenPast}
          className="mt-auto pb-1 text-xs text-muted-foreground transition-colors hover:text-accent"
        >
          Past briefings
        </button>
      )}
    </div>
  );
}

function rowLabel(b: Briefing): string {
  if (b.briefing_type && b.briefing_type !== 'default') {
    return BRIEFING_TYPES.find((t) => t.type === b.briefing_type)?.label || 'Briefing';
  }
  return new Date(b.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

interface PastBriefingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  custom: Briefing[];
  earlier: Briefing[];
  onPlay: (b: Briefing) => void;
}

/** A quiet bottom sheet listing earlier + custom briefings, one tap to play. */
export function PastBriefingsSheet({ open, onOpenChange, custom, earlier, onPlay }: PastBriefingsSheetProps) {
  const rows = [...custom, ...earlier];
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="border-border bg-[linear-gradient(180deg,#0d1219,#0a0e12)]">
        <DrawerTitle className="sr-only">Past briefings</DrawerTitle>
        <div className="mx-auto w-full max-w-md px-5 pb-6 pt-2">
          <h3 className="mb-3 text-[15px] font-semibold text-foreground">Past briefings</h3>
          <div className="scrollbar-hide max-h-[60vh] space-y-1.5 overflow-y-auto">
            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nothing here yet.</p>
            ) : (
              rows.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { onPlay(b); onOpenChange(false); }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card/50 p-3 text-left transition-colors hover:border-accent/30"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/10">
                    <Play className="h-3.5 w-3.5 fill-accent text-accent" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{rowLabel(b)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
