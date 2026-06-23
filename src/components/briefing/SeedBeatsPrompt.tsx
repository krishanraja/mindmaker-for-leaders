// src/components/briefing/SeedBeatsPrompt.tsx
//
// Cold-start prompt shown above briefing segments when the user hasn't yet
// declared their own interests. Renders industry-relevant seed beats +
// entities as tappable chips; each tap adds a briefing_interests row with
// source='seed_accepted' so future generations get a real lens.
//
// Lives in a dismissible card. Visibility rules (managed by the caller via
// `shouldShow`):
//   - Never render if the user already has 3+ active interests.
//   - Never render if the user dismissed this session (localStorage).
//   - Never render if the seed response has nothing to suggest.

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Check, Loader2, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { useBriefingInterests } from '@/hooks/useBriefingInterests';
import { useIndustrySeeds, type IndustrySeedItem } from '@/hooks/useIndustrySeeds';

const DISMISS_KEY = 'briefing:seed_prompt_dismissed_v1';

interface Props {
  /** Hide the prompt without touching localStorage (e.g. parent-driven visibility). */
  hidden?: boolean;
  onDismiss?: () => void;
  onAnyAdded?: () => void;
}

export function SeedBeatsPrompt({ hidden, onDismiss, onAnyAdded }: Props) {
  const { all: existingInterests, add } = useBriefingInterests();
  const { data, loading } = useIndustrySeeds(!hidden);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  });
  const [adding, setAdding] = useState<string | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

  const hasDeclared = existingInterests.length >= 3;

  const hasSomethingToSuggest = useMemo(() => {
    if (!data) return false;
    return (data.beats?.length ?? 0) > 0 || (data.entities?.length ?? 0) > 0;
  }, [data]);

  if (hidden || dismissed || hasDeclared) return null;
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading suggestions...
      </div>
    );
  }
  if (!hasSomethingToSuggest) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try { window.localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    onDismiss?.();
    haptics.light();
  };

  const handleAdd = async (kind: 'beat' | 'entity', item: IndustrySeedItem) => {
    const key = `${kind}:${item.label}`;
    if (adding || recentlyAdded.has(key)) return;
    setAdding(key);
    try {
      const row = await add(kind, item.label, { source: 'seed_accepted' });
      if (row) {
        setRecentlyAdded((s) => new Set(s).add(key));
        haptics.light();
        onAnyAdded?.();
      }
    } finally {
      setAdding(null);
    }
  };

  const industryLine = data?.industry_label
    ? `Based on your industry (${data.industry_label}), here's what others like you track.`
    : `Here's a starter set of beats. Tap any to add.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Lightbulb className="h-4 w-4 text-accent mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">
              Tell us what you care about
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
              {industryLine} Each tap adds it to your interests; the next briefing will use them.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="Dismiss suggestions"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {data!.beats.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Topics</p>
          <div className="flex flex-wrap gap-1.5">
            {data!.beats.map((b) => (
              <SeedChip
                key={`beat:${b.label}`}
                label={b.label}
                pending={adding === `beat:${b.label}`}
                added={recentlyAdded.has(`beat:${b.label}`)}
                onAdd={() => handleAdd('beat', b)}
              />
            ))}
          </div>
        </div>
      )}

      {data!.entities.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">People & Companies</p>
          <div className="flex flex-wrap gap-1.5">
            {data!.entities.map((e) => (
              <SeedChip
                key={`entity:${e.label}`}
                label={e.label}
                pending={adding === `entity:${e.label}`}
                added={recentlyAdded.has(`entity:${e.label}`)}
                onAdd={() => handleAdd('entity', e)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <p className="text-[10px] text-muted-foreground italic">
          Edit anytime in Settings → Interests.
        </p>
        {recentlyAdded.size > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="h-7 text-xs"
          >
            Done
          </Button>
        )}
      </div>
    </motion.div>
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
    <Badge
      asChild
      variant="outline"
      className={cn(
        'cursor-pointer select-none py-1 pl-2 pr-2 text-[11px] font-medium transition-colors',
        added
          ? 'bg-accent/10 text-accent border-accent/40'
          : 'bg-background hover:bg-accent/10 hover:text-accent hover:border-accent/40',
      )}
    >
      <button type="button" onClick={onAdd} disabled={pending || added} className="flex items-center gap-1">
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
  );
}
