/**
 * Pure, runtime-agnostic guardrail logic. No Supabase, no Deno APIs, no
 * URL imports - so this module is importable from both edge functions
 * (Deno) and the vitest harness (Node).
 *
 * The Supabase-integrated wrapper lives in `fact-guardrails.ts` and calls
 * into these functions after loading the training material.
 */

import type {
  TrainingMaterial,
  PreferenceSubtypeKey,
  ExtractionReject,
} from "./training-schema.ts";

export interface IncomingFact {
  fact_key: string;
  fact_category: string;
  fact_label: string;
  fact_value: string;
  fact_context: string;
  confidence_score: number;
  is_high_stakes: boolean;
}

export interface GuardedFact extends IncomingFact {
  fact_subtype: PreferenceSubtypeKey | null;
}

export interface RejectedFact {
  fact: IncomingFact;
  reason_id: string;
  reason: string;
}

export const MIN_CONFIDENCE = 0.55;
export const MIN_VALUE_LENGTH = 3;

export interface CompiledReject {
  id: string;
  regex: RegExp;
  reason: string;
  field: ExtractionReject["field"];
}

export function compileRejectRegexes(training: TrainingMaterial): CompiledReject[] {
  return training.extraction_rejects.map(r => ({
    id: r.id,
    regex: new RegExp(r.pattern, "i"),
    reason: r.reason,
    field: r.field,
  }));
}

/**
 * Decides whether a single fact should be rejected, and if so which rule
 * fired. Returns null when the fact passes every check.
 */
export function decideReject(
  fact: IncomingFact,
  compiled: CompiledReject[],
  training: TrainingMaterial
): { id: string; reason: string } | null {
  if (!fact.fact_value || fact.fact_value.trim().length < MIN_VALUE_LENGTH) {
    return { id: "low_signal", reason: "fact_value too short" };
  }
  if (fact.confidence_score < MIN_CONFIDENCE) {
    return { id: "low_confidence", reason: `confidence ${fact.confidence_score} < ${MIN_CONFIDENCE}` };
  }

  const haystack = `${fact.fact_value} ${fact.fact_context}`.toLowerCase();
  for (const token of training.typography_rules.forbidden_tokens) {
    if (haystack.includes(token.toLowerCase())) {
      return { id: "typography_token", reason: `contains typography token "${token}"` };
    }
  }

  for (const rule of compiled) {
    const targets: string[] = [];
    if (rule.field === "fact_value" || rule.field === "both") targets.push(fact.fact_value);
    if (rule.field === "fact_context" || rule.field === "both") targets.push(fact.fact_context || "");
    for (const t of targets) {
      if (rule.regex.test(t)) return { id: rule.id, reason: rule.reason };
    }
  }

  return null;
}

/** Maps a preference value to one of the known subtypes, or null. */
export function mapPreferenceSubtype(
  value: string,
  training: TrainingMaterial
): PreferenceSubtypeKey | null {
  const lower = value.toLowerCase();
  const keys: PreferenceSubtypeKey[] = [
    "communication_style",
    "decision_style",
    "work_style",
    "tool_or_method",
  ];
  let bestKey: PreferenceSubtypeKey | null = null;
  let bestScore = 0;
  for (const key of keys) {
    const kws = training.preference_subtypes[key].keywords;
    let score = 0;
    for (const kw of kws) {
      // Word-boundary match so short tokens like "in" or "via" don't hit
      // substrings inside unrelated words (e.g. "interesting").
      const re = new RegExp(`\\b${escapeRegex(kw.toLowerCase())}\\b`);
      if (re.test(lower)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  return bestScore > 0 ? bestKey : null;
}

/** Applies the training file's typography replacement_map to text. */
export function applyTypographyRulesCore(text: string, training: TrainingMaterial): string {
  let out = text;
  for (const [from, to] of Object.entries(training.typography_rules.replacement_map)) {
    out = out.split(from).join(to);
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

/** Returns the banned phrases present in text (case-insensitive). */
export function findBannedPhrasesCore(text: string, training: TrainingMaterial): string[] {
  const lower = text.toLowerCase();
  return training.dont_phrases.filter(p => lower.includes(p.toLowerCase()));
}

/** Strips banned phrases outright. */
export function stripBannedPhrasesCore(text: string, training: TrainingMaterial): string {
  let out = text;
  for (const p of training.dont_phrases) {
    const re = new RegExp(`\\b${escapeRegex(p)}\\b`, "gi");
    out = out.replace(re, "");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Runs the full guardrail sweep purely in-memory. Used by the test harness
 * and by the edge function's Supabase-integrated wrapper.
 */
export function runGuardrailsPure(
  facts: IncomingFact[],
  training: TrainingMaterial
): { kept: GuardedFact[]; rejected: RejectedFact[] } {
  const compiled = compileRejectRegexes(training);
  const kept: GuardedFact[] = [];
  const rejected: RejectedFact[] = [];

  for (const fact of facts) {
    const reject = decideReject(fact, compiled, training);
    if (reject) {
      rejected.push({ fact, reason_id: reject.id, reason: reject.reason });
      continue;
    }

    let subtype: PreferenceSubtypeKey | null = null;
    if (fact.fact_category === "preference") {
      subtype = mapPreferenceSubtype(fact.fact_value, training);
      if (!subtype) {
        rejected.push({
          fact,
          reason_id: "unmapped_preference",
          reason: "preference could not be mapped to a subtype; downgraded",
        });
        continue;
      }
    }

    kept.push({ ...fact, fact_subtype: subtype });
  }
  return { kept, rejected };
}
