// Correction guard (memory correction loop, delta: corrections persist as signals).
// When a leader corrects, rejects, or disputes a fact, verify_memory_fact /
// fix_memory_fact log a memory_events row carrying the prior (wrong) value.
// This module makes extraction correction-aware so the same wrong inference
// never recurs:
//   - fetchRecentCorrections: pull the newest correction events for a user
//   - buildCorrectionPromptBlock: system-prompt block telling the extractor
//     which values the leader has already ruled out
//   - applyCorrectionDamping: deterministic post-pass that DROPS a re-extracted
//     known-wrong value outright, and damps confidence + forces verification
//     when a corrected key comes back with any other value
// The prompt block is best-effort; the damping pass is the hard guarantee
// (it also closes a real recurrence bug: rejected facts leave the dedup set
// because is_current = false, so the extractor could re-insert them).

// deno-lint-ignore-file no-explicit-any

export interface CorrectionSignal {
  factKey: string;
  factLabel: string | null;
  priorValue: string | null;
  newValue: string | null; // null for rejected / disputed
  kind: 'user_corrected' | 'user_rejected' | 'user_disputed';
}

export interface DampingResult<F> {
  kept: F[];
  dropped: { fact_key: string; reason: string }[];
}

const CORRECTION_KINDS = ['user_corrected', 'user_rejected', 'user_disputed'];
export const MAX_CORRECTIONS = 20;

const DAMPED_CONFIDENCE_CAP = 0.5;
const DAMPED_CONFIDENCE_DROP = 0.15;
const DAMPED_CONFIDENCE_FLOOR = 0.3;

interface FactLike {
  fact_key: string;
  fact_value: string;
  confidence_score: number;
  is_high_stakes: boolean;
}

export async function fetchRecentCorrections(
  supabase: any,
  userId: string,
): Promise<CorrectionSignal[]> {
  const { data, error } = await supabase
    .from('memory_events')
    .select('kind, payload')
    .eq('user_id', userId)
    .in('kind', CORRECTION_KINDS)
    .order('occurred_at', { ascending: false })
    .limit(MAX_CORRECTIONS);

  if (error || !data) return [];

  const signals: CorrectionSignal[] = [];
  for (const row of data as { kind: string; payload: Record<string, unknown> | null }[]) {
    const payload = row.payload ?? {};
    const factKey = typeof payload.fact_key === 'string' ? payload.fact_key : null;
    if (!factKey) continue;
    signals.push({
      factKey,
      factLabel: typeof payload.fact_label === 'string' ? payload.fact_label : null,
      priorValue: typeof payload.prior_value === 'string' ? payload.prior_value : null,
      newValue: typeof payload.new_value === 'string' ? payload.new_value : null,
      kind: row.kind as CorrectionSignal['kind'],
    });
  }
  return signals;
}

// Appended to the extraction system prompt so the model never re-infers a
// value the leader has already ruled out. Newest correction per key wins.
export function buildCorrectionPromptBlock(corrections: CorrectionSignal[]): string {
  const newestPerKey = dedupeNewestPerKey(corrections);
  if (newestPerKey.length === 0) return '';

  const lines = newestPerKey.map((c) => {
    const label = c.factLabel ? `${c.factKey} (${c.factLabel})` : c.factKey;
    if (c.kind === 'user_corrected' && c.newValue) {
      return `- ${label}: NOT "${c.priorValue ?? 'unknown'}" (the user corrected this to "${c.newValue}")`;
    }
    return `- ${label}: NOT "${c.priorValue ?? 'unknown'}" (the user ${c.kind === 'user_disputed' ? 'disputed' : 'rejected'} this)`;
  });

  return `\n\nPRIOR CORRECTIONS BY THIS USER - never re-infer these ruled-out values:\n${lines.join('\n')}\nIf the input appears to support a ruled-out value, do not extract it; only extract that key if the input clearly states a different, current value.`;
}

// Deterministic hard pass, applied to extracted facts before guardrails:
//   - a fact whose value equals a known-wrong prior value (same key) is dropped
//   - a fact on a corrected/rejected key with a different value is kept but
//     damped (capped + reduced confidence) and forced high-stakes so it goes
//     back through user verification instead of silently landing
export function applyCorrectionDamping<F extends FactLike>(
  facts: F[],
  corrections: CorrectionSignal[],
): DampingResult<F> {
  const newestPerKey = dedupeNewestPerKey(corrections);
  if (newestPerKey.length === 0) return { kept: facts, dropped: [] };

  const byKey = new Map(newestPerKey.map((c) => [c.factKey, c]));
  const kept: F[] = [];
  const dropped: { fact_key: string; reason: string }[] = [];

  for (const fact of facts) {
    const correction = byKey.get(fact.fact_key);
    if (!correction) {
      kept.push(fact);
      continue;
    }
    const priorValue = correction.priorValue?.trim().toLowerCase() ?? '';
    const factValue = fact.fact_value?.trim().toLowerCase() ?? '';

    if (priorValue && factValue === priorValue) {
      dropped.push({
        fact_key: fact.fact_key,
        reason: `re-extraction of a value the user ${correction.kind.replace('user_', '')}`,
      });
      continue;
    }

    // If the user already corrected this key to a value and the extraction
    // agrees with that value, leave it untouched - it confirms the truth.
    const correctedValue = correction.newValue?.trim().toLowerCase() ?? '';
    if (correctedValue && factValue === correctedValue) {
      kept.push(fact);
      continue;
    }

    kept.push({
      ...fact,
      confidence_score: Math.max(
        DAMPED_CONFIDENCE_FLOOR,
        Math.min(fact.confidence_score, DAMPED_CONFIDENCE_CAP) - DAMPED_CONFIDENCE_DROP,
      ),
      is_high_stakes: true,
    });
  }

  return { kept, dropped };
}

function dedupeNewestPerKey(corrections: CorrectionSignal[]): CorrectionSignal[] {
  const seen = new Set<string>();
  const out: CorrectionSignal[] = [];
  // corrections arrive newest-first from fetchRecentCorrections
  for (const c of corrections) {
    if (seen.has(c.factKey)) continue;
    seen.add(c.factKey);
    out.push(c);
  }
  return out;
}
