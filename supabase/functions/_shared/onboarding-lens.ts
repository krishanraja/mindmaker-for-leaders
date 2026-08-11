/**
 * One deterministic translation from the public onboarding answers into the
 * nine AI-native news lanes. Raw free text stays server-side.
 */

const MATCHERS: Array<[RegExp, string[]]> = [
  [/\b(team|people|hire|hiring|headcount|staff|replace|layoff|reorg|restructure)\b/i, ['org', 'orchestration']],
  [/\b(tool|tools|stack|consolidat|software|platform)\b/i, ['tools']],
  [/\b(build|buy|vendor|lock[- ]?in|cost|price|pricing|budget|spend|roi|expensive)\b/i, ['economics']],
  [/\b(agent|agents|automat|workflow|autonomous|orchestrat|pipeline)\b/i, ['orchestration']],
  [/\b(board|investor|positioning|narrative|fundrais|raise)\b/i, ['product', 'proof']],
  [/\b(supervis|govern|regulat|compliance|risk|safe|legal|policy)\b/i, ['governance', 'security']],
  [/\b(breach|leak|attack|secur|jailbreak|injection)\b/i, ['security']],
  [/\b(product|gtm|go[- ]?to[- ]?market|launch|customer|sales|growth)\b/i, ['product']],
  [/\b(model|models|gpt|claude|gemini|llm|capabilit|benchmark)\b/i, ['model']],
  [/\b(deploy|production|proof|case stud|outcome)\b/i, ['proof']],
];

export const ONBOARDING_LANE_LABELS: Record<string, string> = {
  model: 'Which models to bet on',
  economics: 'Build-vs-buy and AI cost',
  tools: 'Which AI tools to standardise on',
  orchestration: 'Wiring agents into the work',
  product: 'Rebuilding go-to-market with AI',
  governance: 'Policy and guardrails',
  security: 'AI security exposure',
  org: 'Team and headcount under AI',
  proof: 'Proving AI pays off',
};

function add(weights: Record<string, number>, lane: string, weight: number) {
  weights[lane] = (weights[lane] ?? 0) + weight;
}

export function onboardingLaneWeights(input: {
  q5?: string | null;
  q2?: string | null;
  q4?: string | null;
}): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const [pattern, lanes] of MATCHERS) {
    if (!pattern.test(input.q5 ?? '')) continue;
    lanes.forEach((lane, index) => add(weights, lane, index === 0 ? 3 : 1.5));
  }

  const q2Lanes: Record<string, string[]> = {
    think: ['model', 'proof'],
    do: ['orchestration', 'product'],
    talk: ['governance', 'org'],
    watch: ['proof', 'security'],
  };
  const q4Lanes: Record<string, string[]> = {
    same: ['tools', 'proof'],
    leaner: ['economics', 'org'],
    hybrid: ['orchestration', 'org'],
    autonomous: ['orchestration', 'governance'],
  };
  for (const lane of q2Lanes[input.q2 ?? ''] ?? []) add(weights, lane, 0.75);
  for (const lane of q4Lanes[input.q4 ?? ''] ?? []) add(weights, lane, 1);
  return weights;
}

export function strongestOnboardingLane(input: {
  q5?: string | null;
  q2?: string | null;
  q4?: string | null;
}): string | null {
  const ranked = Object.entries(onboardingLaneWeights(input)).sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] ?? null;
}

export function rankPoolForOnboarding<T extends { category?: string | null; score?: number | null }>(
  cards: T[],
  input: { q5?: string | null; q2?: string | null; q4?: string | null },
): T[] {
  const weights = onboardingLaneWeights(input);
  return cards
    .map((card, index) => ({
      card,
      index,
      score: Number(card.score ?? 0) + (weights[card.category ?? ''] ?? 0) * 2,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ card }) => card);
}
