/**
 * news-ai-native - the AI-native lock + the 9-category tagger for the briefing
 * news deck, as pure, unit-testable helpers (no I/O).
 *
 * The North Star (docs/MAIN-APP-POLISH-SPEC.md section 0): CTRL is ONLY about
 * building, orchestrating, productizing, and getting to market the AI-native
 * version of a business. The news deck must never surface general business
 * news. Every surviving headline:
 *   1. passes the AI-native test (it is about deploying/building/selling AI), and
 *   2. is tagged to exactly one of the nine locked categories (section 2.1).
 *
 * The pipeline runs an LLM classification with a strict instruction at the
 * curate step; THESE functions are the deterministic backstop so the lock and
 * the tag are never null and never silently let a general-business story
 * through when the LLM is unavailable or wrong. The category ids are the same
 * nine the frontend uses (src/types/newsCategory.ts) so server tags render
 * directly on the deck card's motif.
 */

// The nine locked category ids (must match src/types/newsCategory.ts exactly).
export type NewsCategoryId =
  | "model"
  | "economics"
  | "tools"
  | "orchestration"
  | "product"
  | "governance"
  | "security"
  | "org"
  | "proof";

export const NEWS_CATEGORY_IDS: readonly NewsCategoryId[] = [
  "model",
  "economics",
  "tools",
  "orchestration",
  "product",
  "governance",
  "security",
  "org",
  "proof",
] as const;

// The category every AI-native-but-unclassifiable story falls back to. "Model
// & capability" is the broadest "what you can now build" bucket. Mirrors the
// frontend's DEFAULT_NEWS_CATEGORY so server and client agree.
export const DEFAULT_NEWS_CATEGORY: NewsCategoryId = "model";

export function isNewsCategoryId(v: string | null | undefined): v is NewsCategoryId {
  return !!v && (NEWS_CATEGORY_IDS as readonly string[]).includes(v);
}

/**
 * The AI-native gate (deterministic backstop).
 *
 * Returns true only when the text is genuinely about deploying/building/selling
 * AI. A story is AI-native if it mentions an AI subject (models, agents, the AI
 * stack, AI economics, AI governance, etc.). A purely general-business story
 * ("company raises a Series B in retail", "appoint a new CFO") has no AI
 * subject and is rejected.
 *
 * This is intentionally a recall-leaning keyword test: the LLM filter at curate
 * is the primary precision gate; this backstop exists so that when the LLM is
 * unavailable we still reject the obvious general-business items rather than
 * letting everything through.
 */
const AI_NATIVE_SUBJECT = new RegExp(
  [
    // core AI / ML terms
    "\\bA\\.?I\\b", "artificial intelligence", "machine learning", "\\bML\\b",
    "\\bLLMs?\\b", "large language model", "generative ai", "gen ?ai", "genai",
    "foundation model", "frontier model", "multimodal", "neural",
    "deep learning", "transformer", "diffusion model",
    // named models / providers (capability + tools categories)
    "\\bGPT\\b", "gpt-?\\d", "chatgpt", "\\bo\\d\\b", "claude", "gemini",
    "llama", "mistral", "\\bgrok\\b", "deepseek", "qwen", "anthropic",
    "openai", "\\bopen ?ai\\b", "hugging ?face", "nvidia", "\\bcuda\\b",
    // agents / orchestration
    "\\bagents?\\b", "agentic", "multi-?agent", "autonomous agent",
    "orchestrat", "\\bmcp\\b", "model context protocol", "copilot",
    "\\bcopilots?\\b", "agent reliability", "\\bevals?\\b", "tool use",
    // AI economics
    "inference cost", "token cost", "per-token", "cost per token",
    "training cost", "compute cost", "\\bGPU\\b", "\\bTPU\\b",
    // AI product / GTM
    "ai-?native", "ai-?powered", "ai-?driven", "ai feature", "ai product",
    "ai capability", "ai assistant", "ai model", "ai tool", "ai platform",
    "ai startup", "ai company", "ai vendor", "ai workflow", "ai deployment",
    "ai adoption", "ai pricing",
    // governance / safety / security of AI
    "ai act", "ai regulation", "ai safety", "ai governance", "model governance",
    "prompt injection", "jailbreak", "ai risk", "ai security",
    "responsible ai", "ai compliance",
    // proof / adoption framed around AI
    "ai rollout", "deployed ai", "ai in production", "ai pilot",
    "automat", "rag\\b", "retrieval-augmented", "fine-?tun", "embeddings?",
    "vector database", "vector db",
  ].join("|"),
  "i",
);

export function isAiNative(text: string | null | undefined): boolean {
  const hay = (text ?? "").trim();
  if (hay.length === 0) return false;
  return AI_NATIVE_SUBJECT.test(hay);
}

/**
 * Off-lens topical exclusion.
 *
 * The North Star (docs/MAIN-APP-POLISH-SPEC.md section 0) is the AI-native
 * version of a BUSINESS - building, orchestrating, productizing, and getting to
 * market. A story can pass {@link isAiNative} on a keyword ("NVIDIA", "AI") yet
 * be squarely about a domain a leader building an AI-native business has no use
 * for: AI applied to drug discovery / genomics / medicine, pure scientific
 * research, robotics/self-driving hardware, gaming, or crypto. Those are the
 * off-lens buckets we hard-remove.
 *
 * The escape hatch: if the SAME text also carries a strong business / product /
 * deployment / tooling signal (a real GTM, funding, enterprise-adoption, pricing
 * or platform angle), we keep it - a genuinely AI-native business move that
 * merely mentions an off-lens sector should not be dropped. So this is
 * "off-lens subject AND no business signal".
 */
const OFF_LENS_SUBJECT = new RegExp(
  [
    // life sciences / medicine / bio
    "drug discovery", "drug design", "protein", "genomic", "genom(e|ic)s?",
    "molecul", "biolog", "biotech", "\\bpharma", "clinical", "\\bmedic(al|ine)\\b",
    "\\bdisease", "\\bcancer\\b", "oncolog", "\\bgenes?\\b", "\\bdna\\b",
    "\\brna\\b", "vaccine", "diagnos(is|tic|e)", "healthcare diagnos",
    "patient", "\\bfda\\b", "life sciences", "bioinformatic", "neuroscience",
    // pure scientific research (not the AI industry)
    "astronom", "astrophys", "particle physics", "\\bquantum (chemistry|physics|computing)\\b",
    "materials science", "climate model", "weather forecast", "fusion reactor",
    "nuclear fusion", "telescope", "\\bgalax", "\\bcosmo",
    // robotics / autonomous hardware
    "\\brobot", "humanoid", "self-?driving", "autonomous vehicle", "\\bdrone",
    "warehouse robot",
    // consumer entertainment / gaming
    "video game", "\\bgaming\\b", "game studio", "\\besports?\\b",
    // crypto / web3 (NB: not "token price" - that is core LLM economics, not crypto)
    "crypto", "blockchain", "bitcoin", "ethereum", "\\bnft\\b", "\\bweb3\\b",
    "\\bdefi\\b",
  ].join("|"),
  "i",
);

// A story that ALSO reads as a business/product/GTM move is kept even if it
// brushes an off-lens sector (e.g. "AI drug-discovery startup raises $200M and
// ships an enterprise platform"). Keep this narrow: real commercial signal, not
// any stray word.
const BUSINESS_SIGNAL = new RegExp(
  [
    "raise[sd]?", "funding", "series [a-e]\\b", "valuation", "\\bipo\\b",
    "acqui(re|red|sition)", "go-to-market", "\\bgtm\\b", "enterprise adoption",
    "revenue", "pricing", "per-seat", "subscription", "productiz", "monetiz",
    "launches an? (platform|product|api|tool)", "ships an? (platform|product)",
    "developer platform", "\\bsaas\\b", "customers deploy", "in production at",
  ].join("|"),
  "i",
);

export function isOffLensTopic(text: string | null | undefined): boolean {
  const hay = (text ?? "").trim();
  if (hay.length === 0) return false;
  if (!OFF_LENS_SUBJECT.test(hay)) return false;
  // Off-lens subject present: keep ONLY if it also carries real business signal.
  return !BUSINESS_SIGNAL.test(hay);
}

/**
 * The composite gate the pipeline uses: a story earns a place in the AI-native
 * business feed only if it is AI-native AND not an off-lens (science/bio/
 * robotics/gaming/crypto) story without a business angle.
 */
export function isAiNativeBusiness(text: string | null | undefined): boolean {
  return isAiNative(text) && !isOffLensTopic(text);
}

/**
 * The category classifier (deterministic backstop).
 *
 * Order matters: more specific risk/compliance/economics rules come before the
 * broad "model" bucket so they are not swallowed by it. Mirrors the intent of
 * the frontend's KEYWORD_RULES but tuned for the server's richer text
 * (headline + analysis + matched profile fact). Always returns a category;
 * defaults to {@link DEFAULT_NEWS_CATEGORY} for AI-native-but-generic stories.
 */
const CATEGORY_RULES: Array<{ id: NewsCategoryId; words: RegExp }> = [
  {
    id: "security",
    words:
      /\b(prompt injection|jailbreak|exploit|data leak|leakage|breach|malware|agent misuse|attack|vulnerab|phishing|threat surface|adversarial)\b/i,
  },
  {
    id: "governance",
    words:
      /\b(regulat|compliance|eu ai act|\bai act\b|gdpr|privacy|audit|governance|policy|lawsuit|legal|safety|guardrail|oversight|copyright)\b/i,
  },
  {
    id: "economics",
    words:
      /\b(price|pricing|cost|cheaper|per-token|token cost|inference cost|compute cost|gpu price|expensive|budget|spend|margin|cost curve|free tier)\b/i,
  },
  {
    id: "orchestration",
    words:
      /\b(orchestrat|multi-?agent|\bmcp\b|model context protocol|agent reliab|eval|hand-?off|autonom|agentic workflow|tool use|interop|agent mesh)\b/i,
  },
  {
    id: "proof",
    words:
      /\b(adopt|in production|case study|\broi\b|deployed|rollout|pilot|customers? (using|deploy)|real deployment|live deployment|results show|measurable)\b/i,
  },
  {
    id: "product",
    words:
      // Bare "ship"/"launch" are deliberately excluded: they describe model and
      // tool releases just as often as a GTM move, so they belong to those
      // buckets. Product owns the packaging/pricing/distribution language.
      /\b(go-to-market|\bgtm\b|packaging|package(s|d)?\b|pricing tier|per-seat|seat|subscription|distribution|productiz|monetiz|sell(s|ing)?|offering|bundle)\b/i,
  },
  {
    id: "org",
    words:
      /\b(hir|talent|headcount|reskill|workforce|ways of working|culture|\bteam\b|new role|restructur|layoff|org chart|skills gap)\b/i,
  },
  {
    id: "tools",
    words:
      /\b(framework|\bsdk\b|platform|vendor|integration|connector|langchain|llamaindex|\bapi\b|infrastructure|infra|stack|tooling|plugin|released a tool|dev tool)\b/i,
  },
  {
    id: "model",
    words:
      /\b(model|gpt|claude|gemini|llama|mistral|grok|opus|sonnet|context window|capability|multimodal|frontier|param|reasoning model|deprecat|new release|benchmark)\b/i,
  },
];

export function classifyCategory(text: string | null | undefined): NewsCategoryId {
  const hay = (text ?? "").trim();
  if (hay.length === 0) return DEFAULT_NEWS_CATEGORY;
  for (const rule of CATEGORY_RULES) {
    if (rule.words.test(hay)) return rule.id;
  }
  return DEFAULT_NEWS_CATEGORY;
}

/**
 * Resolve a final category id given an (optional) LLM-assigned id and the
 * segment text. A valid LLM id wins; otherwise the keyword classifier runs.
 * Never returns null.
 */
export function resolveCategory(
  llmAssigned: string | null | undefined,
  text: string,
): NewsCategoryId {
  if (isNewsCategoryId(llmAssigned)) return llmAssigned;
  return classifyCategory(text);
}

/**
 * A relative time string for a story given its published timestamp and a
 * reference "now". Briefing candidates rarely carry a real published date; when
 * `publishedIso` is absent we honestly return "Today" (the day CTRL curated the
 * story into the deck), never a fabricated age. The frontend renders this
 * string verbatim (NewsHeadlineCard `card.timeAgo`).
 */
export function relativeTimeAgo(
  publishedIso: string | null | undefined,
  nowMs: number = Date.now(),
): string {
  if (!publishedIso) return "Today";
  const t = Date.parse(publishedIso);
  if (!Number.isFinite(t)) return "Today";
  const diffMs = nowMs - t;
  if (diffMs < 0) return "Today";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return mins <= 1 ? "Just now" : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1w ago" : `${weeks}w ago`;
}
