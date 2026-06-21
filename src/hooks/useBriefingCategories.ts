// useBriefingCategories - the AI-native-category view over briefing interests.
//
// The Briefing page's interest selection is the nine AI-native NEWS CATEGORIES
// (src/types/newsCategory.ts), the same world the news deck reads. We do NOT add
// a new table: each chosen category is stored as a `beat` interest in
// `briefing_interests` (text = the category label), so the existing briefing
// pipeline reads it unchanged. This hook is the thin bridge between the picker's
// category ids and those beat rows.

import { useCallback, useMemo, useState } from 'react';
import { useBriefingInterests } from '@/hooks/useBriefingInterests';
import {
  NEWS_CATEGORIES,
  type NewsCategoryId,
} from '@/types/newsCategory';
import type { BriefingInterest } from '@/types/briefing';

// label <-> id, so we can round-trip a stored beat back to its category.
const LABEL_BY_ID = new Map<NewsCategoryId, string>(
  NEWS_CATEGORIES.map((c) => [c.id, c.label]),
);
const ID_BY_LABEL = new Map<string, NewsCategoryId>(
  NEWS_CATEGORIES.map((c) => [c.label.toLowerCase(), c.id]),
);

function categoryIdsFromInterests(interests: BriefingInterest[]): Set<NewsCategoryId> {
  const out = new Set<NewsCategoryId>();
  for (const i of interests) {
    if (i.kind !== 'beat') continue;
    const id = ID_BY_LABEL.get(i.text.trim().toLowerCase());
    if (id) out.add(id);
  }
  return out;
}

export function useBriefingCategories() {
  const { all, beats, loading, add, remove, refetch } = useBriefingInterests();

  // The categories already declared (a stored beat whose text is a category
  // label). This is the source of truth the picker starts from.
  const declaredCategoryIds = useMemo(() => categoryIdsFromInterests(all), [all]);

  // Local working selection. Seeded from the declared set; the picker toggles
  // this, and `save` reconciles it against the stored beats.
  const [selected, setSelected] = useState<Set<NewsCategoryId> | null>(null);
  const working = selected ?? declaredCategoryIds;

  const toggle = useCallback(
    (id: NewsCategoryId) => {
      setSelected((prev) => {
        const base = prev ?? declaredCategoryIds;
        const next = new Set(base);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [declaredCategoryIds],
  );

  const reset = useCallback(() => setSelected(null), []);

  const [saving, setSaving] = useState(false);
  // Reconcile the working selection into briefing_interests: add the newly
  // chosen category beats, soft-remove the category beats that were deselected.
  // Non-category beats/entities the user added elsewhere are left untouched.
  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const target = selected ?? declaredCategoryIds;
      // add new
      for (const id of target) {
        if (declaredCategoryIds.has(id)) continue;
        const label = LABEL_BY_ID.get(id);
        if (label) {
          await add('beat', label, { source: 'manual' });
        }
      }
      // remove deselected category beats
      const labelToBeat = new Map(
        beats.map((b) => [b.text.trim().toLowerCase(), b]),
      );
      for (const id of declaredCategoryIds) {
        if (target.has(id)) continue;
        const label = LABEL_BY_ID.get(id);
        const beat = label ? labelToBeat.get(label.toLowerCase()) : undefined;
        if (beat) {
          await remove(beat.id);
        }
      }
      await refetch();
      setSelected(null);
    } finally {
      setSaving(false);
    }
  }, [saving, selected, declaredCategoryIds, beats, add, remove, refetch]);

  return {
    /** the live working selection (controlled by the picker) */
    selected: working,
    /** category ids already declared (stored beats) */
    declaredCategoryIds,
    declaredCount: declaredCategoryIds.size,
    loading,
    saving,
    toggle,
    reset,
    save,
    refetch,
  };
}
