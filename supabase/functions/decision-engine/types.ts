// Shared types for the Decision Engine pipeline.

export type ClaimType = "factual" | "market" | "causal" | "assumption" | "forecast";
export type Verdict = "supported" | "contested" | "unverified" | "unverifiable" | "pending";
export type Stance = "supports" | "refutes" | "neutral";
export type Retriever = "perplexity" | "exa" | "brave" | "tavily" | "newsapi" | "pdl" | "builtwith" | "tranco" | "memory" | "artificialanalysis";

// The 6 fixed AI-native forces every decision spiders into (matches AI_NATIVE_DIMENSIONS in
// _shared/decision-ai-native.ts). Each claim is tagged with the single force it most bears on.
export type Dimension = "capability" | "economics" | "risk" | "build_buy" | "team" | "timing";
export const DIMENSIONS: readonly Dimension[] = ["capability", "economics", "risk", "build_buy", "team", "timing"] as const;

export interface ExtractedClaim {
  text: string;
  type: ClaimType;
  is_load_bearing: boolean;
  dimension: Dimension;
}

export interface DecomposeResult {
  title: string;
  decision_kind: "binary" | "directional" | "investment" | "hiring" | "gtm" | "other";
  claims: ExtractedClaim[];
  profile_tensions: Array<{ description: string; severity: "low" | "medium" | "high" }>;
  // A 1-2 word specific concern per force that appears in this decision, e.g.
  // { economics: "Token cost", risk: "Hallucination" }. Supplies the decision-specific node
  // captions in the spider (the client falls back to the generic force name when absent).
  force_labels: Partial<Record<Dimension, string>>;
}

export interface Evidence {
  source_url: string | null;
  source_title: string | null;
  excerpt: string | null;
  stance: Stance;
  retriever: Retriever;
  relevance_score: number | null;
  // When the source was published, if the retriever surfaced it (Exa `publishedDate`,
  // NewsAPI `publishedAt`). null when unknown - the freshness score treats that as neutral,
  // never as stale. ISO-8601 string.
  published_at?: string | null;
  // A short 2-4 word category label the adjudicator assigns so the UI can NEST many sources of
  // the same kind under one heading (e.g. "Pricing benchmarks", "Independent cost tests") instead
  // of a flat 30-40 card scroll. null when un-adjudicated (assumptions, research-mode gathers) -
  // the client-side grouper falls back to token clustering for those rows.
  theme?: string | null;
}

export interface ClaimVerdict {
  verdict: Verdict;
  confidence: number | null;
  rationale: string;
}

export interface AdviseResult {
  recommendation: string;
  counter_case: string;
  breakpoint_claim_index: number;
  confidence: number;
  validate_next: string[];
}
