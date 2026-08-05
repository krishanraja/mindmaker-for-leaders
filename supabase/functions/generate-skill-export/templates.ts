/**
 * Template builders for the static files included in every skill ZIP:
 *   - SKILL.md (YAML frontmatter + body)
 *   - 01-test-prompts.txt
 *   - 02-maintenance-card.txt
 *   - 03-install-guide.txt
 *
 * Static files are kept verbatim from the project plan so clients see
 * consistent guidance regardless of which skill they download.
 */

export interface SkillFrontmatterInput {
  name: string;
  description: string;
  archetype?: string;
  client?: string;
  version?: string;
}

export function buildSkillMarkdown(
  frontmatter: SkillFrontmatterInput,
  body: string,
): string {
  const yaml = renderYamlFrontmatter(frontmatter);
  return `${yaml}\n\n${body.trimEnd()}\n`;
}

function renderYamlFrontmatter(input: SkillFrontmatterInput): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`name: ${input.name}`);
  lines.push("description: >");
  // YAML folded scalar: each non-empty line is appended with a single space.
  // Wrap at ~80 chars for readability without breaking semantics.
  const wrapped = wrap(input.description.replace(/\s+/g, " ").trim(), 80);
  for (const line of wrapped) {
    lines.push(`  ${line}`);
  }
  lines.push("license: Proprietary. Built by Mindmaker (themindmaker.ai).");
  lines.push("compatibility: Designed for Claude Code, Claude.ai, and compatible agent platforms.");
  lines.push("metadata:");
  lines.push("  author: mindmaker");
  lines.push(`  version: "${input.version || "1.0"}"`);
  if (input.client) lines.push(`  client: ${input.client}`);
  if (input.archetype) lines.push(`  archetype: ${input.archetype}`);
  lines.push("---");
  return lines.join("\n");
}

function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    if (!line) {
      line = w;
    } else if (line.length + 1 + w.length <= width) {
      line += ` ${w}`;
    } else {
      out.push(line);
      line = w;
    }
  }
  if (line) out.push(line);
  return out.length ? out : [""];
}

export function buildTestPromptsFile(prompts: string[], skillName: string): string {
  const header = [
    "TEST PROMPTS",
    "============",
    "",
    `Skill: ${skillName}`,
    "",
    "Open a fresh Claude conversation and paste any of these prompts. The skill",
    "should activate automatically based on the description's trigger phrases.",
    "If a prompt does not trigger the skill, the description likely needs more",
    "trigger phrases that match the leader's actual language.",
    "",
    "----------------------------------------------------------------------",
    "",
  ].join("\n");
  const numbered = prompts
    .map((p, i) => `Prompt ${i + 1}:\n${p.trim()}\n`)
    .join("\n----------------------------------------------------------------------\n\n");
  return `${header}${numbered}\n`;
}

export function buildMaintenanceCard(skillName: string): string {
  return [
    "MAINTENANCE CARD",
    "================",
    "",
    `Skill: ${skillName}`,
    "",
    "Skills drift. Run this audit every quarter to keep the skill aligned with",
    "how the work actually gets done.",
    "",
    "Quarterly audit checklist",
    "-------------------------",
    "",
    "1. Trigger rate. Open a fresh Claude session and paste each test prompt.",
    "   Did the skill activate every time? If not, add the missing phrasing to",
    "   the description's trigger list.",
    "",
    "2. Workflow accuracy. Has the workflow itself changed? Re-read the",
    "   numbered steps in SKILL.md and compare to how you do this work today.",
    "   Update steps that no longer match.",
    "",
    "3. Gotchas freshness. Have new mistakes shown up that aren't documented?",
    "   The Gotchas section is the highest-value content - keep it current.",
    "",
    "4. References load on demand. Make sure each file in references/ is still",
    "   linked from the body. Orphaned reference files waste context budget.",
    "",
    "5. Output format match. Does the output template still match what your",
    "   audience expects? Format preferences shift quietly over time.",
    "",
    "6. Description length. Stay under 1024 characters. If you're adding more",
    "   trigger phrases, prune older ones that no longer match how you talk",
    "   about the work.",
    "",
    "If the skill is no longer triggering or producing the right output, it is",
    "cheaper to regenerate from a fresh voice transcript than to patch by hand.",
    "",
  ].join("\n");
}

export function buildInstallGuide(skillName: string): string {
  return [
    "AGENT SKILL INSTALLATION GUIDE",
    "===============================",
    "",
    `Skill: ${skillName}`,
    "",
    "FOR CLAUDE CODE (Recommended):",
    `  1. Open your terminal`,
    `  2. Run: unzip ${skillName}.zip -d ~/.claude/skills/`,
    `  3. Done. The skill activates automatically in your next Claude Code session.`,
    "",
    "FOR CLAUDE.AI (Web):",
    `  1. Go to claude.ai and sign in`,
    `  2. Open Settings, then Customize`,
    `  3. Go to Skills, then click the + button`,
    `  4. Choose "Create skill", then "Upload a skill"`,
    `  5. Select this ZIP file`,
    `  6. Done. The skill activates automatically when you describe a matching task.`,
    "",
    "FOR CLAUDE DESKTOP:",
    `  Same as Claude.ai (web). Settings, then Customize, then Skills, then +,`,
    `  then Create skill, then Upload a skill.`,
    "",
    "FOR CURSOR:",
    `  1. Unzip this file into your project's .claude/skills/ directory`,
    `  2. The skill will be available in your next Cursor session.`,
    "",
    "FOR OPENCLAW (or other agentskills.io-compatible runtimes):",
    `  1. Unzip to ~/.openclaw/skills/${skillName}/`,
    `  2. Restart the agent.`,
    "",
    "TESTING YOUR SKILL:",
    "  Open a new conversation and try one of the prompts in 01-test-prompts.txt.",
    "  The skill should activate automatically. If it does not, check that the",
    "  task description matches the skill's trigger phrases.",
    "",
  ].join("\n");
}
