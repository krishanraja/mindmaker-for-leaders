// src/components/briefing/InterestsSheet.tsx
//
// Cold-start bottom sheet that asks the user what they care about before the
// first briefing is generated. Renders industry-seeded chip suggestions
// (beats + people/companies) for one-tap acceptance and a primary
// "Save & generate my briefing" action that fires once the user has declared
// at least 3 interests. Users who want full CRUD can jump straight to the
// Settings -> Interests tab via the secondary link.

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Plus, Check, Loader2, X } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useBriefingInterests } from '@/hooks/useBriefingInterests';
import { useIndustrySeeds, type IndustrySeedItem } from '@/hooks/useIndustrySeeds';
import { useSettingsSheet } from '@/contexts/SettingsSheetContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const MIN_INTERESTS = 3;

export function InterestsSheet({ open, onOpenChange, onSaved }: Props) {
  const { all: existingInterests, add } = useBriefingInterests();
  const { data, loading } = useIndustrySeeds(open);
  const { openTo } = useSettingsSheet();
  const [adding, setAdding] = useState<string | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const totalDeclared = existingInterests.length;
  const canSave = totalDeclared >= MIN_INTERESTS;

  const hasSomethingToSuggest = useMemo(() => {
    if (!data) return false;
    return (data.beats?.length ?? 0) > 0 || (data.entities?.length ?? 0) > 0;
  }, [data]);

  const handleAdd = async (kind: 'beat' | 'entity', item: IndustrySeedItem) => {
    const key = `${kind}:${item.label}`;
    if (adding || recentlyAdded.has(key)) return;
    setAdding(key);
    try {
      const row = await add(kind, item.label, { source: 'seed_accepted' });
      if (row) {
        setRecentlyAdded((s) => new Set(s).add(key));
        haptics.light();
      }
    } finally {
      setAdding(null);
    }
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      haptics.light();
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenFullSettings = () => {
    onOpenChange(false);
    openTo('briefing-interests');
  };

  const industryLine = data?.industry_label
    ? `Based on your industry (${data.industry_label}), here's what others like you track.`
    : `Here's a starter set of beats to pick from.`;

  const remaining = Math.max(0, MIN_INTERESTS - totalDeclared);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[88svh] max-h-[88svh] p-0 flex flex-col">
        <div className="flex-shrink-0 flex items-start justify-between gap-3 px-5 pt-3 pb-4 border-b border-border">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Lightbulb className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <DrawerTitle className="text-base font-semibold">
                Tell us what you care about
              </DrawerTitle>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                {industryLine} Tap to add. We'll use these to shape your first briefing.
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-5">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Finding relevant beats...
            </div>
          )}

          {!loading && !hasSomethingToSuggest && (
            <div className="text-xs text-muted-foreground py-6 text-center">
              We don't have seed suggestions for your industry yet. Use the full
              editor below to add your own.
            </div>
          )}

          {!loading && data && data.beats.length > 0 && (
            <section>
              <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Topics
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {data.beats.map((b) => (
                  <SeedChip
                    key={`beat:${b.label}`}
                    label={b.label}
                    pending={adding === `beat:${b.label}`}
                    added={recentlyAdded.has(`beat:${b.label}`)}
                    onAdd={() => handleAdd('beat', b)}
                  />
                ))}
              </div>
            </section>
          )}

          {!loading && data && data.entities.length > 0 && (
            <section>
              <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                People &amp; Companies
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {data.entities.map((e) => (
                  <SeedChip
                    key={`entity:${e.label}`}
                    label={e.label}
                    pending={adding === `entity:${e.label}`}
                    added={recentlyAdded.has(`entity:${e.label}`)}
                    onAdd={() => handleAdd('entity', e)}
                  />
                ))}
              </div>
            </section>
          )}

          <button
            onClick={handleOpenFullSettings}
            className="text-[11px] text-accent hover:underline block pt-2"
          >
            Need more control? Open the full editor in Settings -&gt; Interests
          </button>

          <div className="h-[env(safe-area-inset-bottom,0px)]" />
        </div>

        <div className="flex-shrink-0 px-5 py-4 border-t border-border bg-background">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              {canSave ? (
                <span>
                  <span className="text-foreground font-medium">{totalDeclared}</span> selected
                </span>
              ) : (
                <span>
                  Pick {remaining} more to continue
                </span>
              )}
            </p>
            <Button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="min-w-[180px]"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Save &amp; generate briefing</>
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function SeedChip({
  label,
  pending,
  added,
  onAdd,
}: {
  label: string;
  pending: boolean;
  added: boolean;
  onAdd: () => void;
}) {
  return (
    <motion.div whileTap={{ scale: 0.96 }}>
      <Badge
        asChild
        variant="outline"
        className={cn(
          'cursor-pointer select-none py-1.5 pl-2 pr-2.5 text-[12px] font-medium transition-colors',
          added
            ? 'bg-accent/10 text-accent border-accent/40'
            : 'bg-background hover:bg-accent/10 hover:text-accent hover:border-accent/40',
        )}
      >
        <button
          type="button"
          onClick={onAdd}
          disabled={pending || added}
          className="flex items-center gap-1.5"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : added ? (
            <Check className="h-3 w-3" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          <span>{label}</span>
        </button>
      </Badge>
    </motion.div>
  );
}
