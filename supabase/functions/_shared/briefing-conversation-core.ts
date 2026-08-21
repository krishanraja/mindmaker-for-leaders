/** Pure response gates for a conversation grounded in one briefing. */

export function normalizeCitationIndexes(value: unknown, segmentCount: number): number[] {
  if (!Array.isArray(value) || segmentCount <= 0) return [];
  const seen = new Set<number>();
  const indexes: number[] = [];
  for (const item of value) {
    const oneBased = Number(item);
    if (!Number.isInteger(oneBased) || oneBased < 1 || oneBased > segmentCount) continue;
    const zeroBased = oneBased - 1;
    if (seen.has(zeroBased)) continue;
    seen.add(zeroBased);
    indexes.push(zeroBased);
  }
  return indexes.slice(0, 3);
}

export function cleanConversationText(value: unknown, maxLength: number): string {
  return String(value ?? '')
    .replace(/[\u2013\u2014]/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}
