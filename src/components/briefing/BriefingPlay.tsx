// PastBriefingsSheet - a quiet bottom sheet listing earlier + custom briefings.
//
// The briefing itself is now an audio drawer opened in one tap from the top-bar
// "Your audio digest" button (no landing screen). This sheet is the calm,
// secondary way to replay an earlier or custom briefing, one tap to play.

import { Play } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { BRIEFING_TYPES } from '@/types/briefing';
import type { Briefing } from '@/types/briefing';

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
