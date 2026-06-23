import { useCallback, useEffect, useState } from 'react';
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
 * Read from news_preferences (owner-scoped), cached in localStorage for an
 * instant first paint (the feed re-ranks the moment Home mounts, before the
 * network round-trip). Saving writes both. Best-effort throughout: a failure
 * never blocks the feed, it just falls back to neutral ranking.
 */
export function useNewsPreferences(): {
  preferences: NewsPreferences;
  loaded: boolean;
  save: (next: NewsPreferences) => Promise<void>;
} {
  const [preferences, setPreferences] = useState<NewsPreferences>(() => readCache());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setLoaded(true); return; }
      const { data, error } = await db
        .from('news_preferences')
        .select('boosted_categories, bias')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data) {
        const prefs: NewsPreferences = {
          boosted: ((data as { boosted_categories?: string[] }).boosted_categories ?? []) as NewsCategoryId[],
          bias: normalizeBias((data as { bias?: string }).bias),
        };
        setPreferences(prefs);
        writeCache(prefs);
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const save = useCallback(async (next: NewsPreferences) => {
    setPreferences(next); // optimistic
    writeCache(next);
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
      .then(({ error }) => { if (error) console.warn('news_preferences save failed:', error.message); });
  }, []);

  return { preferences, loaded, save };
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
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}
