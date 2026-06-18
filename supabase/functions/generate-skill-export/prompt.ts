/**
 * Skill Builder LLM extraction prompt.
 *
 * Encodes the Four Honest Tests triage gate, the description-first generation
 * rules from Krish's Skill-Building Best Practices PDF, and the agentskills.io
 * specification constraints. The model is forced into JSON mode by the caller;
 * this prompt only describes the JSON shape and the rules that produce it.
 *
 * Failure modes the prompt actively defends against:
 *   1. Generating a "skill" for a Memory Web fact or Custom Instruction.
 *      Triage gate routes those out before generation runs.
 *   2. Inventing rules the leader never said. The transcript is the only
 *      source of truth; memory context provides background the leader has
 *      already confirmed elsewhere.
 *   3. Routing a bounded voice-lock workflow (e.g. "draft LinkedIn posts in my
 *      voice") to saved_style. VOICE-LOCK is the fourth passing test; when it
 *      fires alongside REPEATABLE the result is still a skill with archetype
 *      voice-lock.
 */

export interface SkillSeedContext {
  kind: "blocker" | "decision" | "mission" | "briefing_segment" | "example";
  text: string;
}

export interface SkillPromptInputs {
  transcript: string;
  memoryContext: string;
  profileContext: string;
  /**
   * Markdown block emitted by buildMemoryContext when the leader has any
   * `voice_profile.*` rows. When present, the body MUST contain a
   * `## Voice and tone` section and the references array MUST include a
   * `voice-profile.md` file. When absent, neither is required.
   */
  voiceProfile?: string;
  seed?: SkillSeedContext;
}

export function buildSkillSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function buildSkillUserPrompt({
  transcript,
  memoryContext,
  profileContext,
  voiceProfile,
  seed,
}: SkillPromptInputs): string {
  const lines: string[] = [];

  if (seed && seed.text.trim().length > 0) {
    // The leader tapped a specific pain to seed this skill. Anchoring the
    // extraction in their declared pain raises trigger quality because the
    // description ends up using their actual language. Without this, the LLM
    // sometimes hallucinates a more abstract trigger from the transcript.
    lines.push(
      `SEED_PAIN (the leader explicitly chose this ${describeKind(seed.kind)} as the trigger for this skill - anchor the skill in solving it):`,
      `"""${seed.text.trim()}"""`,
      ``,
    );
  }

  lines.push(
    `TRANSCRIPT (the leader's voice description of their workflow):`,
    `"""${transcript.trim()}"""`,
    ``,
    `MEMORY_CONTEXT:`,
    memoryContext.trim() || "(no memory context available)",
    ``,
    `EDGE_PROFILE:`,
    profileContext.trim() || "(no edge profile available)",
    ``,
  );

  const trimmedVoice = voiceProfile?.trim();
  if (trimmedVoice) {
    lines.push(
      `VOICE_PROFILE (verbatim style anchors the leader has set; treat as ground truth that overrides generic AI defaults):`,
      trimmedVoice,
      ``,
      `IMPORTANT: Because VOICE_PROFILE is non-empty, the body MUST include a "## Voice and tone" section that encodes these rules in imperative language with reasoning, the references array MUST include a "voice-profile.md" file, and the "## Gotchas" section MUST include at least one voice-regression gotcha (drift toward business-formal, em-dash absence, generic AI sign-off, etc.).`,
      ``,
    );
  } else {
    lines.push(
      `VOICE_PROFILE: (no voice profile rows on this account - body may omit ## Voice and tone unless the transcript itself supplies style rules)`,
      ``,
    );
  }

  if (seed) {
    lines.push(
      `IMPORTANT: Because SEED_PAIN was provided, the resulting skill description MUST use the leader's actual SEED_PAIN language as trigger phrases. The "## When this skill activates" section MUST reference the SEED_PAIN directly. Do not produce a generic skill when a SEED_PAIN is supplied.`,
      ``,
    );
  }

  lines.push(
    `Apply the Four Honest Tests, then generate the skill (or route to a different output type). Return ONLY the JSON object described in the system prompt.`,
  );

  return lines.join("\n");
}

function describeKind(kind: SkillSeedContext["kind"]): string {
  switch (kind) {
    case "blocker": return "blocker / challenge from their profile";
    case "decision": return "active decision on their desk";
    case "mission": return "active mission / priority";
    case "briefing_segment": return "briefing segment they flagged as a decision trigger";
    case "example": return "starter example they picked";
    default: return "pain point";
  }
}

const SYSTEM_PROMPT = `You are an expert Agent Skill architect. Your job is to take a leader's voice transcript about a repetitive workflow and convert it into a production-ready Agent Skill that follows the agentskills.io open standard.

You will receive:
1. TRANSCRIPT: The leader's raw voice description of their workflow
2. MEMORY_CONTEXT: Structured facts about the leader (company, role, goals, constraints)
3. EDGE_PROFILE: The leader's strengths and weaknesses
4. VOICE_PROFILE: Style anchors the leader has explicitly set (sign-off, sentence length, hard rules, sample voice). May be empty.

## PHASE 1: TRIAGE - The Four Honest Tests

Before generating anything, apply all four tests.

1. REPEATABLE: Is this work done at least weekly? Look for: "every Monday", "whenever I", "each time", "always have to", frequency markers, recurring triggers.
2. SPECIALISED: Would generic Claude get this materially wrong without guidance? Look for: unusual formatting rules, domain-specific constraints, tool-specific workflows, preferences that contradict AI defaults.
3. BOUNDED: Can you describe when to use it in one or two sentences? If the transcript describes multiple unrelated tasks, pick the strongest single skill from it.
4. VOICE-LOCK: Does the output need to be in the leader's specific voice rather than generic AI prose? Look for: tone descriptions, hard never-say rules, sign-offs, sentence-length preferences, "sounds like me / sounds like us", a non-empty VOICE_PROFILE that maps to this workflow. Bounded creative output (LinkedIn posts in my voice, client emails in my tone, product blurbs in our brand voice) is the canonical case.

Routing rules:
- If REPEATABLE + BOUNDED both pass AND (SPECIALISED OR VOICE-LOCK) passes -> PASS. Generate the skill.
- If REPEATABLE passes but BOUNDED fails (multiple unrelated tasks) -> pick the strongest single skill and treat the others as out of scope.
- If REPEATABLE fails (one-off task) -> triage out.
- If only universal style preferences are described with no bounded trigger -> triage out.

When triage fails, return:
{
  "triage": {
    "passed": false,
    "result": "custom_instruction" | "memory_fact" | "saved_style",
    "reasoning": "why it failed and what it should be instead"
  }
}

Choose the result type carefully:
- "custom_instruction": universal preferences (tone, register, interaction style) that apply across ALL tasks with no bounded trigger ("make everything I write sound like me"). NOT for bounded voice workflows - those are VOICE-LOCK skills.
- "memory_fact": context about the leader's company, team, or situation that does not describe a procedure.
- "saved_style": universal tone/register adjustments with no bounded trigger ("I always sound too formal - fix that everywhere"). NOT for bounded voice workflows.

Anti-pattern to avoid: "I want my LinkedIn posts to sound like me" looks like a style preference at first glance. It is NOT - it is a VOICE-LOCK skill with the bounded trigger "LinkedIn posts". Route it as a skill, not as saved_style.

If the tests pass (skill route), continue to Phase 2.

## PHASE 2: EXTRACT AND GENERATE

### 2A: Name
- Generate a lowercase-hyphenated name, max 64 characters
- Use gerund form when natural (e.g. "writing-board-updates", "preparing-monday-standups")
- Must start with a letter, contain only a-z, 0-9, and single hyphens
- Must NOT start or end with a hyphen, must NOT contain consecutive hyphens
- Must be descriptive, not vague (never "helper", "utils", "tools", "assistant")

### 2B: Description (THIS IS 80% OF THE SKILL)
The description determines whether Claude triggers the skill. Rules:

1. First sentence: third-person statement of what the skill does, ending with a period. Under 100 characters. Predictive of what the output looks like.
2. List 5+ trigger phrases using the leader's ACTUAL language from the transcript. Include casual phrasings, partial requests, adjacent topics.
   "Use whenever [phrase 1], [phrase 2], [phrase 3], [phrase 4], or [phrase 5]."
3. Include push language: "Do not [produce X] without consulting this skill first." or "If in doubt, use this skill."
4. Write in THIRD PERSON ("Generates board updates" not "I generate board updates" or "You can use this to...")
5. Stay strictly under 1024 characters total.

### 2C: Body (SKILL.md markdown content, NOT including YAML frontmatter)
Rules from the Skill-Building Best Practices:

1. IMPERATIVE VOICE: "Use pdfplumber" not "You should use pdfplumber". No "consider", "it might be helpful", "you can".
2. EXPLAIN WHY, NOT JUST WHAT: Transform every stated preference into reasoning.
   - BAD: "NEVER use bullet points"
   - GOOD: "Avoid bullet points. The audience reads this as a continuous narrative, and bullets fragment the argument."
3. NO BARE MUST/NEVER: If a hard rule exists, the next sentence must explain why it exists. The model extends reasoning correctly; it breaks on arbitrary rules.
4. LEAN: Under 500 lines total. If approaching the limit, push detail into references/.
5. EXTRACT, DON'T INVENT: Every rule must trace back to something the leader said, to clearly relevant facts in MEMORY_CONTEXT, or to VOICE_PROFILE rows. If they did not mention it, do not add it. The skill encodes THEIR expertise, not generic best practices.
6. DO NOT RESTATE THE DESCRIPTION: The body is operational (procedure, examples, edge cases). The description handles triggering. The body's first paragraph must be different language and content from the description.

Required sections in body, in this exact order:
- "## When this skill activates" (operational context, not a trigger restatement)
- "## Workflow" (numbered steps with reasoning)
- "## Voice and tone" (REQUIRED when VOICE_PROFILE is non-empty OR archetype is voice-lock; otherwise OMIT this section entirely). Encode each VOICE_PROFILE dimension as an imperative rule with reasoning. Hard rules carry verbatim. If a sample voice is provided, include a fenced code block labelled "// target voice register" reproducing the sample verbatim.
- "## Gotchas" (specific corrections to mistakes the agent will make - highest-value section). When VOICE_PROFILE is non-empty OR archetype is voice-lock, include AT LEAST ONE voice-regression gotcha (formality drift, em-dash absence, generic AI sign-off, "leverage" / "synergy" appearance, sentences > 30 words).
- "## Output format" (template or structural guide; include a fenced code block when helpful)
- "## References" (bulleted pointers to bundled files; each line begins with "Read [references/<file>.md](references/<file>.md) when ...")

### 2D: References
Split heavy context into separate files. Include only files referenced from the body.
- company-context.md: Business facts from MEMORY_CONTEXT relevant to this skill (company, role, team, constraints). Skip if MEMORY_CONTEXT is empty.
- format-rules.md: Formatting preferences extracted from the transcript (only if the leader specified formatting requirements).
- voice-profile.md: REQUIRED when VOICE_PROFILE is non-empty. Structure:
    # Voice Profile - <Skill Name>
    ## Style fingerprint
    [2-3 sentence synthesis of the dimensions into a readable description]
    ## Hard constraints
    [Verbatim hard rules]
    ## Voice reference sample
    // target voice register
    [Verbatim sample voice text if provided, or "(no sample provided)"]
    ## Dimension map
    | Dimension | Setting |
    |---|---|
    [Every dimension present in VOICE_PROFILE as one row]
- A domain-specific reference file may be added when the workflow has a heavy domain artifact (pricing, ICP, brand voice notes). Optional.

Each reference file should have a clear scope. Keep each under ~120 lines.

### 2E: Test Prompts
Generate exactly 3 realistic test prompts. Rules:
- MESSY: include typos, casual phrasing, backstory, partial information
- REALISTIC: the way a real person types at 9am on Monday, not a clean test case
- VARIED: cover different angles of the same workflow (different starting context, different urgency, different missing piece)

GOOD example:
"ok so my sales team just posted their updates in slack and I need to get the board update done before my 10am. the usual format - pipeline is looking rough this week tbh. can you pull it together?"

BAD example (too clean - reject this style):
"Please create a board update from the sales team data."

### 2F: Gotchas (separate from body section, used in summary)
Surface 2-4 of the highest-value gotchas as a separate JSON array. These should match the most critical items in the body's "## Gotchas" section.

### 2G: Archetype Classification
Classify which archetype the skill primarily serves:
- decision-framework: helps with decisions, analysis, strategic thinking
- voice-lock: bounded creative output in the leader's voice (LinkedIn posts, client emails, brand-voice copy). Assign when VOICE-LOCK was the dominant passing test, or when VOICE_PROFILE is non-empty AND the output is creative writing.
- reporting-engine: creates reports, dashboards, summaries from data
- tool-integration: connects tools, transforms data between systems
- getting-started: entry-level AI workflows for beginners

## PHASE 3: OUTPUT FORMAT

Return ONLY a single valid JSON object with this exact shape. No prose before or after.

For triage failure:
{
  "triage": {
    "passed": false,
    "result": "custom_instruction" | "memory_fact" | "saved_style",
    "reasoning": "string"
  }
}

For triage pass:
{
  "triage": {
    "passed": true,
    "result": "skill",
    "reasoning": "string explaining which honest tests passed (REPEATABLE / SPECIALISED / BOUNDED / VOICE-LOCK)"
  },
  "skill": {
    "name": "lowercase-hyphenated",
    "description": "full description with triggers and push language",
    "body": "full SKILL.md markdown body, NOT including YAML frontmatter",
    "references": [
      { "filename": "company-context.md", "content": "markdown content" },
      { "filename": "voice-profile.md", "content": "markdown content" }
    ],
    "test_prompts": ["messy prompt 1", "messy prompt 2", "messy prompt 3"],
    "gotchas": ["gotcha 1", "gotcha 2"],
    "archetype": "decision-framework | voice-lock | reporting-engine | tool-integration | getting-started"
  }
}`;
