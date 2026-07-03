/**
 * useCardForYou - the LLM-personalized "how this applies to you" line for a
 * news card's read sheet.
 *
 * When the sheet opens, this invokes the card-for-you edge function (the
 * story read through the leader's real brain context) and caches the result
 * per card in localStorage, so a card is only ever generated once per device.
 * If the call fails or times out, it falls back SILENTLY to the deterministic
 * line composed from known facts (src/lib/cardForYou.ts) - the sheet never
 * blocks and never shows an error for this.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { composeForYouLine } from '@/lib/cardForYou';
import { resolveNewsCategory } from '@/types/newsCategory';
import type { DeckCard } from '@/types/cockpit';

const CACHE_PREFIX = 'ctrl:foryou:v1:';
const TIMEOUT_MS = 12_000;

function readCache(id: string): string | null {
  try { return window.localStorage.getItem(CACHE_PREFIX + id); } catch { return null; }
}
function writeCache(id: string, line: string): void {
  try { window.localStorage.setItem(CACHE_PREFIX + id, line); } catch { /* ignore */ }
}

export interface CardForYouResult {
  line: string | null;
  /** true while the personalized line is being generated (shimmer state). */
  loading: boolean;
}

export function useCardForYou(
  card: DeckCard | null,
  leaderRole?: string | null,
  leaderSector?: string | null,
): CardForYouResult {
  const [line, setLine] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cardId = card?.id ?? null;

  useEffect(() => {
    if (!card || !cardId) {
      setLine(null);
      setLoading(false);
      return;
    }

    const cached = readCache(cardId);
    if (cached) {
      setLine(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLine(null);
    setLoading(true);

    const categoryId = resolveNewsCategory(card.category, `${card.headline} ${card.say ?? ''}`);
    const fallback = () => composeForYouLine({ role: leaderRole, sector: leaderSector, categoryId });

    const invoke = supabase.functions.invoke('card-for-you', {
      body: {
        headline: card.headline,
        say: card.say ?? undefined,
        pov: card.pov ?? undefined,
        category: categoryId,
        source: card.source ?? undefined,
      },
    });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS),
    );

    void Promise.race([invoke, timeout])
      .then((res) => {
        if (cancelled) return;
        const generated = (res as { data?: { for_you?: string } })?.data?.for_you?.trim();
        if (generated) {
          writeCache(cardId, generated);
          setLine(generated);
        } else {
          setLine(fallback());
        }
      })
      .catch(() => {
        if (!cancelled) setLine(fallback());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
    // leaderRole/leaderSector only shape the fallback; re-running on their
    // late arrival would refetch the same card for nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  return { line, loading };
}
