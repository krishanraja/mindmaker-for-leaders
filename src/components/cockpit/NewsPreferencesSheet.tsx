// NewsPreferencesSheet - the "tune what pops up" picker.
//
// The leader chooses which AI lanes rise to the top of Home and how they like to
// scan (biggest moves vs practical vs balanced). These are the "real-world
// options to select from" that finesse the feed scoring (src/lib/newsPriority.ts).
// One ask per row, plain language, no jargon.
//
// Every pick applies LIVE (auto-saved through the shared useNewsPreferences
// store, so the Home deck re-ranks underneath immediately). There is
// deliberately NO "Save" button: it sat below the fold of the drawer, so a
// leader would toggle, close, and see nothing change. Now the feed is already
// retuned the moment they close; the footer button only dismisses, and it is
// pinned so it never hides.

import { useEffect, useState } from 'react';
import { Check, Sliders } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useNewsPreferences } from '@/hooks/useNewsPreferences';
import {
  PRIORITY_GROUPS,
  categoriesForGroups,
  groupsForCategories,
  type NewsBias,
} from '@/lib/newsPriority';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BIAS_OPTIONS: { id: NewsBias; label: string; hint: string }[] = [
  { id: 'big', label: 'The biggest moves', hint: 'Major, widely-reported shifts first' },
  { id: 'practical', label: 'Practical & actionable', hint: 'Things you can use or copy now' },
  { id: 'balanced', label: 'A balance of both', hint: 'Mix the big moves with the practical' },
];

export function NewsPreferencesSheet({ open, onOpenChange }: Props) {
  const { preferences, save } = useNewsPreferences();
  const [groups, setGroups] = useState<string[]>([]);
  const [bias, setBias] = useState<NewsBias>('balanced');

  // Seed local state from saved prefs each time the sheet opens.
  useEffect(() => {
    if (open) {
      setGroups(groupsForCategories(preferences.boosted));
      setBias(preferences.bias);
    }
  }, [open, preferences]);

  // Apply LIVE: persist immediately on every pick (optimistic + shared store ->
  // the Home deck re-ranks underneath at once). No Save step to miss.
  const apply = (nextGroups: string[], nextBias: NewsBias) => {
    void save({ boosted: categoriesForGroups(nextGroups), bias: nextBias });
  };

  const toggleGroup = (id: string) => {
    haptics.light();
    setGroups((prev) => {
      const next = prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id];
      apply(next, bias);
      return next;
    });
  };

  const selectBias = (id: NewsBias) => {
    haptics.light();
    setBias(id);
    apply(groups, id);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh] border-border bg-[linear-gradient(180deg,#0d1219,#0a0e12)]">
        <DrawerTitle className="sr-only">Tune your feed</DrawerTitle>
        <div className="mx-auto w-full max-w-md overflow-y-auto px-5 pb-6 pt-2">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
              <Sliders className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
            <div>
              <h2 className="text-[17px] font-extrabold tracking-[-0.01em] text-foreground">Tune what pops up</h2>
              <p className="text-[12px] text-muted-foreground">Pick any. Your feed retunes as you choose.</p>
            </div>
          </div>

          {/* Priorities (multi-select) */}
          <p className="mb-2 font-gobold text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            What matters to you
          </p>
          <div className="flex flex-col gap-2">
            {PRIORITY_GROUPS.map((g) => {
              const on = groups.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className={cn(
                    'flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
                    on ? 'border-accent/50 bg-accent/[0.08]' : 'border-border bg-card/40 hover:border-accent/30',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                      on ? 'border-accent bg-accent text-accent-foreground' : 'border-muted-foreground/40',
                    )}
                  >
                    {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-bold leading-tight text-foreground">{g.label}</span>
                    <span className="block text-[12px] leading-snug text-muted-foreground">{g.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bias (single-select) */}
          <p className="mb-2 mt-5 font-gobold text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            How you scan
          </p>
          <div className="flex flex-col gap-2">
            {BIAS_OPTIONS.map((b) => {
              const on = bias === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => selectBias(b.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
                    on ? 'border-accent/50 bg-accent/[0.08]' : 'border-border bg-card/40 hover:border-accent/30',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                      on ? 'border-accent' : 'border-muted-foreground/40',
                    )}
                  >
                    {on && <span className="h-2 w-2 rounded-full bg-accent" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-bold leading-tight text-foreground">{b.label}</span>
                    <span className="block text-[12px] leading-snug text-muted-foreground">{b.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Pinned so it never hides below the fold. Purely a dismiss - the
              feed is already retuned from the live picks above. */}
          <div className="sticky bottom-0 -mx-5 mt-6 border-t border-border/60 bg-[linear-gradient(180deg,rgba(10,14,18,0.4),#0a0e12_55%)] px-5 pb-1 pt-3">
            <Button onClick={() => onOpenChange(false)} className="w-full" size="lg">
              Done
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
