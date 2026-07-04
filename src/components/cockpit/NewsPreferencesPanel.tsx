// NewsPreferencesPanel - the ONE "tune what pops up" picker body, with no Drawer
// wrapper so it renders identically in two places:
//   1. NewsPreferencesSheet (the Home "Tune feed" drawer), and
//   2. Settings -> Interests (the desktop Briefing tab + the mobile settings sheet).
//
// This is the single door for feed/briefing tuning. It carries:
//   - Priorities (the 9 AI lanes, multi-select) + scan bias -> news_preferences,
//     which client-re-ranks Home instantly (useNewsPreferences shared store).
//   - A watchlist (people/companies to watch + never-show excludes) ->
//     briefing_interests, which the server daily-briefing lens reads. Folding the
//     watchlist in here retired the separate BriefingInterestsTab so there is one
//     of everything, not two divergent tuners.
//
// One ask per row, plain language, no jargon. Every pick applies LIVE (auto-saved).

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, Loader2, Plus, Sliders, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { Eyebrow } from '@/components/system/surface';
import { useNewsPreferences } from '@/hooks/useNewsPreferences';
import { useBriefingInterests } from '@/hooks/useBriefingInterests';
import {
  PRIORITY_GROUPS,
  categoriesForGroups,
  groupsForCategories,
  type NewsBias,
} from '@/lib/newsPriority';
import type { BriefingInterest } from '@/types/briefing';

const BIAS_OPTIONS: { id: NewsBias; label: string; hint: string }[] = [
  { id: 'big', label: 'The biggest moves', hint: 'Major, widely-reported shifts first' },
  { id: 'practical', label: 'Practical & actionable', hint: 'Things you can use or copy now' },
  { id: 'balanced', label: 'A balance of both', hint: 'Mix the big moves with the practical' },
];

// A compact chip list + add form, reused for both watchlist sections.
function WatchlistSection({
  title,
  hint,
  placeholder,
  chipClass,
  items,
  onAdd,
  onRemove,
}: {
  title: string;
  hint: string;
  placeholder: string;
  chipClass: string;
  items: BriefingInterest[];
  onAdd: (text: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onAdd(trimmed);
      setInput('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await onRemove(id);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-3.5">
      <p className="text-[13px] font-bold leading-tight text-foreground">{title}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{hint}</p>

      <form onSubmit={handleSubmit} className="mt-2.5 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={submitting}
          maxLength={120}
          className="h-9 flex-1 text-[13px]"
        />
        <Button type="submit" size="sm" disabled={!input.trim() || submitting} className="h-9 px-3">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </form>

      {items.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item.id}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border py-1 pl-2.5 pr-1 text-[12px] font-semibold',
                chipClass,
              )}
            >
              {item.text}
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                disabled={removingId === item.id}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-background/40"
                aria-label={`Remove ${item.text}`}
              >
                {removingId === item.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function NewsPreferencesPanel({ showHeader = true }: { showHeader?: boolean }) {
  const { preferences, save } = useNewsPreferences();
  const { entities, excludes, add, remove } = useBriefingInterests();
  const [groups, setGroups] = useState<string[]>([]);
  const [bias, setBias] = useState<NewsBias>('balanced');

  // Seed local state from saved prefs whenever they change (first hydrate + reopen).
  useEffect(() => {
    setGroups(groupsForCategories(preferences.boosted));
    setBias(preferences.bias);
  }, [preferences]);

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

  const addEntity = useMemo(() => async (text: string) => { await add('entity', text); }, [add]);
  const addExclude = useMemo(() => async (text: string) => { await add('exclude', text); }, [add]);

  return (
    <div>
      {showHeader && (
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
            <Sliders className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="text-[17px] font-extrabold tracking-[-0.01em] text-foreground">Tune what pops up</h2>
            <p className="text-[12px] text-muted-foreground">Pick any. Your feed retunes as you choose.</p>
          </div>
        </div>
      )}

      {/* Priorities (multi-select) */}
      <Eyebrow className="mb-2">What matters to you</Eyebrow>
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
      <Eyebrow className="mb-2 mt-5">How you scan</Eyebrow>
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

      {/* Watchlist -> feeds the daily briefing lens. Named people/companies and
          hard excludes the 9 lanes can't express. */}
      <Eyebrow className="mb-2 mt-5">Watch and avoid</Eyebrow>
      <div className="flex flex-col gap-2">
        <WatchlistSection
          title="People & companies to watch"
          hint="Named creators, competitors, investors, regulators - anyone whose moves matter."
          placeholder="Add a person or company"
          chipClass="border-accent/30 bg-accent/10 text-accent"
          items={entities}
          onAdd={addEntity}
          onRemove={remove}
        />
        <WatchlistSection
          title="Never show me"
          hint="Topics to keep out for good. Anything close to these is dropped before you see it."
          placeholder="Add a topic to exclude"
          chipClass="border-border bg-secondary text-muted-foreground"
          items={excludes}
          onAdd={addExclude}
          onRemove={remove}
        />
      </div>
    </div>
  );
}
