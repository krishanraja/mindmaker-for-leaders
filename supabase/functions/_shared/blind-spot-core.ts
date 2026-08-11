/** Pure, deterministic gates for generated Blind Spot observations. */

const STOP_WORDS = new Set([
  'about', 'after', 'again', 'against', 'being', 'company', 'could', 'every',
  'first', 'their', 'there', 'these', 'thing', 'those', 'through', 'under',
  'until', 'where', 'which', 'while', 'would', 'yourself',
]);

function stem(word: string): string {
  if (word.length > 7 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 6 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 6 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 5 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}

export function significantWords(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map(stem)
      .filter((word) => word.length >= 5 && !STOP_WORDS.has(word)),
  );
}

function overlapScore(evidence: string, fact: string): number {
  const evidenceWords = significantWords(evidence);
  let overlap = 0;
  for (const word of significantWords(fact)) {
    if (evidenceWords.has(word)) overlap += 1;
  }
  return overlap;
}

/**
 * Accept at most one evidence line per source fact. Two plausible paraphrases
 * of the same fact are not two independent pieces of evidence.
 */
export function groundIndependentEvidence(evidence: string[], sourceFacts: string[]): string[] {
  const usedFacts = new Set<number>();
  const grounded: string[] = [];

  for (const item of evidence) {
    const matches = sourceFacts
      .map((fact, sourceIndex) => ({ sourceIndex, score: overlapScore(item, fact) }))
      .filter(({ sourceIndex, score }) => score >= 2 && !usedFacts.has(sourceIndex))
      .sort((a, b) => b.score - a.score);
    const best = matches[0];
    if (!best) continue;
    usedFacts.add(best.sourceIndex);
    grounded.push(item);
  }

  return grounded;
}

export function ensureTentativeInsight(value: string): string {
  const insight = value.trim();
  if (!insight) return '';
  if (/^(i wonder|there may be|there might be|you may be|you might be|it is possible)/i.test(insight)) {
    return insight;
  }
  return `I wonder if ${insight.charAt(0).toLowerCase()}${insight.slice(1)}`;
}
