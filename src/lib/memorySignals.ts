import type { MemoryWebFact, MemoryWebStats } from '@/types/memory';

/**
 * Law 7 (data-realist): the temperature signal is only honest once the
 * reliance loop is live. A fact is "genuinely hot" only if it has actually
 * been referenced (reference_count > 0) - which only happens after ITEM 1
 * wires touch_memory_fact and ITEM 2 schedules memory-lifecycle. Until any
 * fact has been referenced, the hot/warm thermometer is decorative and must
 * not be shown as a learning signal.
 */
export function temperatureSignalIsLive(facts: MemoryWebFact[]): boolean {
  return facts.some((f) => (f.reference_count ?? 0) > 0);
}

/** Convenience for the stats strip: show hot/warm only when the signal is live. */
export function showThermometer(facts: MemoryWebFact[], stats: MemoryWebStats | null): boolean {
  return !!stats && temperatureSignalIsLive(facts);
}
