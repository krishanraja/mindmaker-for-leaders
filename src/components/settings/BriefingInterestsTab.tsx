// src/components/settings/BriefingInterestsTab.tsx
//
// User-declared briefing interests. Three categories:
//   - Beats: topics the user wants covered (weight 1.0 in the lens)
//   - People & Companies: named entities that anchor stories (weight 1.0)
//   - Don't show me: exclusions that post-filter the candidate pool
//
// Every row here outranks inferred signals. This is the fix for users whose
// voice-session-derived profile is generic (e.g. "grow the business") and
// produces off-target briefings.

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Loader2 } from 'lucide-react';
import { useBriefingInterests } from '@/hooks/useBriefingInterests';
import type { BriefingInterest, BriefingInterestKind } from '@/types/briefing';
import { cn } from '@/lib/utils';

interface SectionConfig {
  kind: BriefingInterestKind;
  title: string;
  description: string;
  placeholder: string;
  target: string;
  chipClass: string;
}

const SECTIONS: SectionConfig[] = [
  {
    kind: 'beat',
    title: 'Topics you care about',
    description:
      'Broad is fine - "creator monetization", "platform policy", "AI pricing". These shape every briefing.',
    placeholder: 'Add a topic',
    target: '3 to 5',
    chipClass: 'bg-accent/10 text-accent border-accent/30',
  },
  {
    kind: 'entity',
    title: 'People & companies to watch',
    description:
      'Named entities to track - creators, competitors, investors, regulators, anyone whose moves matter.',
    placeholder: 'Add a person or company',
    target: '3 to 10',
    chipClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  },
  {
    kind: 'exclude',
    title: 'Never show me',
    description:
      'Topics to keep out of your briefing for good. Anything close to these is dropped before you see it.',
    placeholder: 'Add a topic to exclude',
    target: '0 to 5',
    chipClass: 'bg-muted text-muted-foreground border-border',
  },
];

function InterestSection({
  config,
  items,
  onAdd,
  onRemove,
}: {
  config: SectionConfig;
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
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-lg font-semibold">{config.title}</h3>
          <span className="text-xs text-muted-foreground">
            {items.length} active &middot; target {config.target}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={config.placeholder}
          disabled={submitting}
          maxLength={120}
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={!input.trim() || submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">None yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge
              key={item.id}
              variant="outline"
              className={cn('flex items-center gap-1.5 pl-2.5 pr-1 py-1 text-xs', config.chipClass)}
            >
              <span>{item.text}</span>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                disabled={removingId === item.id}
                className="ml-0.5 rounded-full hover:bg-background/40 p-0.5 transition-colors"
                aria-label={`Remove ${item.text}`}
              >
                {removingId === item.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function BriefingInterestsTab() {
  const { beats, entities, excludes, loading, error, add, remove } = useBriefingInterests();

  const sections: Array<{ config: SectionConfig; items: BriefingInterest[] }> = [
    { config: SECTIONS[0], items: beats },
    { config: SECTIONS[1], items: entities },
    { config: SECTIONS[2], items: excludes },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-lg font-semibold">Briefing Interests</h3>
        <p className="text-sm text-muted-foreground mt-1">
          These influence every briefing. What you add here always outranks anything we pick up from your voice sessions.
        </p>
      </div>

      {loading && (
        <div className="rounded-lg border border-border bg-card p-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your interests...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-600">
          Couldn't load interests: {error}
        </div>
      )}

      {!loading && sections.map(({ config, items }) => (
        <InterestSection
          key={config.kind}
          config={config}
          items={items}
          onAdd={async (text) => {
            await add(config.kind, text);
          }}
          onRemove={remove}
        />
      ))}
    </div>
  );
}
