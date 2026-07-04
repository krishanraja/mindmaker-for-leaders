/**
 * decision-ai-native - the AI-native lock + the honest reframe for the Decision
 * Engine, as pure, unit-testable helpers (no I/O, no Deno imports so the same
 * file runs under vitest and Deno).
 *
 * The North Star (docs/MAIN-APP-POLISH-SPEC.md section 0): CTRL is ONLY about
 * building, orchestrating, productizing, and getting to market the AI-native
 * version of a business. The decision engine must NEVER give general business
 * advice. When a leader brings a general-business decision we do not answer it
 * as-is and we do not refuse it: we REFRAME it into the AI-native version of
 * that decision and pull the leader there, surfacing the reframe honestly.
 *
 * Two responsibilities live here as deterministic logic:
 *   1. classifyDecision - is the submitted statement already AI-native (about
 *      deploying/building/selling AI), or is it general business that needs a
 *      reframe? This is the deterministic backstop; the LLM reframe stage is the
 *      primary path, but this guarantees a sane classification when the LLM is
 *      unavailable or wrong, and it is what the unit tests pin.
 *   2. templatedReframe - a deterministic, conservative AI-native restatement
 *      for the well-known general-business shapes the spec names (hire a VP of
 *      Sales, raise prices, move upmarket, cut costs, etc.). Used as the
 *      fallback restatement when the LLM reframe stage cannot run, and as the
 *      fixture the unit tests assert against.
 *
 * The AI-native lifecycle (spec section 1.1) and dimensions (1.2) are the shared
 * vocabulary the decompose + advise prompts reason within. They are exported
 * here so the prompt strings stay in lockstep with the classifier.
 */

// --- The AI-native decision model (spec section 1) -------------------------

/** The lifecycle stage an AI-native decision lives in (spec 1.1). */
export type LifecycleStage =
  | "build" // what to build WITH AI inside the business (workflows, tools, agents)
  | "orchestrate" // how AI and people are wired together: the agentic org, the autonomy line
  | "productize" // turning AI capability into the offering: the AI-native version of what you sell
  | "gtm" // how that AI-native product reaches customers: positioning, distribution, pricing of the AI offering
  | "substrate"; // the operating layer: the AI knowing you and the business (memory, voice, guardrails)

export const LIFECYCLE_STAGES: readonly LifecycleStage[] = [
  "build",
  "orchestrate",
  "productize",
  "gtm",
  "substrate",
] as const;

/** The six dimensions any AI-native decision is weighed on (spec 1.2). */
export const AI_NATIVE_DIMENSIONS: readonly string[] = [
  "Capability fit (can the AI actually do this yet)",
  "Economics (cost to build plus run vs the value)",
  "Autonomy and risk (how much AI can own, where the human checkpoint is, the failure surface)",
  "Build vs buy (your build vs a vendor or model, lock-in vs portability)",
  "Org readiness (the skills and structure to run it)",
  "Sequencing (is this the right next move, or does something come first)",
] as const;

// --- The AI-native gate -----------------------------------------------------

/**
 * The AI-native subject test (deterministic backstop). Returns true only when
 * the text is genuinely about deploying/building/selling AI: a model, an agent,
 * the AI stack, AI economics, AI governance, automating a workflow with AI, etc.
 * A purely general-business statement ("hire a VP of Sales", "raise prices",
 * "move upmarket") has no AI subject and is rejected -> it must be reframed.
 *
 * Recall-leaning by design: the LLM reframe stage is the primary precision gate;
 * this backstop exists so that when the LLM is unavailable an obviously AI-native
 * statement still passes through unchanged and an obviously general one is caught.
 */
const AI_NATIVE_SUBJECT = new RegExp(
  [
    // core AI / ML terms
    "\\bA\\.?I\\b", "artificial intelligence", "machine learning", "\\bML\\b",
    "\\bLLMs?\\b", "large language model", "generative ai", "gen ?ai", "genai",
    "foundation model", "frontier model", "multimodal", "neural net",
    "deep learning", "transformer model", "diffusion model", "embeddings?",
    "vector (database|db|store)", "\\brag\\b", "retrieval-augmented", "fine-?tun",
    // named models / providers
    "\\bGPT\\b", "gpt-?\\d", "chatgpt", "claude", "gemini", "llama", "mistral",
    "\\bgrok\\b", "deepseek", "qwen", "anthropic", "openai", "\\bopen ?ai\\b",
    "hugging ?face", "copilot", "\\bcopilots?\\b",
    // agents / orchestration / automation with AI
    "\\bagents?\\b", "agentic", "multi-?agent", "autonomous agent", "orchestrat",
    "\\bmcp\\b", "model context protocol", "agent reliability", "\\bevals?\\b",
    "tool use", "automate", "automating", "automation", "auto-?respond",
    // AI economics
    "inference cost", "token cost", "per-token", "cost per token",
    "training cost", "compute cost", "cheaper model", "switch .* model",
    // AI product / GTM / capability
    "ai-?native", "ai-?powered", "ai-?driven", "ai feature", "ai product",
    "ai capability", "ai assistant", "ai model", "ai tool", "ai platform",
    "ai workflow", "ai deployment", "ai adoption", "ai pricing", "ai offering",
    "ai-?first", "model (to|for)", "\\bmodels?\\b",
    // governance / safety / security of AI
    "ai act", "ai regulation", "ai safety", "ai governance", "model governance",
    "prompt injection", "jailbreak", "ai risk", "ai security", "responsible ai",
    "ai compliance", "guardrail",
  ].join("|"),
  "i",
);

// Human-agent phrases. The bare word "agent(s)" is a strong AI signal ("build an
// agent", "agentic workflow") but a common false positive when it means PEOPLE
// (support agents, sales agents, call-center agents). Without this guard,
// "hire two more support agents" was classified AI-native and skipped the reframe
// it needed. We mask these specific human-agent phrases before the AI test so the
// "agents" token no longer fires, while every genuine AI-agent phrase still does.
const HUMAN_AGENT_PHRASE =
  /\b(support|sales|service|customer(?:[- ]?service)?|human|live|floor|field|call(?:[- ]?cent(?:er|re))?|contact(?:[- ]?cent(?:er|re))?|insurance|real[- ]?estate|leasing|booking|reservations?|travel|ticket|onboarding|retention|success)\s+agents?\b/gi;

export function isAiNativeDecision(text: string | null | undefined): boolean {
  const hay = (text ?? "").trim();
  if (hay.length === 0) return false;
  // Neutralise human-agent phrases so "support agents" does not read as AI.
  const masked = hay.replace(HUMAN_AGENT_PHRASE, "$1 staff");
  return AI_NATIVE_SUBJECT.test(masked);
}

// --- The deterministic templated reframe ------------------------------------

/**
 * The well-known general-business shapes the spec calls out, each mapped to the
 * AI-native version of the decision and the lifecycle stage it lands in. Order
 * matters: the first matching shape wins. These are the conservative fallback
 * restatements used when the LLM reframe stage cannot run, and the fixtures the
 * unit tests assert against. The LLM stage produces a context-specific reframe
 * in normal operation; these guarantee we never silently pass a general decision
 * through and never fabricate.
 */
interface ReframeShape {
  id: string;
  /** Matches the general-business decision shape. */
  match: RegExp;
  /** The AI-native restatement (no em dashes, ends as a question pulling to the AI-native lens). */
  reframed: string;
  stage: LifecycleStage;
}

const REFRAME_SHAPES: ReframeShape[] = [
  {
    id: "hire-sales",
    match: /\b(vp|head|director) of (sales|revenue|growth|marketing)\b|\b(hire|hiring|recruit|bring on|add)\b.{0,40}\b(sales rep|salesperson|sdr|bdr|account exec|\bae\b)\b/i,
    reframed:
      "Before you hire, should an agent own part of the sales motion first, and what does the human role become once it does?",
    stage: "orchestrate",
  },
  {
    id: "hire-generic",
    match: /\b(hire|hiring|recruit|grow the team|add headcount|more reps|more people|expand the team|backfill)\b/i,
    reframed:
      "Before you add headcount, which part of this work could an agent own first, and what does the human role become once it does?",
    stage: "orchestrate",
  },
  {
    id: "raise-prices",
    match: /\b(raise|increase|change|cut|lower|drop)\b.{0,20}\b(price|prices|pricing)\b|\bre-?price\b|\bpricing (strategy|model)\b/i,
    reframed:
      "Should the AI-native version of your offer change what you sell and how you price the AI capability itself, rather than just moving the number?",
    stage: "productize",
  },
  {
    id: "move-upmarket",
    match: /\b(move|go|expand|push)\b.{0,20}\b(upmarket|up-market|enterprise|down-?market|mid-?market)\b/i,
    reframed:
      "What would the AI-native version of your product need to be to win this segment, and is that the move before the market move?",
    stage: "productize",
  },
  {
    id: "cut-costs",
    match: /\b(cut|reduce|lower|trim)\b.{0,20}\b(cost|costs|spend|burn|overhead|expenses)\b/i,
    reframed:
      "Which of these costs is work an agent could absorb, and what is the AI-native version of this operation that costs less to run?",
    stage: "build",
  },
  {
    id: "new-market-product",
    match: /\b(launch|enter|expand into|build|ship)\b.{0,30}\b(market|product|line|segment|geography|region|vertical)\b/i,
    reframed:
      "What is the AI-native version of this offering, and how would an AI capability be the wedge into that market rather than a feature bolted on?",
    stage: "productize",
  },
  {
    id: "raise-funding",
    match: /\b(raise|close)\b.{0,20}\b(round|funding|capital|series [a-d]|seed)\b/i,
    reframed:
      "What is the AI-native version of this business that the capital would build toward, and does becoming AI-native change how much you need or what you raise it for?",
    stage: "gtm",
  },
  {
    id: "restructure-org",
    match: /\b(restructure|reorg|re-?organi[sz]e|reorganization|flatten the org|change the org)\b/i,
    reframed:
      "What does the org look like once AI and people are wired together: where is the autonomy line, who owns the handoffs, and which roles change?",
    stage: "orchestrate",
  },
];

export interface TemplatedReframe {
  reframed: string;
  stage: LifecycleStage;
  shapeId: string;
}

/**
 * A deterministic AI-native restatement for a general-business decision, or null
 * if no known shape matches (in which case the caller falls back to the LLM
 * reframe, or a generic AI-native lens note). Never fabricates a specific claim;
 * it asks the AI-native question, pulling the leader to the right lens.
 */
export function templatedReframe(statement: string | null | undefined): TemplatedReframe | null {
  const hay = (statement ?? "").trim();
  if (hay.length === 0) return null;
  for (const shape of REFRAME_SHAPES) {
    if (shape.match.test(hay)) {
      return { reframed: shape.reframed, stage: shape.stage, shapeId: shape.id };
    }
  }
  return null;
}

// --- The classifier the pipeline + tests use --------------------------------

export interface DecisionClassification {
  /** true when the submitted statement is already about deploying/building/selling AI. */
  aiNative: boolean;
  /** true when the statement is general business and must be reframed before the engine reasons on it. */
  needsReframe: boolean;
  /**
   * The deterministic AI-native restatement when a known general-business shape
   * matched. null when the statement is already AI-native (no reframe needed) or
   * when it is general but no template matched (the LLM reframe stage owns it).
   */
  templated: TemplatedReframe | null;
}

/**
 * Classify a submitted decision statement. This is the deterministic core the
 * unit tests pin and the pipeline falls back to:
 *   - an already-AI-native statement -> { aiNative: true, needsReframe: false }
 *     and passes through unchanged.
 *   - a general-business statement -> { aiNative: false, needsReframe: true }
 *     plus a templated AI-native restatement when the shape is known.
 */
export function classifyDecision(statement: string | null | undefined): DecisionClassification {
  const aiNative = isAiNativeDecision(statement);
  if (aiNative) {
    return { aiNative: true, needsReframe: false, templated: null };
  }
  return { aiNative: false, needsReframe: true, templated: templatedReframe(statement) };
}

/**
 * The honest reframe note carried to the leader so the engine never silently
 * swaps their statement. Short, warm, AI-native, no em dashes.
 */
export const REFRAME_NOTE =
  "We reframed this to keep it about your AI-native business. CTRL pressure-tests the AI-native version of a decision, never general business advice.";
