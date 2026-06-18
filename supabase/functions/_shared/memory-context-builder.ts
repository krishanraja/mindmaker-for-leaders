import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadGlobalTraining } from "./training-loader.ts";
import type { TrainingMaterial } from "./training-schema.ts";

export interface MemoryContextOptions {
  includeWarm?: boolean;
  topicFilter?: string;
  maxTokens?: number;
  format?: "markdown" | "chatgpt" | "claude" | "gemini" | "cursor" | "claude-code";
  useCase?: "general" | "meeting" | "decision" | "code" | "email" | "strategy" | "delegation" | "board" | "edge"
    | "writing_persona" | "strength_framework" | "delegation_playbook" | "strategic_advisor" | "decision_journal";
}

export interface MemoryContextResult {
  context: string;
  tokenCount: number;
  factCount: number;
  patternCount: number;
  decisionCount: number;
  lastUpdated: string;
  // Multi-artefact exports surface primary + secondary files (e.g. ChatGPT
  // Custom GPT produces "Instructions" + "Knowledge"). When present, clients
  // should prefer `artefacts` over `context` for downloads.
  artefacts?: ExportArtefact[];
  // Ids of the facts that actually shipped into the final context (post
  // token-budget trim). Callers fire-and-forget touch_memory_facts on these so
  // reference_count reflects genuine reliance, never trimmed-out facts.
  touchedFactIds?: string[];
}

export interface ExportArtefact {
  filename: string;
  mime: string;
  kind: string;
  content: string;
}

interface Fact {
  id: string;
  fact_category: string;
  fact_label: string;
  fact_value: string;
  fact_key?: string | null;
  fact_subtype?: string | null;
  temperature: string;
  verification_status: string;
  confidence_score: number;
  created_at: string;
}

interface Pattern {
  pattern_type: string;
  pattern_text: string;
  confidence: number;
  evidence_count: number;
  status: string;
}

interface Decision {
  decision_text: string;
  rationale: string | null;
  source: string;
  created_at: string;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function groupFactsByCategory(facts: Fact[]): Record<string, Fact[]> {
  const groups: Record<string, Fact[]> = {};
  for (const fact of facts) {
    const cat = fact.fact_category || "other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(fact);
  }
  return groups;
}

/** ctrl_voice_profile JSON stored as a preference fact with communication_style subtype. */
function findVoiceProfileFact(facts: Fact[]): Fact | undefined {
  return facts.find(
    (f) =>
      f.fact_key === "ctrl_voice_profile" ||
      (f.fact_category === "preference" &&
        f.fact_subtype === "communication_style" &&
        f.fact_value?.trim().startsWith("{")),
  );
}

function formatVoiceProfileSection(fact: Fact): string {
  try {
    const p = JSON.parse(fact.fact_value) as Record<string, unknown>;
    const lines: string[] = ["## Voice profile (self-identified)"];
    const dims: Array<[string, unknown]> = [
      ["Signoff", p.signoff],
      ["Disagreement style", p.disagreement],
      ["Content archetype", p.contentArchetype],
      ["Sentence length", p.sentenceLength],
      ["First person", p.firstPerson],
      ["Punctuation", p.punctuationStyle],
    ];
    for (const [label, val] of dims) {
      if (val) lines.push(`- ${label}: ${String(val)}`);
    }
    const rules = Array.isArray(p.hardRules) ? p.hardRules : [];
    if (rules.length) {
      lines.push("- Hard rules:");
      for (const r of rules) lines.push(`  - ${String(r)}`);
    }
    if (typeof p.sampleVoice === "string" && p.sampleVoice.trim()) {
      lines.push(`- Sample voice register:\n"""${p.sampleVoice.trim().slice(0, 600)}"""`);
    }
    return lines.join("\n");
  } catch {
    return `## Voice profile\n- ${fact.fact_value}`;
  }
}

function buildMarkdownContext(
  facts: Fact[],
  patterns: Pattern[],
  decisions: Decision[],
  userName: string | null,
): string {
  const sections: string[] = [];
  const grouped = groupFactsByCategory(facts);

  // Identity
  if (grouped.identity?.length) {
    sections.push(`## About ${userName || "Me"}\n${grouped.identity.map(f => `- ${f.fact_value}`).join("\n")}`);
  }

  // Business
  if (grouped.business?.length) {
    sections.push(`## Business Context\n${grouped.business.map(f => `- ${f.fact_value}`).join("\n")}`);
  }

  // Objectives
  if (grouped.objective?.length) {
    sections.push(`## Current Priorities\n${grouped.objective.map(f => `- ${f.fact_value}`).join("\n")}`);
  }

  // Decisions
  if (decisions.length) {
    const decisionLines = decisions.map(d => {
      const line = `- ${d.decision_text}`;
      return d.rationale ? `${line} (${d.rationale})` : line;
    });
    sections.push(`## Active Decisions\n${decisionLines.join("\n")}`);
  }

  // Patterns
  if (patterns.length) {
    const patternLines = patterns.map(p =>
      `- ${p.pattern_text} (${Math.round(p.confidence * 100)}% confidence, ${p.evidence_count} observations)`
    );
    sections.push(`## Known Patterns\n${patternLines.join("\n")}`);
  }

  // Blockers
  if (grouped.blocker?.length) {
    sections.push(`## Blockers & Constraints\n${grouped.blocker.map(f => `- ${f.fact_value}`).join("\n")}`);
  }

  // Preferences
  if (grouped.preference?.length) {
    sections.push(`## Preferences\n${grouped.preference.map(f => `- ${f.fact_value}`).join("\n")}`);
  }

  const voiceFact = findVoiceProfileFact(facts);
  if (voiceFact) {
    sections.push(formatVoiceProfileSection(voiceFact));
  }

  return sections.join("\n\n");
}

function getUseCasePreamble(useCase: string): { heading: string; instructions: string } | null {
  switch (useCase) {
    case "writing_persona":
      return {
        heading: "My Writing Voice & Communication Style",
        instructions:
          "Use this as my writing voice and communication style. Match my tone, vocabulary, and structure when drafting anything on my behalf. Do not default to generic business language.",
      };
    case "strength_framework":
      return {
        heading: "Framework I Use Instinctively",
        instructions:
          "This is a framework I use instinctively. Help me apply it consistently and suggest where it fits. Reference it when making recommendations.",
      };
    case "delegation_playbook":
      return {
        heading: "My Delegation Style & Team Context",
        instructions:
          "Use this to help me delegate effectively. Reference my team context, priorities, and working style when suggesting how to hand off work.",
      };
    case "strategic_advisor":
      return {
        heading: "Strategic Context for Advisory",
        instructions:
          "Act as a strategic advisor who deeply understands my business context. Reference my objectives, constraints, and patterns when giving advice.",
      };
    case "decision_journal":
      return {
        heading: "Decision Context & Patterns",
        instructions:
          "Use this to help me make better decisions. Reference my past decisions, known patterns, and blind spots. Challenge me when I repeat past mistakes.",
      };
    default:
      return null;
  }
}

// ─── Per-target model-native formatters ─────────────────────────────────────
// Each target receives a tailored artefact (or set of artefacts) reflecting
// how that specific tool consumes configuration. The voice card for each
// target comes from the training material so voice tuning is a YAML edit.

const FORMAT_TO_VOICE_KEY: Record<string, string> = {
  chatgpt: "chatgpt_custom_gpt",
  claude: "claude_project",
  "claude-code": "claude_code",
  cursor: "cursor",
  gemini: "gemini_system_instruction",
  markdown: "markdown",
};

interface BuiltSections {
  identity: string[];
  business: string[];
  objectives: string[];
  blockers: string[];
  preferences: string[];
  decisions: string[];
  patterns: string[];
  userName: string | null;
}

function buildSections(
  facts: Fact[],
  patterns: Pattern[],
  decisions: Decision[],
  userName: string | null,
): BuiltSections {
  const grouped = groupFactsByCategory(facts);
  return {
    identity: (grouped.identity || []).map(f => f.fact_value),
    business: (grouped.business || []).map(f => f.fact_value),
    objectives: (grouped.objective || []).map(f => f.fact_value),
    blockers: (grouped.blocker || []).map(f => f.fact_value),
    preferences: (grouped.preference || []).map(f => f.fact_value),
    decisions: decisions.map(d => d.rationale ? `${d.decision_text} (${d.rationale})` : d.decision_text),
    patterns: patterns.map(p => `${p.pattern_text} (${Math.round(p.confidence * 100)}% confidence)`),
    userName,
  };
}

function xmlBlock(tag: string, items: string[]): string {
  if (!items.length) return "";
  return `  <${tag}>\n${items.map(i => `    <item>${escapeXml(i)}</item>`).join("\n")}\n  </${tag}>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
}

// Format: ChatGPT Custom GPT - returns Instructions + Knowledge as two files.
function formatChatGPTCustomGPT(s: BuiltSections, useCase: string): ExportArtefact[] {
  const preamble = getUseCasePreamble(useCase);
  const name = s.userName || "the user";

  const instructions = [
    `You are a personalized assistant for ${name}.`,
    preamble?.instructions || "Be direct and specific. Reference the knowledge block when relevant. Challenge blind spots. Prioritize action over theory.",
    "",
    "Posture:",
    "- Do not explain the user's own context back to them.",
    "- Cite the relevant fact when you use it.",
    "- Default to the user's stated preferences for communication style.",
  ].join("\n");

  const knowledgeLines: string[] = [];
  if (s.identity.length) knowledgeLines.push(`## Identity\n${s.identity.map(x => `- ${x}`).join("\n")}`);
  if (s.business.length) knowledgeLines.push(`## Business context\n${s.business.map(x => `- ${x}`).join("\n")}`);
  if (s.objectives.length) knowledgeLines.push(`## Active objectives\n${s.objectives.map(x => `- ${x}`).join("\n")}`);
  if (s.blockers.length) knowledgeLines.push(`## Blockers\n${s.blockers.map(x => `- ${x}`).join("\n")}`);
  if (s.preferences.length) knowledgeLines.push(`## Communication preferences\n${s.preferences.map(x => `- ${x}`).join("\n")}`);
  if (s.decisions.length) knowledgeLines.push(`## Active decisions\n${s.decisions.map(x => `- ${x}`).join("\n")}`);
  if (s.patterns.length) knowledgeLines.push(`## Observed patterns\n${s.patterns.map(x => `- ${x}`).join("\n")}`);

  return [
    { filename: "chatgpt-instructions.md", mime: "text/markdown", kind: "instructions", content: instructions },
    { filename: "chatgpt-knowledge.md", mime: "text/markdown", kind: "knowledge", content: knowledgeLines.join("\n\n") },
  ];
}

// Format: Claude Project - XML-structured project instructions.
function formatClaudeProject(s: BuiltSections, useCase: string): ExportArtefact[] {
  const preamble = getUseCasePreamble(useCase);
  const name = s.userName || "the user";

  const profile = [
    `<user_profile>`,
    `  <name>${escapeXml(name)}</name>`,
    xmlBlock("identity", s.identity),
    xmlBlock("business", s.business),
    xmlBlock("objectives", s.objectives),
    xmlBlock("blockers", s.blockers),
    xmlBlock("communication_preferences", s.preferences),
    xmlBlock("active_decisions", s.decisions),
    xmlBlock("observed_patterns", s.patterns),
    `</user_profile>`,
  ].filter(Boolean).join("\n");

  const guidelines = [
    `<response_guidelines>`,
    `  ${preamble?.instructions || "Use the profile above to personalize every response. Cite the specific fact when you draw on it. Never restate the profile back to the user."}`,
    `</response_guidelines>`,
  ].join("\n");

  return [
    {
      filename: "claude-project-instructions.md",
      mime: "text/markdown",
      kind: "project_instructions",
      content: `${profile}\n\n${guidelines}`,
    },
  ];
}

// Format: Claude Code - a proper CLAUDE.md file focused on conventions.
function formatClaudeCode(s: BuiltSections, useCase: string): ExportArtefact[] {
  void useCase;
  const conventions = s.preferences.filter(p =>
    /\b(use|prefer|code|test|lint|framework|react|typescript|python|eslint|prettier)\b/i.test(p)
  );
  const businessHints = s.business.slice(0, 3);

  const content = [
    `# CLAUDE.md`,
    ``,
    `## Project`,
    businessHints.length ? businessHints.map(b => `- ${b}`).join("\n") : "- (no business context captured)",
    ``,
    `## Always do`,
    `- Follow existing patterns in the codebase before inventing new ones.`,
    `- Keep commits small and focused; one logical change per commit.`,
    `- Run \`npm run build\` to verify changes compile.`,
    conventions.length ? conventions.map(c => `- ${c}`).join("\n") : ``,
    ``,
    `## Never do`,
    `- Use em dashes (\u2014) or en dashes (\u2013). Use commas, semicolons, or periods.`,
    `- Add dependencies without justification.`,
    `- Skip tests on files you modify.`,
    ``,
    `## Voice`,
    `- Direct, terse, convention-first. No marketing language.`,
  ].filter(Boolean).join("\n");

  return [{ filename: "CLAUDE.md", mime: "text/markdown", kind: "agent_instructions", content }];
}

// Format: Cursor - a real .cursorrules file. Plain text, imperative one-liners.
function formatCursor(s: BuiltSections, useCase: string): ExportArtefact[] {
  void useCase;
  const lines: string[] = [
    `# Stack`,
    `- Follow the project's existing stack and build tools; do not introduce new frameworks.`,
    ``,
    `# Style`,
    `- Match existing file naming, import order, and formatting.`,
    `- Prefer composition over inheritance.`,
    `- Do not use em dashes or en dashes in any user-visible copy.`,
    ``,
    `# Testing`,
    `- Add or update a test when you change runtime behaviour.`,
    `- Run the repo's test command before claiming completion.`,
    ``,
    `# Review discipline`,
    `- Keep diffs minimal; no unrelated refactors.`,
    `- Call out any assumption you are making in a code comment.`,
  ];
  const codeStylePrefs = s.preferences.filter(p =>
    /\b(code|style|format|test|review|pr|commit|comment)\b/i.test(p)
  );
  if (codeStylePrefs.length) {
    lines.push(``, `# User-specific`);
    for (const p of codeStylePrefs) lines.push(`- ${p}`);
  }
  return [{ filename: ".cursorrules", mime: "text/plain", kind: "agent_instructions", content: lines.join("\n") }];
}

// Format: Gemini - system instruction (plain prose) + long-form context.
function formatGemini(s: BuiltSections, useCase: string): ExportArtefact[] {
  const preamble = getUseCasePreamble(useCase);
  const name = s.userName || "the user";

  const sys: string[] = [`You are a personalized assistant for ${name}.`];
  if (s.identity.length) sys.push(`Role: ${s.identity[0]}.`);
  if (s.objectives.length) sys.push(`Current objectives: ${s.objectives.slice(0, 3).join("; ")}.`);
  if (s.preferences.length) sys.push(`Preferences: ${s.preferences.slice(0, 3).join("; ")}.`);
  sys.push(preamble?.instructions || "Personalize every response using this context. Do not restate the context back.");

  const context = [
    s.business.length ? `Business context: ${s.business.join("; ")}.` : "",
    s.blockers.length ? `Blockers: ${s.blockers.join("; ")}.` : "",
    s.decisions.length ? `Active decisions: ${s.decisions.join("; ")}.` : "",
    s.patterns.length ? `Observed patterns: ${s.patterns.join("; ")}.` : "",
  ].filter(Boolean).join("\n\n");

  const artefacts: ExportArtefact[] = [
    { filename: "gemini-system-instruction.txt", mime: "text/plain", kind: "system_instruction", content: sys.join(" ") },
  ];
  if (context) {
    artefacts.push({ filename: "gemini-context.md", mime: "text/markdown", kind: "long_context", content: context });
  }
  return artefacts;
}

// Format: universal markdown (default).
function formatUniversalMarkdown(s: BuiltSections, useCase: string, markdown: string): ExportArtefact[] {
  const preamble = getUseCasePreamble(useCase);
  const content = preamble
    ? `# ${preamble.heading}\n\n${markdown}\n\n---\n${preamble.instructions}`
    : markdown;
  return [{ filename: "my-ai-context.md", mime: "text/markdown", kind: "universal", content }];
}

function buildArtefactsForFormat(
  format: string,
  sections: BuiltSections,
  useCase: string,
  markdown: string,
): ExportArtefact[] {
  switch (format) {
    case "chatgpt":     return formatChatGPTCustomGPT(sections, useCase);
    case "claude":      return formatClaudeProject(sections, useCase);
    case "claude-code": return formatClaudeCode(sections, useCase);
    case "cursor":      return formatCursor(sections, useCase);
    case "gemini":      return formatGemini(sections, useCase);
    default:            return formatUniversalMarkdown(sections, useCase, markdown);
  }
}

/**
 * Backwards-compatible applyFormat - returns only the primary artefact as a
 * single string. Callers that want the full artefact set should use
 * buildMemoryExport instead.
 */
function applyFormat(markdown: string, format: string, useCase: string = "general", sections?: BuiltSections): string {
  if (!sections) {
    // Fall-back: callers that do not supply parsed sections get the legacy
    // markdown wrapped in a minimal universal block.
    return markdown;
  }
  const artefacts = buildArtefactsForFormat(format, sections, useCase, markdown);
  return artefacts[0]?.content || markdown;
}

function filterByUseCase(
  facts: Fact[],
  patterns: Pattern[],
  decisions: Decision[],
  useCase: string,
): { facts: Fact[]; patterns: Pattern[]; decisions: Decision[] } {
  switch (useCase) {
    case "meeting":
      return {
        facts: facts.filter(f => ["identity", "business", "objective", "blocker"].includes(f.fact_category)),
        patterns: patterns.filter(p => ["behavior", "preference"].includes(p.pattern_type)),
        decisions,
      };
    case "decision":
      return {
        facts: facts.filter(f => ["objective", "blocker", "preference"].includes(f.fact_category)),
        patterns,
        decisions,
      };
    case "code":
      return {
        facts: facts.filter(f => ["preference", "business"].includes(f.fact_category)),
        patterns: patterns.filter(p => p.pattern_type === "preference"),
        decisions: [],
      };
    case "email":
      return {
        facts: facts.filter(f => ["identity", "preference"].includes(f.fact_category)),
        patterns: patterns.filter(p => ["preference", "behavior"].includes(p.pattern_type)),
        decisions: [],
      };
    case "strategy":
      return {
        facts: facts.filter(f => ["objective", "blocker", "business"].includes(f.fact_category)),
        patterns,
        decisions,
      };
    case "delegation":
      return {
        facts: facts.filter(f => ["identity", "objective", "business"].includes(f.fact_category)),
        patterns: patterns.filter(p => p.pattern_type === "behavior"),
        decisions,
      };
    case "board":
      return {
        facts: facts.filter(f => ["business", "objective", "blocker"].includes(f.fact_category)),
        patterns: patterns.filter(p => ["strength", "blindspot"].includes(p.pattern_type)),
        decisions,
      };
    case "writing_persona":
      return {
        facts: facts.filter(f => ["identity", "preference"].includes(f.fact_category)),
        patterns: patterns.filter(p => ["preference", "behavior"].includes(p.pattern_type)),
        decisions: [],
      };
    case "strength_framework":
      return {
        facts,
        patterns: patterns.filter(p => ["strength", "behavior"].includes(p.pattern_type)),
        decisions,
      };
    case "delegation_playbook":
      return {
        facts: facts.filter(f => ["identity", "business", "objective"].includes(f.fact_category)),
        patterns: patterns.filter(p => p.pattern_type === "behavior"),
        decisions,
      };
    case "strategic_advisor":
      return {
        facts: facts.filter(f => ["objective", "blocker", "business"].includes(f.fact_category)),
        patterns,
        decisions,
      };
    case "decision_journal":
      return {
        facts: facts.filter(f => ["objective", "blocker"].includes(f.fact_category)),
        patterns,
        decisions,
      };
    case "edge":
      // All data for comprehensive strength/weakness synthesis
      return { facts, patterns, decisions };
    default: // general
      return { facts, patterns, decisions };
  }
}

export async function buildMemoryContext(
  supabase: SupabaseClient,
  userId: string,
  options: MemoryContextOptions = {},
): Promise<MemoryContextResult> {
  const {
    includeWarm = true,
    maxTokens = 4000,
    format = "markdown",
    useCase = "general",
  } = options;

  // Fetch hot facts (always)
  const { data: hotFacts } = await supabase
    .from("user_memory")
    .select("id, fact_category, fact_label, fact_value, fact_key, fact_subtype, temperature, verification_status, confidence_score, created_at")
    .eq("user_id", userId)
    .eq("is_current", true)
    .is("archived_at", null)
    .eq("temperature", "hot")
    .order("importance", { ascending: false, nullsFirst: false })
    .order("last_referenced_at", { ascending: false });

  // Fetch warm facts (if requested)
  let warmFacts: Fact[] = [];
  if (includeWarm) {
    const { data } = await supabase
      .from("user_memory")
      .select("id, fact_category, fact_label, fact_value, fact_key, fact_subtype, temperature, verification_status, confidence_score, created_at")
      .eq("user_id", userId)
      .eq("is_current", true)
      .is("archived_at", null)
      .eq("temperature", "warm")
      .order("importance", { ascending: false, nullsFirst: false })
    .order("last_referenced_at", { ascending: false });
    warmFacts = (data || []) as Fact[];
  }

  const allFacts = [...(hotFacts || []) as Fact[], ...warmFacts];

  // Fetch patterns
  const { data: patternData } = await supabase
    .from("user_patterns")
    .select("pattern_type, pattern_text, confidence, evidence_count, status")
    .eq("user_id", userId)
    .in("status", ["emerging", "confirmed"])
    .order("confidence", { ascending: false });

  const patterns = (patternData || []) as Pattern[];

  // Fetch active decisions
  const { data: decisionData } = await supabase
    .from("user_decisions")
    .select("decision_text, rationale, source, created_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const decisions = (decisionData || []) as Decision[];

  // Get user name from identity facts
  const nameFact = allFacts.find(f => f.fact_category === "identity" && f.fact_label?.toLowerCase().includes("name"));
  const userName = nameFact?.fact_value || null;

  // Apply use case filter
  const filtered = filterByUseCase(allFacts, patterns, decisions, useCase);

  // Track which filtered fact set actually produced the shipped context. The
  // touch signal must reflect only facts that genuinely made it into the
  // artefact; touching trimmed-out warm facts would overstate reliance.
  let finalFacts = filtered.facts;

  // Build markdown (universal base)
  let markdown = buildMarkdownContext(filtered.facts, filtered.patterns, filtered.decisions, userName);
  let sections = buildSections(filtered.facts, filtered.patterns, filtered.decisions, userName);

  // Enforce token budget - trim warm facts first
  let tokenCount = estimateTokens(markdown);
  if (tokenCount > maxTokens && warmFacts.length > 0) {
    const reducedWarm = warmFacts.slice(0, Math.floor(warmFacts.length / 2));
    const reducedFacts = [...(hotFacts || []) as Fact[], ...reducedWarm];
    const reducedFiltered = filterByUseCase(reducedFacts, filtered.patterns, filtered.decisions, useCase);
    markdown = buildMarkdownContext(reducedFiltered.facts, reducedFiltered.patterns, reducedFiltered.decisions, userName);
    sections = buildSections(reducedFiltered.facts, reducedFiltered.patterns, reducedFiltered.decisions, userName);
    tokenCount = estimateTokens(markdown);
    finalFacts = reducedFiltered.facts; // trim path shipped instead of the full set
  }

  // Build every artefact for this target (may be 1 or 2 files).
  const artefacts = buildArtefactsForFormat(format, sections, useCase, markdown);

  // Primary "context" string for backwards-compatible callers: the first
  // artefact's content.
  const context = artefacts[0]?.content || markdown;
  const finalTokenCount = estimateTokens(context);

  // Optional: read training material so callers know which version produced
  // the export. Non-blocking.
  let trainingVersion = 0;
  try {
    const training = await loadGlobalTraining(supabase);
    trainingVersion = training.version;
  } catch {
    // ignore
  }
  void trainingVersion;

  return {
    context,
    tokenCount: finalTokenCount,
    factCount: filtered.facts.length,
    patternCount: filtered.patterns.length,
    decisionCount: filtered.decisions.length,
    lastUpdated: new Date().toISOString(),
    artefacts,
    touchedFactIds: finalFacts.map((f) => f.id).filter(Boolean),
  };
}

// Silence unused-import warnings; TrainingMaterial is re-exported indirectly
// through the loader and kept here for future per-target voice-card wiring.
export type { TrainingMaterial };
// Kept for downstream use; wiring voice-card tone into formatter prose is a
// follow-up tuning knob. Consumers should read export_voice_cards[format]
// from the training material when they want the canonical tone label.
export { FORMAT_TO_VOICE_KEY };
