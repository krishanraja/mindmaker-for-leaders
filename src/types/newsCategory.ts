// The nine locked AI-native news categories (docs/MAIN-APP-POLISH-SPEC.md section 2.1).
// Every news headline is tagged to exactly one of these. Each category owns one
// branded SVG motif (the headline card's hero band) - see CategoryMotif.tsx.
//
// The id is the stable key (used by the motif registry + the client fallback
// classifier); `label` is the chip text shown on the card; `name` is the full
// spec name used in the motif-family preview.

export type NewsCategoryId =
  | 'model'
  | 'economics'
  | 'tools'
  | 'orchestration'
  | 'product'
  | 'governance'
  | 'security'
  | 'org'
  | 'proof';

export interface NewsCategory {
  id: NewsCategoryId;
  label: string; // the short chip label on the card
  name: string; // the full spec name (preview / a11y)
  blurb: string; // one line describing the motif (preview only)
}

// Ordered as in the spec (1..9). The chip labels match the approved prototype.
export const NEWS_CATEGORIES: NewsCategory[] = [
  { id: 'model', label: 'Model & capability', name: '1. Model & capability shifts', blurb: 'A glowing neural core inside a capability dial.' },
  { id: 'economics', label: 'AI economics', name: '2. AI economics', blurb: 'A falling cost curve reading down to today’s low.' },
  { id: 'tools', label: 'Tools & vendors', name: '3. Tools, platforms & vendors', blurb: 'A connector lattice threading a three-plane stack.' },
  { id: 'orchestration', label: 'Orchestration', name: '4. Orchestration & agent reliability', blurb: 'An agent mesh around a bright orchestrator hub.' },
  { id: 'product', label: 'Product & GTM', name: '5. AI-native product & go-to-market', blurb: 'A sealed package on a rising launch arc.' },
  { id: 'governance', label: 'Governance', name: '6. Governance, safety & compliance', blurb: 'A shield drawing its compliance seal.' },
  { id: 'security', label: 'Security & risk', name: '7. Security & agent risk', blurb: 'A lock split by a live emerald fracture.' },
  { id: 'org', label: 'Org & talent', name: '8. Org, talent & ways of working', blurb: 'An org tree of person-nodes, gently drifting.' },
  { id: 'proof', label: 'Proof & adoption', name: '9. Proof & adoption', blurb: 'Adoption bars under a rising, verified proof line.' },
];

const BY_ID = new Map<NewsCategoryId, NewsCategory>(NEWS_CATEGORIES.map((c) => [c.id, c]));

export function isNewsCategoryId(v: string | null | undefined): v is NewsCategoryId {
  return !!v && BY_ID.has(v as NewsCategoryId);
}

export function getNewsCategory(id: NewsCategoryId): NewsCategory {
  return BY_ID.get(id)!;
}

// The category every unclassifiable / general story falls back to. Model &
// capability is the broadest "what you can now build" bucket, the safest default.
export const DEFAULT_NEWS_CATEGORY: NewsCategoryId = 'model';

/**
 * resolveNewsCategory - decide which of the nine categories a deck card belongs to.
 *
 * Resolution order:
 *   1. an explicit, valid `category` id (server-assigned) wins, always.
 *   2. otherwise a SMALL keyword classifier maps the headline + why-line text to
 *      a category, defaulting to {@link DEFAULT_NEWS_CATEGORY}.
 *
 * The live-headlines pipeline now populates `category` server-side (the
 * deterministic AI-native classifier in supabase/functions/_shared/news-ai-native.ts
 * runs over each clustered story), so path 1 is the live path for the Home feed.
 * This client-side keyword classifier remains as the fallback for any card that
 * arrives without a valid category id (older briefing rows, the bundled cold
 * deck); it is intentionally simple and not a substitute for the server tagger.
 */
const KEYWORD_RULES: Array<{ id: NewsCategoryId; words: RegExp }> = [
  // order matters: earlier rules win on a tie. Specific risk/compliance terms
  // come before the broad "model" bucket so they are not swallowed by it.
  { id: 'security', words: /\b(prompt injection|jailbreak|exploit|data leak|leakage|breach|malware|attack|vulnerab|phishing|threat)\b/i },
  { id: 'governance', words: /\b(regulat|compliance|eu ai act|gdpr|privacy|audit|governance|policy|lawsuit|legal|safety|guardrail)\b/i },
  { id: 'economics', words: /\b(price|pricing|cost|cheaper|token|compute|\$|expensive|inference cost|budget|spend|margin)\b/i },
  { id: 'orchestration', words: /\b(agent|orchestrat|multi-agent|mcp|workflow|eval|reliab|hand-?off|autonom|pipeline|tool use)\b/i },
  { id: 'tools', words: /\b(framework|sdk|platform|vendor|integration|connector|langchain|api|infra|stack|tooling|plugin)\b/i },
  { id: 'product', words: /\b(launch|ship|product|go-to-market|gtm|pricing tier|packaging|seat|subscription|distribution|sell)\b/i },
  { id: 'org', words: /\b(hir|team|talent|role|headcount|org|reskill|workforce|job|ways of working|culture)\b/i },
  { id: 'proof', words: /\b(adopt|deployment|case study|roi|results|proof|customers|rollout|in production|live deployment)\b/i },
  { id: 'model', words: /\b(model|gpt|claude|gemini|llama|opus|context window|capability|multimodal|frontier|release|param|reasoning)\b/i },
];

export function resolveNewsCategory(
  explicit: string | null | undefined,
  text: string,
): NewsCategoryId {
  if (isNewsCategoryId(explicit)) return explicit;
  const hay = text || '';
  for (const rule of KEYWORD_RULES) {
    if (rule.words.test(hay)) return rule.id;
  }
  return DEFAULT_NEWS_CATEGORY;
}
