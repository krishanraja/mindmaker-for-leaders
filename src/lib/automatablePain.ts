/**
 * Shared automatable-pain filter. Surfaces only pains that imply a bounded,
 * triggerable procedure - never vague strategic blockers ("Retention Challenge").
 * Logic mirrors useSkillSuggestions.candidateFromPain keyword matching.
 */
import type { SkillSeed } from "@/types/skill";

const AUTOMATABLE_KEYWORDS = [
  "investor update",
  "investor report",
  "board",
  "board pack",
  "board update",
  "proposal",
  "sow",
  "statement of work",
  "quote",
  "weekly update",
  "weekly report",
  "standup",
  "stand-up",
  "sync notes",
  "meeting notes",
  "recap",
  "summary",
  "follow-up",
  "follow up",
  "outreach",
  "linkedin",
  "email draft",
  "rfp",
  "triage",
  "pipeline update",
  "sales update",
  "hiring sync",
  "onboarding",
  "client update",
  "status report",
  "exec summary",
  "executive summary",
  "monthly update",
  "monday",
  "friday",
  "every week",
  "each week",
  "recurring",
  "template",
  "draft",
  "turn into",
  "write up",
  "write-up",
  "prep",
  "prepare",
  "distil",
  "distill",
  "condense",
  "slack",
  "transcript",
];

const VAGUE_BLOCKER_PATTERNS = [
  /\bchallenge\b/i,
  /\bretention\b/i,
  /\balignment\b/i,
  /\bculture\b/i,
  /\bstrategy\b/i,
  /\bvision\b/i,
  /\bmarket fit\b/i,
  /\bcompetition\b/i,
  /\bfundraising\b(?!\s+update)/i,
  /\bhiring\b(?!\s+(sync|update|report))/i,
];

/**
 * True when the pain text names a concrete recurring deliverable or workflow,
 * not a strategic-level blocker.
 */
export function isAutomatablePainText(text: string): boolean {
  const trimmed = (text || "").trim();
  if (trimmed.length < 8) return false;
  const lower = trimmed.toLowerCase();

  const hasKeyword = AUTOMATABLE_KEYWORDS.some((k) => lower.includes(k));
  if (hasKeyword) return true;

  // Decisions that mention a deliverable verb are automatable.
  const hasDeliverableVerb =
    /\b(draft|write|prep|prepare|send|turn|compile|pull together|summarize|summarise)\b/i.test(
      lower,
    );
  if (hasDeliverableVerb && trimmed.length >= 20) return true;

  // Pure strategic blockers without workflow signal.
  if (VAGUE_BLOCKER_PATTERNS.some((p) => p.test(lower)) && !hasDeliverableVerb) {
    return false;
  }

  return false;
}

export function filterAutomatableSeeds(seeds: SkillSeed[]): SkillSeed[] {
  return seeds.filter((s) => isAutomatablePainText(s.text));
}
