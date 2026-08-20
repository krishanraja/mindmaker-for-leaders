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
  ThirdPartyPseudonymisation,
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

/** Builds a case-insensitive literal without needing the `i` flag. */
function caseInsensitiveLiteral(literal: string): string {
  return literal
    .split("")
    .map(ch =>
      /[a-z]/i.test(ch) ? `[${ch.toLowerCase()}${ch.toUpperCase()}]` : escapeRegex(ch),
    )
    .join("");
}

/**
 * Defaults used when the stored training row carries no pseudonymisation
 * block. Kept in code so the behaviour is never silently absent.
 */
export const DEFAULT_PSEUDONYMISATION: ThirdPartyPseudonymisation = {
  roles: [
    "chief of staff", "co-founder", "cofounder", "board member", "head of product",
    "head of sales", "head of people", "head of engineering", "general counsel",
    "executive assistant", "product manager", "account manager",
    "CTO", "CEO", "CFO", "COO", "CMO", "CRO", "CISO", "VP", "EA",
    "chair", "chairman", "chairwoman", "investor", "founder", "partner",
    "manager", "director", "assistant", "advisor", "accountant", "lawyer",
  ],
  // Words that are capitalised mid-sentence but are not people. Without this
  // the role-adjacent matcher would happily rewrite a product or a weekday.
  allowlist: [
    "I", "We", "The", "A", "An", "It", "They", "My", "Our", "Their",
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December",
    "AI", "API", "CTRL", "Q1", "Q2", "Q3", "Q4",
  ],
};

/** A capitalised token that could be a given name. */
const NAME_TOKEN = "[A-Z][a-z]{1,20}";

function activePseudonymisation(training: TrainingMaterial): ThirdPartyPseudonymisation {
  const configured = training.third_party_pseudonymisation;
  if (!configured || configured.roles.length === 0) return DEFAULT_PSEUDONYMISATION;
  return configured;
}

/**
 * Rewrites a named third party into their role.
 *
 * Deliberately conservative. It only fires where a role word is adjacent to a
 * capitalised name, because that is the case where the role is known and the
 * substitution is lossless. A bare "Sarah is not coping" carries no role, so
 * there is nothing truthful to replace it with; that case is handled by the
 * widened third_party_identity reject instead, which drops the fact.
 *
 * Handles the three shapes people actually write:
 *   "my CFO Sarah Patel"      -> "my CFO"
 *   "Sarah Patel, our CFO,"   -> "our CFO,"
 *   "Sarah Patel (CFO)"       -> "the CFO"
 */
export function pseudonymiseThirdParties(
  text: string,
  training: TrainingMaterial,
): { text: string; replacements: number } {
  if (!text) return { text, replacements: 0 };

  const { roles, allowlist } = activePseudonymisation(training);
  if (roles.length === 0) return { text, replacements: 0 };

  const allow = new Set(allowlist.map(a => a.toLowerCase()));
  // Longest role first so "head of product" wins over "product".
  //
  // The role alternation carries its own case-insensitivity as character
  // classes rather than using the `i` flag. With `i` set, the [A-Z] in
  // NAME_TOKEN also matches lowercase, so "my CFO is late" read "is" as a
  // surname and silently ate the verb.
  const rolePattern = [...roles]
    .sort((a, b) => b.length - a.length)
    .map(caseInsensitiveLiteral)
    .join("|");

  let out = text;
  let replacements = 0;

  const notAllowed = (name: string) =>
    name.split(/\s+/).every(part => !allow.has(part.toLowerCase()));

  // 1. role then name: "my CFO Sarah Patel" -> "my CFO"
  out = out.replace(
    new RegExp(`\\b(${rolePattern})\\b(,?\\s+(?:${NAME_TOKEN})(?:\\s+${NAME_TOKEN})?)`, "g"),
    (match, role: string, trailing: string) => {
      const name = trailing.replace(/^,?\s+/, "");
      if (!notAllowed(name)) return match;
      replacements += 1;
      return role;
    },
  );

  // 2. name then role: "Sarah Patel, our CFO" -> "our CFO"
  out = out.replace(
    new RegExp(`\\b(${NAME_TOKEN}(?:\\s+${NAME_TOKEN})?),\\s+((?:my|our|the|their)\\s+(?:${rolePattern}))\\b`, "g"),
    (match, name: string, rolePhrase: string) => {
      if (!notAllowed(name)) return match;
      replacements += 1;
      return rolePhrase;
    },
  );

  // 3. name then parenthesised role: "Sarah Patel (CFO)" -> "the CFO"
  out = out.replace(
    new RegExp(`\\b(${NAME_TOKEN}(?:\\s+${NAME_TOKEN})?)\\s*\\((${rolePattern})\\)`, "g"),
    (match, name: string, role: string) => {
      if (!notAllowed(name)) return match;
      replacements += 1;
      return `the ${role}`;
    },
  );

  return { text: out.replace(/\s{2,}/g, " ").trim(), replacements };
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

  for (const incoming of facts) {
    // Pseudonymise before the reject pass so a fact that is genuinely about
    // the user survives with the third party reduced to a role, while a fact
    // whose subject is someone else still trips third_party_identity below.
    const valuePass = pseudonymiseThirdParties(incoming.fact_value, training);
    const contextPass = pseudonymiseThirdParties(incoming.fact_context || "", training);
    const fact: IncomingFact =
      valuePass.replacements + contextPass.replacements > 0
        ? { ...incoming, fact_value: valuePass.text, fact_context: contextPass.text }
        : incoming;

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
