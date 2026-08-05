/**
 * Quality gate for generated Agent Skills.
 *
 * Translates Section 7 of the project plan (Description / Body / Package
 * checks) into deterministic post-processing on the LLM output. Each check
 * has a stable id + label + pass flag + optional detail string. Failures are
 * recorded but do not block delivery; the UI surfaces them so the user
 * (or operator) can decide whether to regenerate.
 *
 * Why deterministic: the LLM occasionally drifts on description length,
 * imperative voice, or section presence. Catching it here is cheaper than
 * round-tripping a regenerate and gives us a stable training signal.
 */

import {
  runProvenanceChecks,
  type ProvenanceOptions,
} from "../_shared/provenance-checks.ts";

export interface SkillData {
  name: string;
  description: string;
  body: string;
  references?: Array<{ filename: string; content: string }>;
  test_prompts?: string[];
  archetype?: string;
  /**
   * Set when the request carried a non-empty VOICE_PROFILE. The voice-lock
   * advisory check uses this to decide whether the "## Voice and tone" body
   * section is required.
   */
  voice_profile_present?: boolean;
  /**
   * Harness-chain rows this user already holds. Absent sets make the matching
   * prov.* check report an honest skip rather than a fake pass; the quotes are
   * masked out of the body before any check reads it (CH-16).
   */
  provenance?: ProvenanceOptions;
}

export interface QualityCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface QualityGateResult {
  checks: QualityCheck[];
  summary: { passed: number; total: number };
}

const NAME_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const PUSH_LANGUAGE_REGEX = /\b(use whenever|do not [a-z]+ without|if in doubt, use|consult this skill first)\b/i;
const TRIGGER_LIST_REGEX = /\b(use whenever|triggers on)\b/i;
const FIRST_PERSON_REGEX = /\b(i can|i will|i help|i'll|i am)\b/i;
const SECOND_PERSON_DESC_REGEX = /\b(you can use|you should use|use this to help you|helps you to)\b/i;
const HEDGING_REGEX = /\b(you should|you might|you could|consider using|it might be helpful|it would be helpful|maybe you|perhaps you)\b/i;
const BACKSLASH_PATH_REGEX = /[a-z0-9_-]+\\[a-z0-9_-]+/i;

export function runQualityGate(skill: SkillData): QualityGateResult {
  const checks: QualityCheck[] = [];

  // -------- Description checks ----------------------------------------
  const description = skill.description ?? "";
  const triggerCount = countTriggers(description);

  checks.push({
    id: "description.length",
    label: "Description under 1024 characters",
    passed: description.length > 0 && description.length < 1024,
    detail: `${description.length}/1024`,
  });

  checks.push({
    id: "description.purpose",
    label: "Clear purpose statement",
    passed: hasFirstSentenceUnder(description, 100),
    detail: "First sentence describes what the skill does in one line",
  });

  checks.push({
    id: "description.triggers",
    label: "5+ trigger phrases",
    passed: triggerCount >= 5,
    detail: `Found ${triggerCount} trigger phrases`,
  });

  checks.push({
    id: "description.push",
    label: "Push language present",
    passed: PUSH_LANGUAGE_REGEX.test(description),
    detail: "Looks for \"use whenever\", \"do not X without\", or \"if in doubt\"",
  });

  checks.push({
    id: "description.voice",
    label: "Third-person voice",
    passed: !FIRST_PERSON_REGEX.test(description) && !SECOND_PERSON_DESC_REGEX.test(description),
    detail: "Avoids first-person and direct second-person framing",
  });

  // -------- Body checks -----------------------------------------------
  const body = skill.body ?? "";
  const lineCount = body.split("\n").length;

  checks.push({
    id: "body.length",
    label: "Body under 500 lines",
    passed: lineCount > 0 && lineCount < 500,
    detail: `${lineCount}/500 lines`,
  });

  const firstHedgeMatch = body.match(HEDGING_REGEX);
  checks.push({
    id: "body.imperative",
    label: "Imperative voice",
    passed: !firstHedgeMatch,
    detail: firstHedgeMatch ? `Found hedging: "${firstHedgeMatch[0]}"` : "No hedging detected",
  });

  checks.push({
    id: "body.gotchas",
    label: "Gotchas section present",
    passed: /^##\s+Gotchas/im.test(body),
  });

  checks.push({
    id: "body.outputFormat",
    label: "Output format section present",
    passed: /^##\s+Output format/im.test(body),
  });

  checks.push({
    id: "body.references",
    label: "References section present",
    passed: /^##\s+References/im.test(body),
  });

  checks.push({
    id: "body.notRestating",
    label: "Body does not restate description",
    passed: !bodyRestatesDescription(body, description),
    detail: "Body opening must use different language than the description",
  });

  const bareRule = findBareMustNever(body);
  checks.push({
    id: "body.bareRules",
    label: "MUST/NEVER rules include reasoning",
    passed: !bareRule,
    detail: bareRule ? `Bare rule near: "${bareRule}"` : "All hard rules include reasoning",
  });

  // Advisory: skills that document their own runs improve with use. Kit
  // skills force this via the seed; the gate verifies it survived generation.
  // Anchored to a real heading like the other section checks - a passing
  // mention of "learning loop" in prose is not a section.
  checks.push({
    id: "body.learningLoop",
    label: "Learning loop section present",
    passed: /^##\s+Learning loop/im.test(body),
    detail: "A ## Learning loop section makes the skill log its runs and sharpen with use",
  });

  // Advisory voice-lock check: when the request carried voice profile rows OR
  // the archetype classified as voice-lock, the body must surface a
  // "## Voice and tone" section. Non-blocking - the export still ships - but
  // the UI can prompt the user to regenerate when it fires.
  const voiceLockExpected =
    skill.voice_profile_present === true ||
    (skill.archetype ?? "").toLowerCase() === "voice-lock";
  const voiceSectionPresent = /^##\s+Voice and tone/im.test(body);
  checks.push({
    id: "body.voiceLockSurfaced",
    label: "Voice and tone section present when expected",
    passed: voiceLockExpected ? voiceSectionPresent : true,
    detail: voiceLockExpected
      ? voiceSectionPresent
        ? "Voice section is present"
        : "Voice profile provided but body has no ## Voice and tone section"
      : "Not required (no voice profile, archetype is not voice-lock)",
  });

  // -------- Package checks --------------------------------------------
  const name = skill.name ?? "";
  checks.push({
    id: "package.nameFormat",
    label: "Name is valid (lowercase + hyphens, max 64)",
    passed: NAME_REGEX.test(name) && name.length > 0 && name.length <= 64,
    detail: `"${name}" (${name.length}/64)`,
  });

  const allContent = [body, ...(skill.references ?? []).map((r) => r.content)].join("\n");
  checks.push({
    id: "package.noBackslash",
    label: "No backslash file paths",
    passed: !BACKSLASH_PATH_REGEX.test(allContent),
    detail: "File paths use forward slashes only",
  });

  const tp = skill.test_prompts ?? [];
  checks.push({
    id: "package.testPrompts",
    label: "Three test prompts included",
    passed: tp.length === 3 && tp.every((t) => t.trim().length > 10),
    detail: `${tp.length} test prompts`,
  });

  // -------- Provenance checks (Phase 1, all advisory) ------------------
  // Where did each rule come from. Nothing here blocks: Phase 1 only measures
  // the baseline, and prov.everyRuleCited's detail carries the number.
  checks.push(...runProvenanceChecks(body, skill.provenance ?? {}));

  // -------- Summary ---------------------------------------------------
  const passedCount = checks.filter((c) => c.passed).length;
  return {
    checks,
    summary: { passed: passedCount, total: checks.length },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countTriggers(description: string): number {
  if (!TRIGGER_LIST_REGEX.test(description)) return 0;
  // Count phrases inside the trigger list. Strategy: take the substring after
  // the first "Use whenever" or "Triggers on", up to the next sentence break,
  // and split by commas / "or".
  const start = description.search(TRIGGER_LIST_REGEX);
  if (start === -1) return 0;
  const tail = description.slice(start);
  // End at first period that closes the trigger sentence (heuristic: period
  // followed by space + capital letter, or end of string).
  const sentenceEnd = tail.search(/\.\s+[A-Z]|\.$/);
  const span = sentenceEnd === -1 ? tail : tail.slice(0, sentenceEnd);
  // Strip the lead-in.
  const stripped = span.replace(TRIGGER_LIST_REGEX, "").replace(/^[:\s]+/, "");
  // Split on commas + "or".
  const parts = stripped
    .split(/,|\bor\b/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 3);
  return parts.length;
}

function hasFirstSentenceUnder(description: string, max: number): boolean {
  const match = description.match(/^[^.!?]+[.!?]/);
  if (!match) return false;
  return match[0].length <= max;
}

function bodyRestatesDescription(body: string, description: string): boolean {
  if (!description) return false;
  // Compare the first 300 chars of body (after stripping leading heading)
  // to the first 300 chars of description. If 80%+ of words overlap, flag.
  const bodyOpening = body.replace(/^#[^\n]*\n+/, "").slice(0, 300).toLowerCase();
  const descOpening = description.slice(0, 300).toLowerCase();
  if (!bodyOpening || !descOpening) return false;
  const bodyWords = new Set(tokenize(bodyOpening));
  const descWords = tokenize(descOpening);
  if (descWords.length < 8) return false;
  const overlap = descWords.filter((w) => bodyWords.has(w)).length;
  return overlap / descWords.length > 0.8;
}

function tokenize(s: string): string[] {
  return s
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4);
}

function findBareMustNever(body: string): string | null {
  // Find each MUST or NEVER and inspect the surrounding sentence + the next
  // sentence for a reasoning marker. If neither contains "because", "since",
  // "this is because", "the reason", or "otherwise", flag as bare.
  const reasoningMarkers = /\b(because|since|the reason|otherwise|so that|this is because)\b/i;
  // Case-insensitive: the Automator's composed transcripts produce lowercase
  // "must not" / "never" rules, and a bare rule is bare regardless of casing.
  const regex = /[^.\n]*\b(MUST(?: NOT)?|NEVER|ALWAYS)\b[^.\n]*\.[^.\n]*\.?/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    const span = match[0];
    if (!reasoningMarkers.test(span)) {
      return span.trim().slice(0, 80);
    }
  }
  return null;
}
