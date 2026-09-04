# AI Harness Architecture: Teardown Notes (July 2026)

Note on method: rules 1-7 from the brief are applied throughout. Where a claim comes from a vendor with no replication, it is marked CLAIMED. Where there is an open repo, a benchmark, or independent reporting, it is marked DEMONSTRATED. No em dashes are used anywhere in this document.

## Section 1: Anthropic's Own Stack

**Three findings that change how you build:**
1. SKILL.md is deliberately minimal (two required frontmatter fields: `name`, `description`) and progressive disclosure is not a metaphor, it is a hard file-loading mechanism: the body only enters context when the description matches, and supporting files inside the skill folder only load when referenced.[^1][^2]
2. Anthropic ships two structurally different stacks on the same underlying engine: `anthropics/skills` (skills, for Claude Code, individual-developer oriented) and `anthropics/knowledge-work-plugins` (plugins, for Cowork, department oriented, bundling skills + MCP connectors + slash commands + subagents). Conflating the two produces "two mediocre stacks instead of two sharp ones" per independent teardown.[^2][^3][^4]
3. Subagents are context-isolation devices, not delegation for its own sake: only a final summary crosses back to the parent thread, which is the mechanism that keeps a 40-person org's harness from blowing its context budget when multiple skills/subagents run in parallel.[^5][^6][^7]

### SKILL.md: mechanism, not marketing

What is stored: a directory containing a required `SKILL.md` (YAML frontmatter + Markdown body) plus optional supporting files (`reference.md`, `examples.md`, `scripts/*.sh`). Where: `~/.claude/skills/` (personal, all projects), `.claude/skills/` (project), plugin `skills/` subdirectory (namespaced), or enterprise-managed settings. Who writes it: any user or team member with repo/filesystem access; enterprise-tier skills are pushed centrally. Who reads it: Claude's context loader, which first loads only `name` + `description` (+ optional `when_to_use`) truncated at 1,536 characters combined, and loads the full body only if the skill is triggered. When updated: live change detection picks up edits to `SKILL.md` text within a running session without restart; changes to bundled `hooks/`, `.mcp.json`, `agents/` inside a plugin-packaged skill require `/reload-plugins`. What happens when it is wrong: nothing catches it automatically; there is no built-in eval gate in the open-source skill spec itself, quality control is left to whoever authors and reviews the file (see Section 6 on how third parties are bolting eval pipelines on top).[^1]

Verbatim minimal template from the official repo:

```
---
name: my-skill-name
description: A clear description of what this skill does and when to use it
---

# My Skill Name

[Add your instructions here that Claude will follow when this skill is active]

## Examples
- Example usage 1
- Example usage 2

## Guidelines
- Guideline 1
- Guideline 2
```


Verbatim real, working example from official docs (dynamic context injection pattern):

```
---
description: Summarizes uncommitted changes and flags anything risky. Use when the user asks what changed, wants a commit message, or asks to review their diff.
---

## Current changes

!`git diff HEAD`

## Instructions

Summarize the changes above in two or three bullet points, then list any risks you notice such as missing error handling, hardcoded values, or tests that need updating. If the diff is empty, say there are no uncommitted changes.
```


The `!`command`` syntax runs a shell command and splices its live output into the prompt before Claude ever sees the file, meaning the skill is grounded in the actual working tree rather than a static description. This is the closest published mechanism to "memory that is always fresh at read time" rather than "memory that goes stale."

Full frontmatter field table (verbatim field names, official docs) includes `name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context` (set to `fork` to run in an isolated subagent), `agent`, `background`, `hooks`, `paths` (glob-scoped auto-activation), `shell`. Anthropic's explicit guidance: "Keep SKILL.md under 500 lines. Move detailed reference material to separate files", and the body should "state what to do rather than narrating how or why," because once loaded it persists across the whole session and every line is a recurring token tax.[^1]

Anthropic's disclaimer on the public repo is a rare piece of vendor honesty worth quoting: "These skills are provided for demonstration and educational purposes only... the implementations and behaviors you receive from Claude may differ from what is shown in these skills". This means the repo is a design-pattern library, not a certified production spec; the docx/pdf/pptx/xlsx skills are explicitly flagged as "source-available, not open source" but are the actual production skills powering Claude's own document features. That is one of the few DEMONSTRATED (not claimed) production skill implementations in the entire space.[^2]

An independent empirical study (arXiv, mined 18,463 skills from the community registry skills.sh and 23,199 personal-use skills from 5,876 GitHub repos) found reuse is mostly copy-paste with low subsequent maintenance: 53% of reused skills are never modified after adoption, and the maintenance that does happen is "overwhelmingly additive" (reworking operational specs, adapting knowledge/resources). This is a DEMONSTRATED finding, not a vendor claim, and it is a meaningful signal for a practitioner: skills in the wild function more like copied templates than living, iteratively refined documents, which argues for building your own review cadence rather than assuming community skills self-improve.[^8]

### Claude Code architecture (subagents, and what "1.6%" tells you)

An independent systematic teardown (VILA-Lab, GitHub) of Claude Code's actual codebase reports: "Only 1.6% of Claude Code's codebase is AI decision logic. The other 98.4% is deterministic infrastructure, permission gates, context management, tool routing, and recovery logic". This is the single most load-bearing fact in this section for a harness architect: the model is a small piece of a much larger deterministic scaffold, exactly the "harness" framing in the brief.[^7]

Mechanism: the core loop is a ReAct-pattern while-loop (assemble context, call model, dispatch tools, check permissions, execute, repeat) across 7 components and 5 architectural layers. Subagents: 6 built-in types (Explore, Plan, General-purpose, Guide, Verification, Statusline) plus custom agents defined as Markdown files with YAML frontmatter under `.claude/agents/`. Isolation: each subagent gets a fresh context window; "sidechain transcripts" mean only a summary returns to the parent, protecting the parent's context from subagent verbosity. As of Claude Code v2.1.172, subagents can spawn their own subagents up to 5 levels deep. Coordination for concurrent/parallel agent teams uses POSIX `flock()`; the same teardown flags that "agent teams in plan mode cost approximately 7x tokens", a concrete, quantified cost-of-parallelism figure, DEMONSTRATED via code inspection rather than claimed.[^6][^7]

Failure mode explicitly documented: "Never restore permissions on resume... Auditability > query power", i.e., Anthropic's own design choice was to bias toward safety/audit over convenience when a session resumes, an explicit tradeoff worth copying into your own harness's session-resume policy.[^7]

Where skills live inside subagents: subagents can have skills "preloaded" into them, but `disable-model-invocation: true` on a skill also prevents it from being preloaded into subagents. This is a governance lever: you can force certain organisational-standard skills to always load into every subagent, or explicitly block a skill from subagent contexts if it is meant only for direct human invocation.[^1]

### Cowork and plugins (the enterprise-facing harness surface)

Cowork does NOT read your local `~/.claude/skills/` directory; interactive and scheduled Cowork sessions load skills enabled for the Claude.ai account instead, synced at session start, managed via "Customize" in the desktop app. This is a concrete distributed-systems fact with a real failure mode: "If a skill exists only in `~/.claude/skills/` on your machine, Claude Code reports that the skill was not found when a routine invokes it, because each routine run starts as a fresh remote session". For a 40-person org running scheduled/automated routines, personal local skills silently do not exist in that execution context; the workaround is committing skills to the repo's `.claude/skills/` or shipping them as a declared plugin.[^1]

Plugin architecture (file-based, "config-as-code," confirmed by both Anthropic's own repo and independent teardown): a plugin folder contains `.claude-plugin/plugin.json` (manifest), `.mcp.json` (MCP tool connections), `commands/` (explicit slash-command triggers), `skills/` (auto-triggered domain knowledge). Execution model: inference happens via API against a Claude model in the cloud; execution (code, file reads, tool calls) happens in an isolated local sandboxed VM (Apple Virtualization Framework on macOS). Anthropic launched 11 official plugins on 30 January 2026 (Productivity, Enterprise search, Marketing, Sales, Data, Customer support, Plugin Create, Finance, Legal, Product management, Biology research), expanding to 24 by February 2026 across HR, Design, Engineering, Operations, Financial Services, Investment Banking, Equity Research, Private Equity, Wealth Management, plus partner plugins from Slack/Salesforce, LSEG, S&P Global, Apollo, Common Room.[^9][^10][^11][^12][^4]

A vertical skill pack inside a marketplace plugin, per one detailed teardown, is structured deliberately to separate reusable domain best-practice from org-specific proprietary context: "a Persona section establishes the appropriate professional identity, the Questions section defines the scope of the function and its boundaries, and the Principles section captures the operating logic that any competent practitioner in that domain would recognise as sound". This Persona/Questions/Principles triad is directly transferable to a "what would our head trainer do" skill design and is worth quoting into a harness spec.[^9]

Enterprise governance surface for plugins: private plugin marketplaces via admin "Customize" menu, per-user provisioning, auto-install to specific teams, visibility restriction by team, OpenTelemetry monitoring. This is CLAIMED by Anthropic marketing collateral for the most part; independent verification of the OpenTelemetry claim specifically was not found in this research pass and should be flagged as thin evidence.[^11]

### Anthropic's own guidance on writing effective tools/skills

From Anthropic's engineering blog "Writing effective tools for AI agents" (authored by Ken Aizawa with named Anthropic contributors), the core mechanism-level lessons: build a prototype, run comprehensive evals with realistic multi-tool-call tasks, then iterate. A concrete quoted failure case: "When we launched Claude's web search tool, we identified that Claude was needlessly appending 2025 to the tool's query parameter, biasing search results and degrading performance (we steered Claude in the right direction by improving the tool description)". This is a genuine, named, DEMONSTRATED failure-and-fix, not a listicle claim.[^13]

Other verbatim principles: "namespacing tools by service (e.g., asana_search, jira_search) and by resource (e.g., asana_projects_search, asana_users_search), can help agents select the right tools at the right time" and "Claude Sonnet 3.5 achieved state-of-the-art performance on the SWE-bench Verified evaluation after we made precise refinements to tool descriptions, dramatically reducing error rates". The latter is a DEMONSTRATED, benchmarked claim (SWE-bench Verified is a public benchmark), not marketing copy.[^13]

***

## Section 2: Coding Harnesses (Most Mature Category) and What Convergence Tells Us

**Three findings that change how you build:**
1. The industry converged on a single content discipline (plain Markdown, no required schema, "stack / commands / conventions / constraints" sections) even though it fragmented on filenames, which tells you the *shape* of a harness is more important than the *vendor format*.[^14][^15]
2. AGENTS.md was formally donated to the Linux Foundation's Agentic AI Foundation in December 2025 as a vendor-neutral standard, and by May 2026 it is read by 20,000+ (one source) to 60,000+ (another source) public repos, natively by Codex, Cursor, Copilot, Gemini CLI, Aider, Windsurf, Zed. Claude Code is the documented holdout, still reading only `CLAUDE.md`, forcing a symlink workaround (`ln -s AGENTS.md CLAUDE.md`).[^16][^15][^14]
3. Cursor itself deprecated its own original format (`.cursorrules` to `.cursor/rules/*.mdc`) in favor of glob-scoped, frontmatter-driven activation, which is the same "progressive disclosure by file scope" idea Anthropic implements via SKILL.md `paths` frontmatter, independently arrived at.[^17][^15]

### Convergence table

| Tool | File | Format | Scoping mechanism | Reads AGENTS.md? |
|---|---|---|---|---|
| Cursor | `.cursor/rules/*.mdc` (new), `.cursorrules` (deprecated) | YAML frontmatter + Markdown | glob patterns, 4 modes: Always / Auto Attached / Agent Requested / Manual [^15] | Yes, since 2025 update [^14] |
| OpenAI Codex CLI | `AGENTS.md` + `AGENTS.override.md` | Plain Markdown, no schema | root-to-cwd directory chain, 32 KiB combined cap [^18] | Native, originator [^15] |
| Claude Code | `CLAUDE.md` | Plain Markdown | global `~/.claude/CLAUDE.md` + repo + nested | No (documented gap, open issue as of 26 May 2026) [^16] |
| GitHub Copilot | `.github/copilot-instructions.md` | Plain Markdown | repo root | Added native AGENTS.md support August 2025 [^15] |
| Windsurf | `.windsurfrules` / AGENTS.md (partial) | Markdown | repo root | Partial [^19], native as of mid-2026 update per [^16] |
| Aider | `CONVENTIONS.md` path, referenced via AGENTS.md | Markdown | configured path | Yes (via CONVENTIONS.md indirection) [^19] |

Convergence content pattern across all of them (community consensus, no formal spec): Stack (language, framework, package manager), Commands (dev/build/test/lint), Conventions (style, layout, naming), Constraints (what NOT to do, deny rules). The lesson for a harness architect: regardless of vendor, the working unit that survives is a short, human-readable Markdown file organized around "what to run" and "what not to do," not a heavyweight schema. The failure mode observed across three independent sources is file proliferation and drift: teams end up maintaining `AGENTS.md`, `.cursorrules`, `CLAUDE.md`, `.windsurfrules` as separate near-duplicates that "rot the second one of them does", and the working fix documented across multiple sources is a single source-of-truth file with the others reduced to one-line pointers or symlinks.[^18][^15][^14]

### Devin (Cognition): Playbooks and Knowledge, with real mechanism detail

This is one of the more mechanistically transparent vertical harnesses because Cognition wrote a "how we use it ourselves" postmortem-style blog. Two distinct artifact types, DEMONSTRATED via Cognition's own product blog and used internally at Cognition:

- **Knowledge**: "a collection of tips, documentation, and instructions that Devin 'knows' across all future sessions... Devin will automatically recall relevant Knowledge as necessary" and will also "automatically suggest new additions to Knowledge if something seems useful for future sessions". This is a write-on-observation memory mechanism, distinct from a static file.[^20][^21]
- **Playbooks**: "like a custom system prompt for a repeated task... If we find ourselves repeating the same instructions across multiple sessions, that's when we create a Playbook". Verbatim required contents of a good Playbook per Cognition: "The outcome we want Devin to achieve; The steps required to get there; Specifications describing postconditions; Advice to correct Devin's priors; Forbidden actions; Any required input or context from the person kicking it off".[^22]

"Advice to correct Devin's priors" and "Forbidden actions" as named, first-class fields are directly transferable to a leadership-training harness: you would want a Playbook field that says "override the model's generic tendency toward X" and a separate explicit deny-list. Cognition explicitly recommends combining Knowledge (general, always-relevant context) with Playbooks (task-specific, invoked): "Add Knowledge to teach Devin general context about your organization that is relevant for all runs, with and without Playbooks". Distribution: Playbooks can be "easily shared within an organization, so once one engineer successfully coaches Devin to complete a task, other engineers can replicate that success," and Cognition maintains a community gallery of Playbooks for common cross-org tasks.[^20]

### The honest failure-rate literature on coding/enterprise agent rollouts

This is where rule 4 (failure modes prominently) matters most, and where the evidence is genuinely contested. Several 2026 secondary sources cite overlapping but not identical failure-rate statistics, and it is important to flag which are primary survey data versus aggregation/marketing framing:

- Sinch's "AI Production Paradox" report (cited as May 2026, surveyed 2,527 senior enterprise decision-makers): 74% had already rolled back or shut down a live, customer-facing AI agent after deployment; of rollbacks, 31% cited customer data exposure, 22% hallucination/brand risk, 16% could not diagnose what went wrong. This is a primary survey finding, cited consistently across three independent secondary write-ups, and is DEMONSTRATED in the sense of being a named, dated, sample-sized survey rather than an undated claim, though this research pass could not access the Sinch report directly, so treat the exact percentages as secondary-sourced.[^23][^24]
- Gartner (cited June 2025 forecast): predicts 40%+ of agentic AI projects will be cancelled by end of 2027 due to organisational infrastructure gaps, not technology failure.[^25][^26]
- MIT NANDA initiative figure, repeated across sources: "95% of generative AI pilots at US companies fail to deliver measurable ROI". This figure is widely repeated in 2026 secondary sources but this pass did not verify against the primary NANDA publication; flag as contested/unverified pending primary-source check.[^25]
- A named, granular failure-mode decomposition (BCG/McKinsey/IDC-aggregated, presented by a single secondary analysis site, not independently corroborated in this pass): tool errors approximately 28% of production incidents, memory/state issues approximately 22%, unhandled edge cases approximately 18%, hallucination only approximately 12% ("not the dominant failure mode in 2026"). This inversion, tool/memory/edge-case failures dwarfing hallucination, is the single most useful piece of evidence in this section for a harness architect, because it means the scaffolding (memory files, tool schemas, state handling) is doing more damage when wrong than the model's raw generation quality. However, this figure comes from a single aggregator site rather than a primary study, so treat it as directionally credible but not fully demonstrated.[^27]
- Cross-cutting root cause repeated by nearly every source independently: authentication/identity boundary failures. One analysis of "847 AI agent implementations" found "62% of critical failures involved authentication issues". Another found integration complexity with legacy systems is cited by "46 percent of surveyed enterprise teams" as the primary deployment barrier.[^24][^28]

Flag explicitly: the specific numeric failure rates (74%, 88%, 95%, 40%) across these sources are inconsistent with each other and appear to originate from a cluster of SEO-oriented 2026 blog posts that cite each other and a small number of underlying surveys (Sinch, Gartner, MIT NANDA, Composio's 2025 AI Agent Report). Treat the *direction* (governance and observability failures dominate, not model capability) as well-evidenced across independent sources, but treat any single precise percentage as low-confidence secondary reporting rather than demonstrated fact.

***

## Section 3: Vertical Enterprise Harnesses with Published Architecture

**Three findings that change how you build:**
1. Harvey's "Data Factory" is the most mechanism-rich published enterprise harness found in this research: a four-stage pipeline (Sourcing Agent, Legal Review Agent, synthetic "answer-first" scenario generation, Decision Agent) that explicitly treats new knowledge sources as parameterized tools inside one reasoning agent rather than spinning up separate per-jurisdiction agents, because separate agents "loses conversation context during handoffs".[^29][^30]
2. Sierra's public framing from Bret Taylor is "goals and guardrails, not a sequence of steps," with supervisor models whose explicit job is to inspect the primary model's reasoning and intervene when it goes "off-script". This is a named architectural pattern (supervisor/inspector model), not just a policy statement.[^31]
3. Salesforce's Einstein Trust Layer is a genuinely mechanistic, verifiable pipeline (prompt injection detection, then PII masking, then LLM call with masked tokens, then grounding/toxicity check, then de-masking, then audit log), run on every single LLM call including intermediate topic-routing steps, not just the final user-facing response. One notable and easy-to-miss operational detail: "data masking through the Einstein Trust Layer is disabled by default specifically to improve agent performance and accuracy", meaning the marketed privacy mechanism is off unless an admin turns it on, a genuine claimed-versus-actual gap worth flagging.[^32][^33][^34][^35]

### Harvey (legal): mechanism teardown

What problem it solves: keeping a single reasoning agent grounded in jurisdiction-specific legal source material as coverage scales, without the coordination cost of separate per-jurisdiction agents. What is in the harness: a declarative "configuration layer" per jurisdiction, described verbatim as containing "domain lists, filter hierarchies, permissions, and agent instructions" that "turns vetted sources into parameterized tools for a single unified reasoning agent". Who writes it: an "Intake engine" that "discovers and validates new legal sources through automated jurisdiction mapping and compliance review" with human legal review of terms-of-service/copyright/access-policy summaries. Evaluation before production: Harvey's own description is explicit and mechanism-level, not a claim: "the system generates 'answer-first' scenarios, reverse-engineering specific fact patterns from actual legal materials that force agents to find and interpret real documents. Generic queries let models answer from training data without citations, which defeats the purpose. Then comes production simulation, trace validation checking whether agents actually reached the right content, and a multi-agent quality assessment scoring citation accuracy, legal reasoning quality, and presentation clarity on 1-5 scales. A Decision Agent makes final pass/fail calls, routing ambiguous cases to human review". Scale reported: 6 to 60+ jurisdictions, 20 to 400+ legal data sources, since August 2025. This is DEMONSTRATED insofar as it is a first-party engineering postmortem with named pipeline stages, though the specific pass/fail accuracy numbers were not independently verified.[^30][^29]

### Sierra (Bret Taylor): agent design philosophy

Mechanism, quoted from Taylor directly: "We call it a constellation of models. Our platform, we call it Agent Studio, you essentially configure the goals and guardrails of a process. Goals and guardrails, not the sequence of steps because you want agency but you want guardrails around it. Within that, we'll use reasoning, but we use supervisor models to actually inspect that reasoning. If you were an AI agent in Sierra and you decided to go off-script...". This supervisor-model-that-inspects-the-primary-model's-reasoning pattern is the single most directly transferable idea to a leadership-training harness evaluator/rubric layer: rather than hand-coding every step, define the goal state and guardrails, and use a second model instance whose sole job is to check the first model's chain of reasoning against those guardrails before an output ships. Sierra's earlier public writing described this as an "Agent Development Life Cycle" (2024 post, background not current practice per the brief's dating rule, cited here only to show the pattern's origin). Sierra raised $950M at a $15B valuation in 2026, evidence of investor confidence but CLAIMED, not evidence of the technical approach's superiority.[^36][^37][^31]

### Salesforce Agentforce / Einstein Trust Layer

What is in the harness: Role (persona definition), Topics/subagents (behavioral guardrails, renamed from "topics" to "subagents" in April 2026 with no functional change), real-time Knowledge grounded via Data Cloud semantic search (RAG against structured + unstructured data), and executable Actions built from existing Salesforce Flows/Apex/MuleSoft. The Trust Layer pipeline, verbatim sequence from a walkthrough video transcript: "Prompt Defense actively intercepts and neutralizes malicious injection attacks. In the second stage, PII masking algorithmically strips sensitive entities, replacing them with sanitized placeholders before external routing. The LLM generates its response using only these sanitized tokens. A subsequent grounding check verifies the response is based on retrieved data, preventing hallucinations. In the final pipeline stage, PII de-masking restores the authentic alphanumeric values". Every agent turn can trigger this multiple times: once for topic-routing classification, once or more per action invoking a prompt template, once for the RAG grounding retrieval, once for final synthesis. Governance: "Hybrid reasoning" explicitly separates a deterministic layer (IF/ELSE, guaranteed action sequences the LLM cannot override) from a generative layer (LLM natural-language reasoning within those bounds). Known weakness/claim gap: data masking is off by default for performance reasons, meaning the headline PII-protection mechanism requires explicit admin action to actually run on production data; this is the clearest CLAIMED-vs-ACTUAL discrepancy found in the vertical enterprise research.[^38][^39][^33][^35][^32]

### Hebbia and Glean: knowledge layer mechanism, thinner sourcing

Hebbia's architecture is described (via a third-party technical analysis referencing Hebbia's own docs and OpenAI case study confirmation) as "citation-first": "Every single piece of data, every clause, every number generated in their output is hyperlinked directly back to its precise origin in the source documents... transforming a chaotic swamp of unstructured data (PDFs, transcripts, reports) into a structured, auditable knowledge graph". This citation-trail-as-primary-mechanism (not an add-on) is a genuinely useful, specific design detail, though sourcing here is one third-party Medium analysis rather than Hebbia's own primary engineering writeup, so confidence is moderate.[^40]

Glean's mechanism is best described by an independent technical analysis of its "Enterprise Graph": a knowledge layer that "resolves identity, permissions, freshness, and provenance," distinct from search (finds information) and RAG (grounds generated answers), sitting as a control plane responsible for "resolving business entities across fragmented systems; expressing relationships through workflow-specific ontologies; preserving provenance and temporal state; enforcing fact-level permissions". The key mechanism claim, permission-aware retrieval at the fact level rather than the document level, is architecturally significant for a training company handling client-confidential material, but this pass found only secondary technical analysis, not Glean's own primary engineering documentation, so mark this CLAIMED/moderate confidence rather than fully demonstrated.[^41]

Writer.com was searched for but no primary engineering-architecture writeup with mechanism-level detail was found in this research pass; flag as a genuine gap rather than smoothing it over.

***

## Section 4: Community Skill and Agent Registries

**Three findings that change how you build:**
1. The single most rigorous data point on registry quality is DEMONSTRATED, not anecdotal: an empirical mining study of skills.sh (18,463 skills) found reuse is dominated by verbatim copying (53% never modified post-adoption) and a "long tail of specialised areas" behind a dominant Software Construction category, meaning most of what is in public registries is generic coding boilerplate, not organisation-specific judgment capture.[^8]
2. TrueFoundry's commercial "Skills Registry" product (launched May 2026) is evidence that the market itself has identified the exact gap the brief is probing: "Instead of treating agent behavior as prompt text scattered across systems, Skills Registry treats agent knowledge as a reusable, managed artifact that is portable, governed, and executable," with version history, access control, and auditability "out of the box". This validates that ungoverned skill sprawl is a recognized production problem serious enough to build paid infrastructure around.[^42]
3. Third-party "prompt governance" skill documentation (independently authored, not vendor marketing) lays out a concrete, implementable eval-gate workflow: BRANCH, DEVELOP, EVAL (against a golden dataset, minimum 20 examples for basic coverage, 100+ for production confidence, "reviewed and approved by domain expert, not just the engineer who wrote the prompt"), COMPARE, REVIEW, PROMOTE, MONITOR, ROLLBACK. This is the most directly copyable governance pattern found in this research for a skill/rubric pipeline.[^43]

Assessment of registry quality, honestly: the evidence suggests genuine bimodal quality. On one end, Anthropic's own `anthropics/skills` repo (163k stars, 44 commits, actively maintained as of July 2026, with named contributors)  and the docx/pdf/pptx/xlsx skills inside it are production-grade because they power Claude's actual document features. On the other end, third-party "awesome-claude-skills" style aggregator sites show wide variance; one review site tracking "Claude Code skills by author" reports an average "Pro QualityScore" of only 67.6/100 for one prolific author's 99 skills, suggesting even prolific, popular contributors produce inconsistent quality, not uniformly excellent work. No hard, independently-audited proportion of "genuinely useful versus SEO noise" across the whole registry ecosystem was found in this pass; that specific claim (what proportion is noise) remains unverified and should be flagged as thin evidence rather than asserted with a number.[^44][^2]

Specific skills assessed as genuinely good, with reasons: the Anthropic-maintained `docx`, `pdf`, `pptx`, `xlsx` skills are good because they are the actual production implementation behind a live product surface, meaning they have been battle-tested against real usage at scale rather than written speculatively. The "progressive-metadata" pattern skill documented on Smithery is good because it demonstrates, with a measured "84% token reduction," a specific optimization technique (metadata-first loading) rather than just restating Anthropic's docs, though this 84% figure is a single vendor-page claim and was not independently verified in this pass, so mark it CLAIMED.[^45][^2]

***

## Section 5: Enterprise Rollouts at 20-500 Person Companies

The brief asks specifically for engineering blogs, conference talks, and honest retrospectives at this scale, not vendor case studies. This is the weakest-evidence section in this research pass: the search surfaced abundant secondary aggregator content citing survey statistics (Section 2 above covers these) but very little primary first-party engineering blog content specifically at the 20-500 person scale, as distinct from either large-enterprise vendor deployments (Harvey, Salesforce customers) or individual-developer tooling (Cursor, Devin). This gap should be stated explicitly rather than papered over: the mid-market company size band the brief cares about (which matches your 40-person target org) is systematically underrepresented in public engineering writing, likely because companies at that scale rarely have dedicated technical-blogging functions and are less likely to be covered by trade press than either enterprise vendors or Silicon Valley engineering teams.

What is DEMONSTRATED and relevant at this scale: the failure-mode data (Section 2) about authentication boundary failures (62% of critical failures in one 847-implementation analysis), integration complexity with legacy systems as the top-cited barrier (46% of surveyed teams), and the "narrow scope + human-in-the-loop checkpoints + continuous evaluation infrastructure" pattern correlating with 3-5x better survival rates for narrowly scoped agents versus "do whatever the user asks" agents, are all size-agnostic findings that should transfer down to a 40-person org, though none were sourced from a company specifically in the 20-500 headcount band with named attribution. This is a genuine evidence gap; treat any specific application of these figures to a 40-person training company as extrapolation, not demonstrated fact.[^28][^24][^27]

***

## Section 6: Governance in Practice

**Three findings that change how you build:**
1. The clearest, most implementable eval-gate pattern found is a three-tier maturity model: (1) file-based registry in version control for small teams, (2) database-backed registry with `prompts`/`prompt_versions` tables tracking slug, content, model, environment, eval_score, promotion metadata for larger teams, (3) full governed iteration lifecycle with branch/eval/review/promote/monitor/rollback gates. This maps directly onto a 40-person org's likely trajectory (start file-based in Git, add a registry only once skill count justifies it).[^43]
2. Separation of author and reviewer is explicitly required in the best-documented pattern: golden datasets must be "reviewed and approved by domain expert, not just the engineer who wrote the prompt", which is the direct analogue of code review for prompts/skills.[^43]
3. Commercial registries (TrueFoundry) treat skills as versioned artifacts with "built-in access control and auditability," explicitly analogous to how the same org already manages ML model artifacts and infrastructure-as-code, which suggests the correct governance mental model for skills is "treat it like a deployed software artifact," not "treat it like a document."[^46][^42]

What happens when two skills conflict: none of the sources found in this pass, including Anthropic's own official documentation, specify an explicit conflict-resolution protocol between two independently-triggered skills active in the same turn beyond simple precedence-by-location (enterprise overrides personal overrides project; nested directory-qualified skills coexist under distinct names). This is a genuine documented gap in the ecosystem, not something this research is smoothing over: skill-versus-skill semantic conflict (two skills giving contradictory instructions that both legitimately match the trigger) appears to be left to the model's own arbitration at inference time, with no published deterministic resolution mechanism. A practitioner building a harness for a training company should treat this as an open design problem requiring a bespoke solution (e.g., an explicit precedence field, or a supervisor-model check per the Sierra pattern in Section 3) rather than something the platform solves for you.[^1]

Pass thresholds documented for eval gates, verbatim: "Classification/extraction: 95% or higher exact match; Summarization: 0.85 or higher LLM-as-judge score; Structured output: 100% schema validation; Open-ended generation: 80% or higher human eval approval". These are useful starting calibration points, though sourced from a single independent skill-governance writeup rather than a peer-reviewed or vendor-audited standard, so treat as a reasonable community heuristic rather than an industry-validated benchmark.[^43]

***

## Section 7: Encoding a Named Individual's Judgment ("What Would X Do")

This is explicitly flagged in the brief as the closest analogue to the target use case, and the evidence here is thin, largely informal, and mostly non-primary. That thinness should be stated plainly rather than dressed up.

**What was found, and its evidentiary status:**

1. A widely-circulated 2026 content piece describes building system prompts, memory files, and an "IDENTITY.md" configuration explicitly designed to encode named founders' documented mental models (Jensen Huang, Elon Musk, Dario Amodei, Sam Altman, Brian Chesky, Paul Graham) into a "founder council" that runs multiple frameworks in parallel across Claude, ChatGPT, and OpenClaw. This is a commercial content product (a paid "playbook"), not a published engineering case study, and it is built from the founders' publicly known statements rather than any first-party collaboration with them, so the "judgment" encoded is really "publicly observable rhetoric," not verified internal decision logic. Mark CLAIMED, low rigor.[^47]

2. A Forbes-published piece by Jodie Cook proposes a concrete four-prompt method for a CEO to encode their own judgment into a reusable "CEO constitution": (a) a mission/values/non-negotiables constitution under 250 words explicit enough that "anyone to apply these principles for decision-making in my absence"; (b) decision-process if/then trees with documented "nuances regarding when I deviate from my own guidelines and the reasons behind such deviations"; (c) an explicit boundary-setting step that asks the model to "identify judgments that are strictly human, particularly in terms of building professional relationships and making personnel decisions" and to justify why each requires human insight; (d) a recurring changelog process to capture belief updates over time. This is the most structurally rigorous "what would X do" method found in this research, notably because step (c) explicitly builds in the boundary of what should NOT be automated, directly relevant to a governance-conscious harness. Evidentiary status: a single named journalist's prescriptive methodology, not a validated or benchmarked system; it should be read as folk-wisdom-with-structure rather than evidence of efficacy.[^48]

3. A YouTube-published "10x AI SOP Method" (Ecomm Breakthrough podcast, Josh Hadley) describes a four-step empirical process specifically aimed at capturing founder judgment for operational handoff: record the founder actually performing the task multiple times across different scenarios and time periods ("ideally four different times on four different days... even better four different weeks," explicitly to capture seasonality) while vocalizing every decision and tradeoff aloud; feed the transcripts to an AI model; have the AI "interrogate" the founder with successive rounds of clarifying questions (one described session logged 240 interrogation questions) targeting 95% then 99.9% "accuracy" in reproducing the founder's judgment; then generate a structured SOP and onboarding sequence from the accumulated material. The explicit design principle stated: "An SOP is complete when someone can make the same decisions as you, which is achieved by using AI interrogation". This is the single most mechanistically detailed "what would X do" capture process found, but it is a podcast case study from a single practitioner, not peer-reviewed or independently replicated, and the "99.9% accuracy" figure is self-reported with no external validation methodology described. Mark CLAIMED, and flag the accuracy figure specifically as unverifiable folk wisdom.[^49]

4. A separate "AI Chief of Staff" method describes a four-section system prompt (Company Context, Decision Frameworks, Communication Preferences, Current Priorities) intended to let a model act as a challenge/stress-test partner reflecting one person's actual decision tendencies, with an explicit monthly maintenance ritual to keep it current. Structurally, this is a lighter-weight cousin of the CEO-constitution approach in item 2, useful chiefly for the explicit call-out that the model should be told when to "push back forcefully" versus "offer alternatives gently," an editable-tone parameter directly transferable to encoding a specific instructor or director's pedagogical style.[^50]

**Honest synthesis for this section:** there is no rigorous, peer-reviewed, or enterprise-published (Anthropic, OpenAI, or academic) primary source in this research pass that documents a production system whose explicit, stated design goal was "reproduce what would a specific named individual do" with any measured validation of fidelity. What exists is a cluster of practitioner-level, largely unverified methods (podcast, Forbes op-ed, paid playbook) converging on the same rough pattern: (1) extract explicit decision principles via structured interrogation, (2) separate the reproducible logic from the judgments that must stay human, (3) maintain a recurring update cadence, (4) validate informally by having others apply the encoded logic and checking whether outputs match what the original person would have said. This convergence across independently-authored, non-affiliated sources is itself a weak-to-moderate signal that the pattern is real folk practice, but it should not be presented to the practitioner as validated methodology. This is the area of the brief where the evidence is genuinely thinnest, and the brief's instinct that this is worth searching hard for, "even if the examples are obscure," was correct: the examples that exist are obscure precisely because no institution with rigorous publication standards has yet published a teardown-level case study of this specific use case.

***

## Cross-Cutting Synthesis for a 40-Person Training Company

Drawing only from the mechanism-level detail above (not from general reasoning): the closest existing patterns to what the brief describes are (a) Anthropic's own Persona/Questions/Principles skill triad from Cowork vertical packs, (b) Cognition's Playbook fields (outcome, steps, postconditions, prior-correction, forbidden actions, required input), (c) Sierra's supervisor-model-inspects-reasoning pattern for guardrail enforcement, and (d) the eval-gate lifecycle with mandatory domain-expert review separate from the author. None of these four sources were built for the "encode one person's judgment" problem specifically, but combined they give a mechanism-complete blueprint: author skills using the Persona/Questions/Principles structure, express task-specific procedures as Playbook-style documents with an explicit forbidden-actions field, gate every skill/rubric change through a domain-expert-reviewed golden dataset before production, and add a supervisor-model check for any output claiming to represent a named individual's standard. The evidence gap flagged in Section 7 should be treated as a genuine opportunity rather than a dead end: this is a documented white space in the published literature as of July 2026.[^31][^22][^9][^43]

---

## References

1. [Boost Your Digital Portfolio: From Linkedin Profile to Github Repository](https://edumediasolution.com/society/article/view/683) - In the modern era, having a digital portfolio is an important requirement for students and aspiring ...

2. [GitHub - anthropics/skills: Public repository for Agent Skills](https://github.com/anthropics/skills) - This repository contains skills that demonstrate what's possible with Claude's skills system. These ...

3. [Claude Code vs Cowork: The 2026 Setup Nobody Explains (17 Skills + 11 Plugins)](https://www.youtube.com/watch?v=k2ZOFBu3MJk) - Everyone treats "Claude skills" as one thing. Anthropic doesn't.

There are TWO official stacks — an...

4. [Anthropic Adds Plugins to Claude Cowork](https://www.reworked.co/collaboration-productivity/anthropic-adds-plugins-to-claude-cowork/) - Anthropic introduces plugins to Claude Cowork, with 11 open-source plugins available at launch to cu...

5. [How Sub-Agents Work in Claude Code: A Complete Guide - Medium](https://medium.com/@kinjal01radadiya/how-sub-agents-work-in-claude-code-a-complete-guide-bafc66bbaf70) - Claude Code has revolutionized AI-assisted development with its command-line tool for agentic coding...

6. [Subagents in the SDK - Claude Code Docs](https://code.claude.com/docs/en/agent-sdk/subagents)

7. [README.md - VILA-Lab/Dive-into-Claude-Code - GitHub](https://github.com/VILA-Lab/Dive-into-Claude-Code/blob/main/README.md) - A Systematic Analysis and Discussion of Claude Code for Designing Today's and Future AI Agent System...

8. [From Registry to Repository: How AI Agent Skills Are Written, Adapted, and Maintained](https://www.semanticscholar.org/paper/3c50ab1dcbd0392233b81b2dea63eeaea7e475e6) - AI coding agents increasingly rely on skills: structured context bundles, typically a SKILL$.$md fil...

9. [The Cowork Plugin Marketplace | The AI Agent Factory](https://agentfactory.panaversity.org/docs/Business-Domain-Agent-Workflows/enterprise-agent-blueprint/cowork-plugin-marketplace) - Understand how the Cowork Plugin Marketplace distributes domain expertise through vertical skill pac...

10. [All 11 Official Plugins Explained - Claude Cowork Guide](https://claudecowork.im/blog/claude-cowork-plugins-complete-guide) - Anthropic released 11 official plugins for Claude Cowork in January 2026. Learn about each plugin, c...

11. [Claude Cowork Plugins for Enterprise: Complete Guide [2026]](https://almcorp.com/blog/claude-cowork-plugins-enterprise-guide/) - Everything you need to know about Claude Cowork's February 2026 enterprise update: private plugin ma...

12. [Cowork Plugins: Build Your Own Claude Tools](https://ai-rockstars.com/cowork-plugins-build-your-own-claude/) - Customize Claude with Cowork Plugins: Bundle skills and connectors for tailor-made AI workflows. Now...

13. [Design And Development of an AI Powered Open-Source GitHub Repository Finder](https://ijsrem.com/download/design-and-development-of-an-ai-powered-open-source-github-repository-finder/) - Abstract - The rapid progress in Artificial Intelligence (AI) and Natural Language Processing (NLP) ...

14. [AGENTS.md: The Cross-Tool Standard Explained - RuleSell](https://www.rulesell.com/topic/agents-md) - What AGENTS.md is, which tools read it, how it compares to CLAUDE.md, and the symlink trick to make ...

15. [Agents.md best practices · GitHub - Gist](https://gist.github.com/0xfauzi/7c8f65572930a21efa62623557d83f6e) - Agents.md best practices. GitHub Gist: instantly share code, notes, and snippets.

16. [Does Claude Code read AGENTS.md? No - Gist - GitHub](https://gist.github.com/yurukusa/d36197848911f025add142abefcde685) - Does Claude Code read AGENTS.md? No — it reads CLAUDE.md. The official @AGENTS.md import and symlink...

17. [AGENTS.md vs CLAUDE.md vs Cursor Rules vs Copilot (2026)](https://codersera.com/blog/agents-md-vs-claude-md-vs-cursor-rules-comparison-2026/amp/) - AGENTS.md, CLAUDE.md, .cursor/rules, SKILL.md, and Copilot instructions all do the same job differen...

18. [AGENTS.md for Codex CLI (2026) - CodeGateway](https://www.codegateway.dev/en/blog/agents-md-playbook-2026) - AGENTS.md tells Codex CLI your project's rules. Get the exact lookup order, the 32 KiB limit, the AG...

19. [agents.md vs cursor rules — what goes where in 2026 | MDSwap](https://www.mdfile.exchange/compare/agents-md-vs-cursor-rules) - The differences between agents.md and .cursorrules: where each loads, when each runs, which tools re...

20. [Devin June '24 Product Update](https://cognition.com/blog/june-24-product-update) - We’ve been working closely with a diverse range of companies and developers to make Devin a more col...

21. [Devin September '24 Product Update](https://cognition.com/blog/sept-24-product-update) - Devin is now faster, more accurate with code edits, more reliable at following your instructions, an...

22. [How Cognition Uses Devin to Build Devin](https://cognition.com/blog/how-cognition-uses-devin-to-build-devin) - Devin is a cloud agent platform for engineering teams. You work with it like a teammate — give it ta...

23. [74% of AI Agent Rollouts Failed — Operator Lessons](https://demg.ai/blog/74-percent-enterprise-ai-agent-rollouts-failed-operator-lesson/) - 74% of enterprises rolled back AI agent deployments. Owner-operators can avoid the same mistakes wit...

24. [Why 74% of Companies Are Pulling Their AI Agents After Deploying ...](https://aintelligencehub.com/articles/ai-agent-rollbacks-2026) - Sinch surveyed 2,527 decision makers across 10 countries and found 74% of enterprises already rolled...

25. [Why AI Agents Fail in Enterprise: 5 Reasons in 2026](https://coommit.com/blog/why-ai-agents-fail-enterprise-2026) - New 2026 data shows why AI agents fail in enterprise rollouts — Gartner predicts 40% will be cancele...

26. [40% of Agentic AI Projects Will Be Cancelled by 2027](https://agentmarketcap.ai/blog/2026/04/11/agentic-ai-project-failure-rate-enterprise-deployments) - Gartner predicts 40%+ of agentic AI projects will be cancelled by 2027. Here's the anatomy of failur...

27. [AI Agent Failure-Mode Statistics 2026](https://presenc.ai/research/ai-agent-failure-mode-statistics-2026) - Why AI agent pilots stall in 2026: failure-mode decomposition (memory, tool error, hallucinated stat...

28. [The 2026 AI Agent Reality Check: Why 88% of Enterprise Agents ...](https://agentmarketcap.ai/blog/2026/04/11/ai-agent-reality-check-hype-to-production-gap-2026) - Gartner predicts 40%+ of agentic AI projects will be canceled by 2027. We break down exactly why age...

29. [Harvey AI Scales Legal Knowledge 10x With Autonomous Agent ...](https://www.mexc.com/en-PH/news/622377) - Legal AI startup Harvey expands from 6 to 60+ jurisdictions using autonomous agents, processing 400+...

30. [Using Agents to Scale Harvey's Knowledge Sources](https://www.harvey.ai/blog/using-agents-to-scale-harveys-knowledge-sources) - How we built an autonomous pipeline of AI agents to scale our knowledge sources from six to 60+ juri...

31. [Bret Taylor of Sierra on AI agents, outcome-based pricing, and the OpenAI board](https://www.youtube.com/watch?v=n4E4xNYCkYM) - Bret Taylor, co-founder of Sierra and Chair of the OpenAI board, joins John for a pint to discuss th...

32. [Architecting Agentforce](https://www.youtube.com/watch?v=lIhGltzEmc4) - Salesforce Agentforce replaces rigid, rule-based chatbots with an autonomous, native orchestration f...

33. [Trust and Agentforce](https://help.salesforce.com/s/articleView?id=sf.copilot_trust.htm&language=en_US&type=5) - With Salesforce, it’s easy to build safe AI agents because agents are designed to help mitigate the ...

34. [What is the Einstein Trust Layer? | Salesforce Hulk](https://www.youtube.com/watch?v=E7GdAMs-Ga4) - What is the point of using AI agents if you can't trust them with your data?

That is the exact prob...

35. [Salesforce Agentforce & Agent Script Guide (2026) - Lanverse](https://lanverse.in/blog/salesforce-agentforce-agent-script-guide-2026-architecture-career-roadmap) - The Einstein Trust Layer is described by Salesforce as a secure AI architecture natively built into ...

36. [Sierra Secures $950M at $15B Valuation to Become ...](https://theaiinsider.tech/2026/05/05/sierra-secures-950m-at-15b-valuation-to-become-global-standard-for-ai-customer-agents/) - Sierra, the enterprise AI agent platform founded by Bret Taylor, is raising $950 million led by Tige...

37. [How Sierra makes AI agents reliable | Bret Taylor posted on the topic](https://www.linkedin.com/posts/brettaylor_the-agent-development-life-cycle-activity-7203536476897243137-r56s) - AI agents break all the rules we’ve come to expect from software. With large language models, we've ...

38. [Salesforce Einstein Trust Layer: The | SF Dictionary](https://salesforcedictionary.com/blogs/salesforce-einstein-trust-layer-complete-2026-guide) - Salesforce Einstein Trust Layer: The Complete 2026 Guide to Secure AI. How the prompt journey, data ...

39. [Get Started | Agentforce Developer Guide | Salesforce Developers](https://developer.salesforce.com/docs/ai/agentforce/guide/get-started.html) - Agentforce is the agent-driven layer of the Salesforce Platform, and it helps you deploy AI agents t...

40. [Hebbia's Edge: Building a System of Record for Enterprise ...](https://medium.com/@takafumi.endo/hebbias-edge-building-a-system-of-record-for-enterprise-reasoning-1264ab76ec6b) - Why Hebbia leads finance AI: Matrix turns diligence into a system of record with agentic orchestrati...

41. [What Glean's Knowledge Graph Approach Reveals About ...](https://rmax.ai/notes/enterprise-ai-agents-knowledge-layer-beyond-rag/) - An analysis of Glean's knowledge graph approach to enterprise AI search, and what it reveals about r...

42. [Introducing Agent Skills Registry in TrueFoundry](https://www.truefoundry.com/blog/introducing-skills-registry-reusable-agent-skills-for-production-ai-systems) - Skills Registry replaces duplicated prompt logic with reusable, governed Skills that agents can dyna...

43. [Prompt Governance — Agent Skill for Codex & OpenClaw](https://alirezarezvani.github.io/claude-skills/skills/engineering/prompt-governance/) - Use when managing prompts in production at scale: versioning prompts, running A/B tests on prompts, ...

44. [github — Claude Code Skills by Author | ClaudSkills](https://claudskills.com/author/github/) - 99 Claude Code skills authored by github. Browse SKILL.md files, install with one command, free to i...

45. [progressive-metadata - Skill | Smithery](https://smithery.ai/skills/dredd-us/progressive-metadata) - Pattern for creating skills with YAML frontmatter that enables progressive disclosure and token opti...

46. [TrueFoundry Skills Registry | Reusable, Versioned Agent Skills](https://www.truefoundry.com/agent-skills-registry) - Centralize reusable Agent Skills across every AI agent. Reduce prompt duplication, lower token costs...

47. [The AI agent that thinks like Jensen Huang, Elon Musk, and Dario ...](https://www.the-ai-corner.com/p/founder-mental-models-ai-agent-claude-chatgpt-openclaw-2026) - Full system prompts for Claude, ChatGPT, and OpenClaw. The mental models of the best founders in the...

48. [5 ChatGPT Prompts To Clone Your CEO Brain And Grow your Business](https://www.forbes.com/sites/jodiecook/2025/07/18/5-chatgpt-prompts-to-clone-your-ceo-brain-and-scale-your-business/) - Clone your CEO decision-making with 5 ChatGPT prompts. Scale your thinking while keeping human eleme...

49. [How to Use AI to Clone Yourself in Your Business](https://www.youtube.com/watch?v=Hub6WLVVoGc) - In this episode of the Ecomm Breakthrough Podcast, host Josh Hadley shares his "10x AI SOP Method" f...

50. [How to Build a Personal AI Chief of Staff (Your 24/7 Thinking Partner)](https://www.youtube.com/watch?v=068MSKKU7gM) - 🧠 A trusted Chief of Staff — someone who challenges your thinking, has no political agenda, and is a...

