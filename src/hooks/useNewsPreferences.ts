import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { NewsCategoryId } from '@/types/newsCategory';
import {
  DEFAULT_NEWS_PREFERENCES,
  type NewsBias,
  type NewsPreferences,
} from '@/lib/newsPriority';

const db = supabase as unknown as SupabaseClient;
const LS_KEY = 'ctrl_news_preferences';

/**
 * The leader's news priorities: which lanes to lift + how they like to scan.
 *
 * Backed by a MODULE-LEVEL store (not per-hook useState) so a save in the Tune
 * sheet propagates INSTANTLY to every consumer - in particular useCockpit, which
 * re-ranks the Home deck the moment the value changes. (Before this, the sheet
 * and useCockpit held independent useState copies, so tuning never moved the
 * cards until a full remount.) State is seeded from localStorage for an instant
 * first paint, then hydrated once from news_preferences (owner-scoped). Saving is
 * optimistic and best-effort throughout: a failure never blocks the feed.
 */

// ── module-level shared store ──────────────────────────────────────────────
let current: NewsPreferences = readCache();
let loaded = false;
let loadStarted = false;
// Set once the user saves; an in-flight initial DB load must not clobber a value
// the leader just chose.
let dirty = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function getPrefsSnapshot(): NewsPreferences {
  return current;
}
function getLoadedSnapshot(): boolean {
  return loaded;
}

function setStorePreferences(next: NewsPreferences): void {
  current = next;
  writeCache(next);
  emit();
}

/** One-time hydration from the DB (per session, not per consumer). */
async function loadOnce(): Promise<void> {
  if (loadStarted) return;
  loadStarted = true;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      loaded = true;
      emit();
      return;
    }
    const { data, error } = await db
      .from('news_preferences')
      .select('boosted_categories, bias')
      .eq('user_id', user.id)
      .maybeSingle();
    // Never overwrite a value the user just saved while this load was in flight.
    if (!error && data && !dirty) {
      const prefs: NewsPreferences = {
        boosted: ((data as { boosted_categories?: string[] }).boosted_categories ?? []) as NewsCategoryId[],
        bias: normalizeBias((data as { bias?: string }).bias),
      };
      current = prefs;
      writeCache(prefs);
    }
  } catch {
    /* keep the cached/neutral value */
  } finally {
    loaded = true;
    emit();
  }
}

async function savePreferences(next: NewsPreferences): Promise<void> {
  dirty = true;
  setStorePreferences(next); // optimistic - notifies every consumer immediately
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await db
    .from('news_preferences')
    .upsert({
      user_id: user.id,
      boosted_categories: next.boosted,
      bias: next.bias,
      updated_at: new Date().toISOString(),
    })
    .then(({ error }) => {
      if (error) console.warn('news_preferences save failed:', error.message);
    });
}

export function useNewsPreferences(): {
  preferences: NewsPreferences;
  loaded: boolean;
  save: (next: NewsPreferences) => Promise<void>;
} {
  const preferences = useSyncExternalStore(subscribe, getPrefsSnapshot, getPrefsSnapshot);
  const loadedState = useSyncExternalStore(subscribe, getLoadedSnapshot, getLoadedSnapshot);

  useEffect(() => {
    void loadOnce();
  }, []);

  const save = useCallback((next: NewsPreferences) => savePreferences(next), []);

  return { preferences, loaded: loadedState, save };
}

function normalizeBias(v: string | undefined): NewsBias {
  return v === 'big' || v === 'practical' ? v : 'balanced';
}

function readCache(): NewsPreferences {
  if (typeof localStorage === 'undefined') return DEFAULT_NEWS_PREFERENCES;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_NEWS_PREFERENCES;
    const p = JSON.parse(raw) as Partial<NewsPreferences>;
    return {
      boosted: Array.isArray(p.boosted) ? (p.boosted as NewsCategoryId[]) : [],
      bias: normalizeBias(p.bias),
    };
  } catch {
    return DEFAULT_NEWS_PREFERENCES;
  }
}

function writeCache(p: NewsPreferences): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
