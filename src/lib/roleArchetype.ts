// roleArchetype - a real (but inferred, never re-asked) understanding of what a
// leader's JOB actually cares about, projected onto the nine AI-native news
// lanes. We already capture the leader's role/title (identity facts) and their
// sector/industry (business facts + firmographics); this turns those into a
// per-category affinity so the feed can score headlines by suitability to THIS
// person - a CFO leans economics + governance, a CTO leans tools + orchestration
// + model, a CMO leans product + proof, and so on.
//
// Pure + unit-testable. No I/O, no LLM, no extra questions: the archetype is a
// considered, hand-built map (the "understanding" encoded once), and the
// industry adds a light secondary lift.

import type { NewsCategoryId } from '@/types/newsCategory';

const ALL_CATEGORIES: readonly NewsCategoryId[] = [
  'model', 'economics', 'tools', 'orchestration', 'product', 'governance', 'security', 'org', 'proof',
];

export interface RoleArchetype {
  id: string;
  /** Human label, e.g. "Founder / CEO". */
  label: string;
  /** One-line "what this job is really watching for" (copy / debug). */
  lens: string;
  /** Per-category affinity 0..1; missing categories default to 0.5 (neutral). */
  affinity: Partial<Record<NewsCategoryId, number>>;
}

interface ArchetypeDef extends RoleArchetype {
  /** Matched against the lowercased role string; FIRST match wins, so the most
   * specific roles must precede the broad founder/CEO catch. */
  test: RegExp;
}

// Ordered most-specific first. A "VP of Engineering" must match engineering, not
// the founder catch; a bare "CEO" with no other signal falls through to founder.
const ARCHETYPES: readonly ArchetypeDef[] = [
  {
    id: 'engineering',
    label: 'Engineering / technical lead',
    lens: 'building and running the systems',
    test: /\b(cto|chief technolog|vp eng|head of eng|engineer|engineering|developer|architect|technical|devops|platform|infrastructure)\b/,
    affinity: { tools: 1, orchestration: 1, model: 0.9, security: 0.8, proof: 0.7, economics: 0.5, product: 0.5, governance: 0.4, org: 0.4 },
  },
  {
    id: 'data_ai',
    label: 'Data / AI lead',
    lens: 'the models and how they actually perform',
    test: /\b(data|ml\b|machine learning|ai lead|head of ai|chief data|cdo|scientist|analytics)\b/,
    affinity: { model: 1, orchestration: 0.9, tools: 0.9, proof: 0.8, security: 0.7, economics: 0.6, governance: 0.6, product: 0.5, org: 0.4 },
  },
  {
    id: 'product',
    label: 'Product lead',
    lens: 'what to build and how it lands',
    test: /\b(cpo|chief product|head of product|product manager|product lead|product owner|\bpm\b)\b/,
    affinity: { product: 1, proof: 0.8, model: 0.7, economics: 0.7, tools: 0.6, orchestration: 0.6, governance: 0.5, security: 0.5, org: 0.4 },
  },
  {
    id: 'marketing',
    label: 'Marketing / growth lead',
    lens: 'how AI-native products get sold',
    test: /\b(cmo|chief marketing|marketing|growth|brand|demand gen|content lead)\b/,
    affinity: { product: 1, proof: 0.8, economics: 0.7, model: 0.6, tools: 0.5, org: 0.4, orchestration: 0.4, governance: 0.4, security: 0.3 },
  },
  {
    id: 'sales',
    label: 'Sales / revenue lead',
    lens: 'proof that it works, and the go-to-market',
    test: /\b(cro|chief revenue|sales|revenue|account exec|business development|\bbd\b|\bgtm\b)\b/,
    affinity: { proof: 1, product: 0.9, economics: 0.7, model: 0.5, tools: 0.4, orchestration: 0.4, org: 0.4, governance: 0.3, security: 0.3 },
  },
  {
    id: 'finance',
    label: 'Finance lead',
    lens: 'the cost curve and the numbers',
    test: /\b(cfo|chief financial|finance|financial|controller|treasur|fp&a)\b/,
    affinity: { economics: 1, proof: 0.8, governance: 0.7, security: 0.6, product: 0.6, model: 0.5, org: 0.5, tools: 0.4, orchestration: 0.4 },
  },
  {
    id: 'operations',
    label: 'Operations lead',
    lens: 'wiring AI into how the work runs',
    test: /\b(coo|chief operating|operations|\bops\b|process|supply chain)\b/,
    affinity: { orchestration: 0.9, proof: 0.9, org: 0.8, tools: 0.7, economics: 0.7, product: 0.6, governance: 0.6, security: 0.6, model: 0.5 },
  },
  {
    id: 'people',
    label: 'People / talent lead',
    lens: 'how teams and roles change',
    test: /\b(chro|chief people|people lead|head of people|\bhr\b|human resources|talent|recruit|culture|l&d)\b/,
    affinity: { org: 1, proof: 0.7, governance: 0.7, security: 0.5, economics: 0.5, product: 0.4, model: 0.4, tools: 0.4, orchestration: 0.4 },
  },
  {
    id: 'risk',
    label: 'Legal / risk / security lead',
    lens: 'what you are allowed to deploy, safely',
    test: /\b(legal|counsel|\bgc\b|compliance|\brisk\b|ciso|security officer|privacy|governance|regulat)\b/,
    affinity: { governance: 1, security: 0.9, proof: 0.6, org: 0.6, economics: 0.5, model: 0.5, product: 0.4, orchestration: 0.4, tools: 0.3 },
  },
  {
    id: 'founder',
    label: 'Founder / CEO',
    lens: 'the whole AI-native bet',
    test: /\b(founder|co-?founder|ceo|chief exec|owner|president|managing director|\bmd\b|managing partner|general partner)\b/,
    affinity: { economics: 0.9, product: 0.9, model: 0.8, proof: 0.8, org: 0.6, governance: 0.5, orchestration: 0.5, tools: 0.5, security: 0.5 },
  },
];

// The neutral generalist: a leader whose role we cannot place. Balanced, tilted
// gently toward the "is this worth my time as an operator" lanes.
export const DEFAULT_ARCHETYPE: RoleArchetype = {
  id: 'leader',
  label: 'Leader',
  lens: 'the AI-native version of your business',
  affinity: { economics: 0.7, model: 0.7, product: 0.7, proof: 0.7, tools: 0.6, orchestration: 0.6, governance: 0.5, org: 0.5, security: 0.5 },
};

/** Resolve a free-text role/title into its archetype (default when unknown). */
export function resolveArchetype(role: string | null | undefined): RoleArchetype {
  const r = (role || '').toLowerCase().trim();
  if (r) {
    for (const a of ARCHETYPES) if (a.test.test(r)) return a;
  }
  return DEFAULT_ARCHETYPE;
}

// A light secondary signal: what the BUSINESS does nudges a few lanes up. Small
// additive lifts (0..~0.3) layered on top of the role affinity.
const INDUSTRY_RULES: readonly { test: RegExp; lift: Partial<Record<NewsCategoryId, number>> }[] = [
  { test: /fintech|financ|bank|payment|capital|insur|invest|asset|trading/, lift: { governance: 0.3, security: 0.3, economics: 0.3, proof: 0.2 } },
  { test: /health|bio|pharma|medic|clinic|\bcare\b|life scien/, lift: { governance: 0.3, proof: 0.3, security: 0.2 } },
  { test: /legal|\blaw\b|compliance|regulat/, lift: { governance: 0.3, security: 0.2 } },
  { test: /software|saas|\btech\b|developer|platform|cloud|\bdata\b|\bit\b/, lift: { tools: 0.3, orchestration: 0.3, model: 0.2 } },
  { test: /retail|consumer|e-?commerce|commerce|\bbrand\b|\bcpg\b|\bdtc\b/, lift: { product: 0.3, economics: 0.2, proof: 0.2 } },
  { test: /media|content|market|advert|agenc|publish/, lift: { product: 0.3, proof: 0.2 } },
  { test: /manufactur|industr|logist|supply|\bauto\b|energy|utilit/, lift: { orchestration: 0.3, proof: 0.2, org: 0.2 } },
  { test: /educat|edtech|learn|train/, lift: { product: 0.2, org: 0.2, proof: 0.2 } },
];

function industryLift(industry: string | null | undefined): Partial<Record<NewsCategoryId, number>> {
  const s = (industry || '').toLowerCase().trim();
  if (!s) return {};
  for (const r of INDUSTRY_RULES) if (r.test.test(s)) return r.lift;
  return {};
}

/**
 * The leader's suitability score per category, 0..1: how well a story in each
 * lane fits what their JOB (role archetype) and their BUSINESS (industry) are
 * actually watching for. Used to ORDER the surfaced headlines by fit-to-them.
 */
export function roleFitByCategory(
  role: string | null | undefined,
  industry: string | null | undefined,
): Record<NewsCategoryId, number> {
  const arch = resolveArchetype(role);
  const lift = industryLift(industry);
  const out = {} as Record<NewsCategoryId, number>;
  for (const c of ALL_CATEGORIES) {
    const base = arch.affinity[c] ?? 0.5;
    out[c] = Math.max(0, Math.min(1, base * 0.8 + (lift[c] ?? 0)));
  }
  return out;
}
