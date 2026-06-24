// TuneFeedButton - the "tune what pops up in your feed" affordance.
//
// Lives in the app chrome (top bar) on Home so it sits with the other quiet
// controls by the settings gear, never crowding the feed itself. Owns its own
// open state so it can drop in anywhere.

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { NewsPreferencesSheet } from './NewsPreferencesSheet';
import { cn } from '@/lib/utils';

export function TuneFeedButton({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Tune what pops up in your feed"
        title="Tune your feed"
        className={cn(
          'flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card/50 text-muted-foreground transition-colors hover:border-accent/30 hover:text-foreground',
          compact ? 'h-8 w-8 justify-center' : 'px-3.5 py-2',
        )}
      >
        <SlidersHorizontal className={compact ? 'h-4 w-4' : 'h-4 w-4'} strokeWidth={1.9} />
        {!compact && <span className="text-[12.5px] font-semibold">Tune feed</span>}
      </button>
      <NewsPreferencesSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
