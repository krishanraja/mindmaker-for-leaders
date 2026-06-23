// Shared types for the Decision Engine pipeline.

export type ClaimType = "factual" | "market" | "causal" | "assumption" | "forecast";
export type Verdict = "supported" | "contested" | "unverified" | "unverifiable" | "pending";
export type Stance = "supports" | "refutes" | "neutral";
export type Retriever = "perplexity" | "exa" | "brave" | "tavily" | "newsapi" | "pdl" | "builtwith" | "tranco" | "memory" | "artificialanalysis";

export interface ExtractedClaim {
  text: string;
  type: ClaimType;
  is_load_bearing: boolean;
}

export interface DecomposeResult {
  title: string;
  decision_kind: "binary" | "directional" | "investment" | "hiring" | "gtm" | "other";
  claims: ExtractedClaim[];
  profile_tensions: Array<{ description: string; severity: "low" | "medium" | "high" }>;
}

export interface Evidence {
  source_url: string | null;
  source_title: string | null;
  excerpt: string | null;
  stance: Stance;
  retriever: Retriever;
  relevance_score: number | null;
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
