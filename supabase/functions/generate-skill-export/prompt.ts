/**
 * Skill Builder LLM extraction prompt.
 *
 * Encodes the bounded-trigger check plus the Four Honest Tests triage gate,
 * the description-first generation rules from Krish's Skill-Building Best
 * Practices PDF, and the agentskills.io specification constraints. The model is forced into JSON mode by the caller;
 * this prompt only describes the JSON shape and the rules that produce it.
 *
 * Two failure modes the prompt actively defends against:
 *   1. Generating a "skill" for a Memory Web fact or Custom Instruction.
 *      Triage gate routes those out before generation runs.
 *   2. Inventing rules the leader never said. The transcript is the only
 *      source of truth; memory context provides background the leader has
 *      already confirmed elsewhere.
 */

export interface SkillSeedContext {
  kind: "blocker" | "decision" | "mission" | "briefing_segment" | "example";
  text: string;
}

export interface SkillPromptInputs {
  transcript: string;
  memoryContext: string;
  profileContext: string;
  voiceProfileContext?: string;
  seed?: SkillSeedContext;
}

export function buildSkillSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function buildSkillUserPrompt({
  transcript,
  memoryContext,
  profileContext,
  voiceProfileContext,
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

  if (voiceProfileContext && voiceProfileContext.trim().length > 0) {
    lines.push(
      `VOICE_PROFILE (self-identified writing voice - MUST shape "## Voice and tone" and voice-profile.md reference):`,
      voiceProfileContext.trim(),
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
    `Apply the bounded-trigger check and the Four Honest Tests, then generate the skill (or route to a different output type). Return ONLY the JSON object described in the system prompt.`,
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
4. VOICE_PROFILE (optional): Self-identified writing voice dimensions

## PHASE 1: TRIAGE

Evaluate BOUNDEDNESS FIRST, then run the Four Honest Tests:

**Step 0 - Bounded trigger check (run before everything else):**
- Does this describe a specific, invocable workflow with a clear trigger? (e.g. "draft my board update", "write the LinkedIn post")
- If NO bounded trigger AND it reads as a universal style preference ("make everything sound like me", "always be more confident") -> route to saved_style or custom_instruction, NOT a skill.
- If YES bounded trigger -> continue to the four tests below.

1. REPEATABLE: Is this work done at least weekly? Look for: "every Monday", "whenever I", "each time", "always have to", frequency markers, or cascade picks that state recurrence.
2. SPECIALISED (operational): Would generic Claude get the PROCEDURE materially wrong? Unusual formatting, domain constraints, tool-specific steps.
3. BOUNDED: Can you describe when to use it in one or two sentences? If multiple unrelated tasks, pick the strongest single skill.
4. CONSISTENT CREATIVE OUTPUT (voice-lock pass): If the workflow produces written/creative output in the leader's signature style (LinkedIn posts, client emails, board narrative in their voice), ask: "Would generic Claude produce something that sounds like THIS person?" If yes to bounded trigger + creative output + individual voice -> PASS as voice-lock even when test 2 alone would fail.

If ANY of tests 1, 3 fail (or step 0 fails), return:
{
  "triage": {
    "passed": false,
    "result": "custom_instruction" | "memory_fact" | "saved_style",
    "reasoning": "why it failed and what it should be instead"
  }
}

Choose the result type based on the content:
- "custom_instruction": universal preferences (tone, register, style of interaction) that apply across ALL tasks with no bounded trigger.
- "memory_fact": context about the leader's company, team, or situation that does not describe a procedure.
- "saved_style": tone/register adjustments with no bounded trigger (e.g. "make everything more confident").

If tests 1+3 pass and either test 2 OR test 4 passes, continue to Phase 2.

## PHASE 2: EXTRACT AND GENERATE

### 2A: Name
- Generate a lowercase-hyphenated name, max 64 characters
- Use gerund form when natural (e.g. "writing-board-updates", "preparing-monday-standups")
- Must start with a letter, contain only a-z, 0-9, and single hyphens
- Must NOT start or end with a hyphen, must NOT contain consecutive hyphens
- Must be descriptive, not vague (never "helper", "utils", "tools", "assistant")

### 2B: Description (THIS IS 80% OF THE SKILL)
The description determines whether Claude triggers the skill. Rules:

1. First sentence: third-person statement of what the skill does, ending with a period. Under 100 characters.
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
5. EXTRACT, DON'T INVENT: Every rule must trace back to something the leader said or to clearly relevant facts in MEMORY_CONTEXT. If they did not mention it, do not add it. The skill encodes THEIR expertise, not generic best practices.
6. DO NOT RESTATE THE DESCRIPTION: The body is operational (procedure, examples, edge cases). The description handles triggering. The body's first paragraph must be different language and content from the description.

Required sections in body, in this exact order:
- "## When this skill activates" (operational context, not a trigger restatement)
- "## Workflow" (numbered steps with reasoning)
- "## Voice and tone" (REQUIRED when VOICE_PROFILE is present OR archetype is voice-lock: structural rules from content archetype, rhythm/register, punctuation, and the leader's hard rules verbatim. Include a fenced block labeled // target voice register ONLY when a REAL sample exists - the VOICE_PROFILE sample, or a passage the leader quoted verbatim in the TRANSCRIPT - and reproduce it WORD FOR WORD. If no real sample exists, describe the register in prose and include NO fenced sample. NEVER fabricate a quotation and present it as the leader's writing.)
- "## Gotchas" (specific corrections to mistakes the agent will make - include at least one style regression gotcha for voice-lock skills)
- "## Output format" (template or structural guide; include a fenced code block when helpful)
- "## Learning loop" (REQUIRED, 4-6 lines: how this skill sharpens with use - see 2C-LL below)
- "## References" (bulleted pointers to bundled files; each line begins with "Read [references/<file>.md](references/<file>.md) when ...")

### 2C-LL: Learning loop section
Always include a "## Learning loop" section. Keep it concrete and honest (4-6 lines):
- After each run, note whether the leader kept the output as-is, edited it, or rejected it, and capture the single biggest correction in one line.
- Recurring corrections graduate into new "## Gotchas" entries, so the skill sharpens itself from real mistakes (the highest-value section).
- To close the loop, the leader brings those corrections back to CTRL, which proposes a sharpened version of this skill.
- Do NOT claim the skill auto-updates on its own. It sharpens only when its runs are fed back. The literal phrase "learning loop" must appear in the heading.

### 2D: References
Split heavy context into separate files. Include only files referenced from the body.
- company-context.md: Business facts from MEMORY_CONTEXT relevant to this skill (company, role, team, constraints). Skip if MEMORY_CONTEXT is empty.
- format-rules.md: Formatting preferences extracted from the transcript (only if the leader specified formatting requirements).
- voice-profile.md: REQUIRED when VOICE_PROFILE is present (it carries real captured dimensions + a real sample). When the skill is voice-lock but NO VOICE_PROFILE was provided, this file is OPTIONAL - the "## Voice and tone" body section already carries the register; add the file only if it would hold real, non-fabricated detail. Structure:
  (a) Style fingerprint (2-3 sentences).
  (b) Hard constraints (the leader's rules, verbatim).
  (c) Voice reference sample: include a // target voice register block ONLY with a REAL sample (the VOICE_PROFILE sample, or a verbatim TRANSCRIPT quote), word for word. If none exists, write "No verbatim sample captured yet - match the dimensions below." and include NO fenced sample. Never invent one.
  (d) Dimension map: when VOICE_PROFILE is present, the table MUST list its dimensions with the leader's values - Signoff, Disagreement, Content archetype, Sentence length, First person, Punctuation, Hard rules. When VOICE_PROFILE is absent, map only the dimensions the TRANSCRIPT actually evidences; never pad with generic rows.
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
- voice-lock: enforces tone, style, communication patterns
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
    "reasoning": "string explaining why it qualifies"
  },
  "skill": {
    "name": "lowercase-hyphenated",
    "description": "full description with triggers and push language",
    "body": "full SKILL.md markdown body, NOT including YAML frontmatter",
    "references": [
      { "filename": "company-context.md", "content": "markdown content" }
    ],
    "test_prompts": ["messy prompt 1", "messy prompt 2", "messy prompt 3"],
    "gotchas": ["gotcha 1", "gotcha 2"],
    "archetype": "decision-framework | voice-lock | reporting-engine | tool-integration | getting-started"
  }
}`;
