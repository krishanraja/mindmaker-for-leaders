# Part 1: Persistent Memory in Production AI Agent Systems

## Three findings that should change how you build

1. Every serious 2025-2026 memory framework converges on the same taxonomy (semantic, episodic, procedural, working) but implements it with completely different storage substrates, and the taxonomy is load bearing only in LangMem, where procedural memory literally rewrites the system prompt. In Letta, Mem0 and Zep the taxonomy is descriptive labelling over what is functionally a single write/retrieve pipeline.[^1][^2]
2. Context rot is not a "long context" problem you can budget around by upgrading models. Chroma's 2026 study of 18 frontier models found accuracy floors falling 7.9% from length alone with distractors masked, and a "death zone" at positions 5-15 of 20 documents where accuracy drops 30+ points regardless of window size. Anthropic's own context editing feature exists specifically because model providers accept this cannot be architected away, only mitigated by clearing tool-call history.[^3][^4][^5]
3. Memory poisoning is empirically severe, not theoretical: MINJA-class attacks achieve over 95% injection success and up to 89% attacker-intended downstream action rates once retrieved, and realistic production conditions (pre-existing legitimate memory) only "dramatically reduce" rather than eliminate attack effectiveness. Provenance tagging on every write is the only mitigation with any empirical grounding across sources.[^6][^7][^8]

## The open memory frameworks, mechanism by mechanism

### Letta (formerly MemGPT)

Storage substrate: three tiers modeled explicitly on an OS memory hierarchy. Core memory is a set of labeled "blocks" (value, character limit, label, description, read_only flag) rendered as XML directly inside the system prompt context window, functioning as RAM. Recall memory is the full conversation history stored in a database, functioning as a page cache, searchable via `conversation_search`. Archival memory is an external vector or SQL-backed store, functioning as disk, written and read via `archival_memory_insert` / `archival_memory_search` tool calls.[^9][^10][^11]

Taxonomy: not episodic/semantic/procedural. It is a storage-tier taxonomy (RAM/cache/disk), with a `human` block and `persona` block as the canonical two core-memory blocks.[^9]

Write trigger: the LLM itself decides when to call `core_memory_append`, `core_memory_replace`, or `archival_memory_insert` — writes are agent-initiated function calls, not a separate background process.[^10][^12]

Read scope: core memory blocks are always in context (pinned); archival and recall memory are pulled in on demand via explicit tool calls the model issues when it judges it needs them.[^11]

Conflict resolution: none automated. `core_memory_replace` overwrites; there is no built-in contradiction detection — the agent has to notice and act.

Known failure mode: because writes are entirely agent-discretionary, an agent that fails to call the write tool loses the information permanently once it scrolls out of the recall window; there is no fallback capture mechanism documented in the framework itself.

### Mem0

Storage substrate: a two-phase extraction-then-update pipeline. Extraction pulls candidate facts from a message pair using a conversation summary plus a recency window of prior messages as context. Update then retrieves the top-s semantically similar existing memories via vector embeddings and presents both to the LLM through a function-calling interface, letting the model choose one of four operations per fact: ADD, UPDATE, DELETE, or NOOP. A graph variant (Mem0^g) additionally represents memories as a directed labeled graph with entities as nodes and relationships as edges, adding roughly 2% overall score versus base Mem0 on internal evaluation.[^13]

Taxonomy: implicit only — Mem0 does not enforce episodic/semantic/procedural distinctions; it treats "memory" as a single fact store, with structure emerging only in the graph variant.

Write trigger: automatic, after every message pair, driven by the extraction pipeline, not the agent's discretion.

Conflict resolution: explicit LLM-mediated arbitration — the model is shown the candidate fact next to its nearest existing neighbors and asked to pick ADD/UPDATE/DELETE/NOOP, making conflict resolution a first-class, auditable step rather than an accident of overwrite.[^13]

Demonstrated benchmark numbers: Mem0 reports 92.5% overall on LoCoMo (91.2% single-hop, 91.3% multi-hop, 72.7% open-domain, 92.0% temporal, mean 6,956 tokens) and 94.4% overall on LongMemEval (98.6% single-session user, 88.0% multi-session, mean 6,787 tokens). These are vendor-published, not independently replicated in the material found; treat as CLAIMED pending third-party audit.[^14]

### Zep and Graphiti

Storage substrate: a bi-temporal, dynamic knowledge graph with three hierarchical subgraphs — an episode subgraph (raw input, non-lossy, formatted as messages/text/JSON), a semantic entity subgraph (entities derived from episodes, linked by semantic edges), and a community subgraph (clusters of strongly connected entities with summaries). The bi-temporal model tracks two independent timelines: T (when the event happened) and T′ (when the data was ingested), enabling the system to represent both current state and historical evolution of a fact.[^15][^9]

Taxonomy: explicitly modeled on the episodic/semantic split from cognitive science — episode subgraph maps to episodic memory, entity subgraph maps to semantic memory.[^15]

Write trigger: fact extraction runs on ingestion of new episodes; Graphiti extracts temporal validity ranges for facts (absolute timestamps like "born June 23, 1912" and relative timestamps like "two weeks ago") and manages "edge invalidation" — when a new fact contradicts an old one, the old edge is marked invalid with an end-of-validity timestamp rather than deleted.[^16][^15]

Conflict resolution: temporal invalidation, not overwrite — this is the most sophisticated built-in mechanism found across all frameworks reviewed, because it preserves history for audit while updating what is "currently true."

Demonstrated benchmark numbers (vendor-published): 94.7% accuracy on LoCoMo (1,459/1,540 correct, 155ms retrieval latency) and 90.2% on LongMemEval (451/500 correct, 104-162ms p50/p95 latency, 4,408 median tokens per query). Zep also claims to "surpass MemGPT" on Deep Memory Retrieval in the original paper  — this is a first-party claim from the paper's authors and should be read as CLAIMED, cross-validated against the independently-run LiCoMemory comparison below.[^17][^18]

### LangMem

Storage substrate: layered on top of LangGraph's persistent `Store` interface (pluggable — MongoDB, Postgres/pgvector, in-memory), namespaced by user_id/team_id/app_id to prevent cross-contamination. This is the only framework among those reviewed that formally implements procedural memory as a distinct write path.[^19]

Taxonomy: semantic (facts, via `create_manage_memory_tool` / `create_search_memory_tool`, LLM autonomously decides to store/search), episodic (distilled experience summaries, e.g. "last time the agent solved X by doing Y," extracted in the background via `ReflectionExecutor` so extraction doesn't add latency to the live turn), and procedural (the agent's own system prompt gets rewritten via `create_prompt_optimizer`, incorporating accumulated feedback).[^20][^21][^22][^23][^24]

Write trigger: two modes — "hot path" (immediate, in-turn, affects latency) and background (post-conversation, no latency cost, used for episodic distillation and prompt optimization).[^20]

This is the single clearest case in the corpus where the taxonomy is load-bearing rather than decorative: procedural memory in LangMem literally mutates the system prompt text used on the next turn, which is functionally different from writing a fact to a lookup table. No other framework reviewed does this.

### Cognee and A-MEM

A-MEM ("Agentic Memory for LLM Agents") explicitly borrows the Zettelkasten note-linking method from personal knowledge management: instead of a fixed memory schema, the system dynamically creates interconnected "memory notes" with LLM-generated context, keywords, and tags, and links new notes to related existing notes through dynamic indexing rather than predefined categories. This is architecturally distinct from Letta/Mem0/Zep because there is no fixed taxonomy at all — organization emerges from the linking process. Comparative benchmarking in third-party work (LiCoMemory) places A-MEM behind graph and fact-extraction baselines including Mem0 and Zep on both LoCoMo and LongMemEval, which is a DEMONSTRATED (third-party replicated) result, not a vendor claim.[^25][^26]

Cognee did not surface strong first-party mechanism documentation in this research pass; treat its architecture claims (graph+vector hybrid "semantic memory layer") as under-evidenced relative to Letta, Mem0, Zep and LangMem, all four of which have either a published paper with reproducible pipeline detail or an open-source repo with inspectable code.

### Newer 2026 entrants and comparison research

LiCoMemory (Nov 2025) is a third-party hierarchical graph-plus-fact-extraction system that outperforms Mem0, Zep, A-MEM and LoCoMo-RAG baselines on both benchmarks, achieving 73.8% accuracy / 76.6% recall on LongMemEval with a GPT-4o-mini backbone and reducing latency 10-40%, with the largest margins in multi-session (+26.6pp) and temporal (+15.9pp) subsets. This is a DEMONSTRATED, independently-benchmarked comparison and is more trustworthy evidence than any single vendor's self-reported number, because it evaluates multiple systems under identical conditions.[^25]

ENGRAM-R (Nov 2025) reduces input token budget by 95.5% and reasoning tokens by 77.8% while improving accuracy by +21.8pp overall on LongMemEval-S, with the largest gains in multi-session (+30.1pp) and temporal (+13.5pp) subsets — again a research result, not a vendor claim.[^25]

## Framework comparison table

| System | Storage substrate | Write trigger | Conflict resolution | Failure mode |
|---|---|---|---|---|
| Letta/MemGPT | Blocks in-context (RAM) + DB (recall) + vector/SQL (archival) | Agent-initiated tool call | None automated; manual replace | Silent loss if agent skips write tool [^9][^10] |
| Mem0 | Fact store + optional entity/relation graph | Automatic after every message pair | LLM chooses ADD/UPDATE/DELETE/NOOP per fact vs. nearest neighbors | Vendor-only benchmark numbers, unreplicated [^13][^14] |
| Zep/Graphiti | Bi-temporal knowledge graph, 3 subgraphs | Fact extraction on episode ingestion | Temporal edge invalidation (old fact marked invalid, not deleted) | Vendor DMR claim vs. MemGPT unreplicated [^15][^17] |
| LangMem | LangGraph Store (pluggable DB) | Hot-path (live) or background (reflection) | Not specified; procedural memory literally rewrites prompt | Requires LangGraph stack; procedural drift risk if optimizer overfits recent feedback [^20][^19] |
| A-MEM | Zettelkasten-style linked notes, no fixed schema | Agent/LLM generates notes and links dynamically | Emergent via linking, not explicit | Underperforms Mem0/Zep on third-party LiCoMemory comparison [^25][^26] |

## Is the episodic/semantic/procedural distinction load bearing or decorative?

Mostly decorative as a label, load bearing only where it changes what gets written and how it is retrieved. LangChain's own documentation admits the taxonomy is borrowed straight from cognitive psychology and cognitively maps procedural memory in AI systems to "a combination of model weights, agent code, and agent's prompt"  — a definition broad enough to be almost unfalsifiable. Where the distinction demonstrably changes behavior: LangMem's procedural memory rewrites the system prompt (behavior change is measurable — the agent literally follows different instructions after enough feedback); Zep's episode-vs-entity subgraph split changes what is queried for "what happened" versus "what is currently true" questions, which is measurably different retrieval behavior, not just labeling. Where it is decorative: Mem0 calls its output "memory" without formal episodic/semantic separation, and most systems reviewed store everything in one fact table regardless of taxonomy claims in marketing copy.[^27][^19][^15][^20]

## Anthropic's own memory surface

The memory tool (`memory_20250818`) is a Messages API tool, generally available on all Claude 4+ models, requiring no beta header. It is explicitly file-based: Claude issues `view`, `create`, `str_replace`, `insert`, `delete`, and `rename` commands against files in a `/memories` directory that your application implements client-side — Anthropic does not host the storage. The documentation is explicit that the developer's handler "must reject paths outside /memories," making path traversal the primary security surface named in the docs themselves. Anthropic's own cookbook recommends starting with a single memory file for patterns, setting context editing triggers at 30-40k tokens for production, and implementing per-project memory isolation to prevent cross-contamination.[^28][^29]

Context editing (`clear_tool_uses_20250919`) is a separate, coarser mechanism configured via a `context_management` parameter with `trigger.type`/`trigger.value` (e.g. input_tokens > 30,000), `keep.type`/`keep.value` (e.g. keep last 3 tool uses), and `clear_at_least` (minimum tokens freed). It runs server-side, before the prompt reaches Claude, and the client retains the full unedited history locally so nothing is permanently lost — only the context sent to the model shrinks. The response returns `applied_edits` and `skipped_edits` fields for auditability.[^30][^4]

Agent Skills are explicitly framed, including by third-party academic analysis, as a form of procedural memory: "a lightweight, open, and composable mechanism for equipping LLM-powered agents with domain-specific procedural capabilities that can be reused across tasks". Mechanistically, a Skill is a folder with a mandatory `SKILL.md` file (YAML frontmatter with `name` and `description`, Markdown body with instructions) plus optional `scripts/`, `references/`, `templates/`. Loading uses progressive disclosure: at session start Claude only sees lightweight metadata (name + description) for every skill; the full SKILL.md body enters context only when a task matches the description and Claude reads the file via bash; any further referenced files (FORMS.md, schemas) are read on demand. A third-party paper frames skill documents as satisfying a specific evidentiary bar for "layer 3" procedural memory because they contain not just steps but pitfalls discovered through live debugging — "information that no amount of prompt engineering can produce, because it comes from experience".[^31][^32][^33][^34]

On context engineering versus prompt engineering: Anthropic's engineering blog (paraphrased via a secondary source, original not independently confirmed in full in this pass) frames context engineering as "a continuous process of integrally managing all information elements, including system instructions, tools, external data, and conversation history" across a multi-turn session, contrasted with prompt engineering's "discrete task of optimizing instructions for individual tasks". Treat the exact wording as a paraphrase pending direct verification against the primary Anthropic post; the distinction itself (continuous curation of a shifting information budget versus one-shot instruction tuning) is corroborated across multiple secondary sources describing the same Anthropic post.[^35]

## The file-as-memory pattern

CLAUDE.md, AGENTS.md, and Cursor/Windsurf rules represent a deliberate rejection of embeddings for a large class of "memory" that is really standing instructions rather than retrieved facts. AGENTS.md is now stewarded by the Agentic AI Foundation under the Linux Foundation (since December 9, 2025) and is read natively by Codex, Cursor, GitHub Copilot's coding agent, Windsurf, Amp, Aider, Gemini CLI, Zed, Jules, Devin, and Junie. Claude Code is the documented holdout — it reads CLAUDE.md only, and Anthropic's own docs recommend `@AGENTS.md` import syntax or a symlink as the bridge. Adoption claims for AGENTS.md range from "20,000+" to "60,000+" repositories depending on source and date, all self-reported by tooling vendors rather than independently audited — flag as contested/unverified scale claims.[^36][^37][^38]

Mechanism: these are plain Markdown files, schema-free by design ("No. AGENTS.md is just standard Markdown. Use any headings you like; the agent simply parses the text you provide" — verbatim from the agents.md FAQ). Nested files are supported; the nearest file to the edited path wins on conflict in every tool surveyed. Claude Code specifically walks up the directory tree concatenating every CLAUDE.md and CLAUDE.local.md found, with files closer to the working directory loading last (highest priority), and supports `@path/to/file.md` imports up to 5 hops recursive. Cursor's modern format (`.mdc` files in `.cursor/rules/`) adds YAML frontmatter fields absent from plain Markdown: `description`, `globs` (file-pattern scoping), and `alwaysApply`, enabling four distinct activation modes (always, auto-attached by glob, agent-requested by description match, manual @-mention). Windsurf's equivalent (`.windsurfrules` project-level, `global_rules.md` global-level) enforces a hard 6,000-character limit per rule file and a combined 12,000-character cap across global+workspace rules, with global rules winning priority when the combined limit is exceeded and excess content silently truncated  — this is a concrete, quotable engineering constraint practitioners should design around, not assume away.[^39][^40][^37][^41][^42][^36]

Why files over embeddings: files are diffable, reviewable in pull requests, version-controlled with git blame, and human-auditable in a way vector stores are not. One practitioner guide states plainly: "Keep CLAUDE.md under 200 lines per file for reliable adherence"  — this is folk wisdom/practitioner consensus, not a benchmarked claim, and should be flagged as such; no source in this research quantified the adherence-versus-length curve empirically. What breaks: monolithic CLAUDE.md/AGENTS.md files drift out of sync with reality as codebases evolve (no automated staleness detection exists in any tool surveyed); teams manage this by keeping root files short and pushing detail into skills or `.claude/rules/*.md` files with `paths:` frontmatter that lazy-load only when Claude touches matching files.[^43]

## Benchmarks: LOCOMO and LongMemEval, and what the numbers actually show

LoCoMo (Snap/Stanford) tests single-hop, multi-hop, open-domain, and temporal memory recall across long conversational sessions. LongMemEval (Wu et al.) is a 500-question benchmark structured around five core abilities: information extraction, multi-session reasoning, knowledge updates, temporal reasoning, and abstention (knowing what you don't know).[^2][^14]

Cross-vendor comparison, all self-reported unless noted:

| System | LoCoMo overall | LongMemEval overall | Independently replicated? |
|---|---|---|---|
| Mem0 | 92.5% | 94.4% | No — vendor docs only [^14] |
| Zep/Graphiti | 94.7% | 90.2% | No — vendor research page only [^18] |
| Claude Sonnet 4.6 (raw, no framework) | — | 90.19% (1,389/1,540 correct on a related eval) | Third-party paper, single research group [^23] |
| LiCoMemory (research system) | outperforms Mem0/Zep/A-MEM/LoCoMo-RAG | 73.8% acc / 76.6% recall (GPT-4o-mini) | Yes — direct head-to-head against 4 named baselines [^25] |
| Full-context LLM (no memory system, baseline) | ~30-37% | ~38-40% | Third-party synthesis across multiple papers [^1] |

Where published claims fail to replicate: LiCoMemory's controlled head-to-head places A-MEM behind Mem0 and Zep, which directly contradicts any implicit claim from A-MEM's own paper that Zettelkasten-style linking is competitive with fixed-schema graph systems — a genuine case of vendor-adjacent claims not surviving third-party comparison. Separately, a 2026 large-scale LLM-as-judge audit (541,000 judgments across 21 judges) found "kappa deflation" of 33-41 percentage points between raw exact-match agreement and Cohen's kappa on MT-Bench — meaning headline "agreement" numbers reported by many benchmark papers substantially overstate true inter-rater reliability once chance agreement is controlled for. This is directly relevant to any memory-system benchmark that uses an LLM judge to score recall accuracy, which most of the above do.[^44][^26][^25]

## Failure modes at scale: primary evidence, not theory

Context rot (Chroma Research, 2025-2026, 18 frontier models, ~194,480 total LLM calls across 8 input lengths and 11 needle positions): every model tested degraded with length, including 1M-token-window models past roughly 200K tokens of actual use. Accuracy fell 30+ percentage points when the relevant fact sat in positions 5-15 of a 20-document context (the "death zone"), and even with distractor content masked out, a length-only floor still dropped accuracy 7.9% on average. In short contexts accuracy exceeded 90%; once context exceeded roughly 32,000 tokens, accuracy dropped sharply, and interference compounds — one irrelevant document degrades performance, four compound multiplicatively. This is a mechanism, not folk wisdom: it is a directly measured, published, 18-model empirical study with a public methodology (research.trychroma.com/context-rot).[^45][^3]

Lost-in-the-middle (Liu et al., TACL 2024, originally a 2023 Stanford preprint) is the underlying structural cause: transformers attend reliably to the start and end of context and poorly to the middle, producing a U-shaped accuracy curve as a function of position. A 2025 mechanistic-interpretability paper (Wu et al.) argues this is structural to causal masking itself, not an artifact of any particular training regime.[^46][^3][^45]

Memory poisoning: MINJA (Memory Injection Attack) achieves over 95% injection success rate and roughly 70% attack success rate under idealized lab conditions. A follow-up 2026 EHR-agent study found realistic production conditions — where an agent already has substantial pre-existing legitimate memory — "dramatically reduce" but do not eliminate attack effectiveness, and found that effective sanitization requires careful trust-threshold calibration: too conservative and you block all legitimate entries, too permissive and you miss subtle attacks. "Sleeper memory poisoning" (2026) demonstrates delayed attacks that inject via an external document or webpage during one session and only activate in a later, unrelated conversation, with injection rates of 97-99.8% across GPT-5.5 and Kimi-K2.6, and 60-89% of successful retrievals causing attacker-intended agentic actions. OWASP has formally classified this as ASI06 in its 2026 agentic-risk taxonomy. The concrete engineering mitigations named across multiple sources, in order of maturity: provenance tagging on every write (source, timestamp, session, trust score); partitioning memory by trust level (read-only system partition for verified policy, isolated per-user partitions elsewhere, so a poisoned memory in one user's session cannot bleed into another's); temporal decay so unvalidated old memories carry less retrieval weight than recently-reinforced ones, while critical verified memories are exempted from decay; and quarantine-not-delete on detection, to preserve forensic evidence.[^21][^22][^47][^7][^8][^6]

Note the folk-wisdom flag here: many of the mitigation writeups (christian-schneider.net, workos.com, nhimg.org) are practitioner blog posts synthesizing the academic literature rather than themselves being empirical studies. The underlying attack numbers (MINJA, sleeper poisoning) are from arXiv papers and should be trusted more than the specific mitigation percentages, which are largely unquantified recommendations.

## Multi-user and organizational memory: the permission line in practice

The clearest documented pattern across sources is a hard partition between system/organizational memory and user-scoped memory, with asymmetric write permission: "System memories (tool configurations, organizational policies, verified facts) should be stored in a read-only partition that agents can query but never modify. Changes to system memory require human review" while "User-scoped memories (preferences, conversation history, task context) should be isolated per user. Agent A's memories about User X should not be accessible when Agent A is working with User Y". LangMem implements this concretely via namespacing by `user_id`, `team_id`, or `app_id` at the storage layer, which is the only framework reviewed with a built-in multi-tenant primitive rather than a design recommendation. No source in this research described a published, audited real-world deployment (e.g., a named company's engineering postmortem) of this exact permission model at the scale of a 40-person org — this is a gap; the pattern is consistently recommended in security/architecture writeups but not demonstrated in a public case study with metrics.[^22][^19]

***

# Part 2: Encoding Expert Judgment, Taste, and Tacit Standards

## Three findings that should most change how you build

1. The Critical Decision Method (CDM) is a mature, 35+ year old cognitive task analysis protocol with a fully specified four-to-six-stage interview structure (incident selection, incident recall, incident retelling, timeline/decision-point verification, "what-if" probes) that has never, in the literature surfaced here, been explicitly published as a pipeline for building LLM prompts or rubrics. This is a genuine, exploitable gap: the method exists, is well-documented, and nobody has written the "CDM-to-rubric" paper yet.[^48][^49][^50]
2. Rubric-based LLM-as-judge is not inherently pointwise — a 2026 paper demonstrates it behaves as an implicit multi-choice problem with measurable position bias (primacy bias reaching 30-39% selection rate at the first position for smaller judge models versus an unbiased 20%), and a permutation-based calibration method recovers meaningful correlation gains with human judgment. Separately, a large-scale 2026 audit (541,000 judgments, 21 judges) found kappa deflation of 33-41 percentage points between raw agreement and true chance-corrected agreement — meaning most reported "judge accuracy" numbers in the literature are inflated.[^51][^52][^44]
3. The evidence on critique-versus-generation is genuinely mixed and contradicts the common assumption that evaluation is strictly easier than production. A controlled 2026 study found generation accuracy exceeded self-evaluation accuracy on three of four benchmarks, with attention analysis showing the evaluation task attends to context 3-5x less than generation and "barely reads the candidate answer". This directly undercuts the design assumption that a weaker/cheaper model can reliably grade a stronger model's output.[^53]

## Knowledge elicitation methods: the deepest question, treated in full

### Critical Decision Method (Klein, Calderwood, MacGregor 1989; Hoffman, Crandall, Shadbolt 1998)

What it produces: a structured, multi-pass retrospective account of a single real incident where the expert's decision-making mattered, built through repeated "sweeps" through the same event rather than generic "tell me your process" questions, which the literature explicitly says fail with experts because tacit knowledge is not consciously accessible on demand.[^49][^50]

Procedure, verbatim structure from the IHMC protocol document: "Step One: Incident Selection... The opening query poses a particular type of event or situation and asks for an example where the experts' decision making altered the outcome". "Step Two: Incident Recall... The participant is asked to recount the episode in its entirety... The elicitor asks few, if any, questions." "Step Three: Incident Retelling." "Step Four: Timeline Verification and Decision Point Identification... A timeline is composed along a domain-meaningful temporal scale." "Step Six: 'What if?' Queries... The elicitor poses various hypothetical changes to the incident account and asks the participant to speculate". A separate ergonomics-society writeup confirms the canonical four-stage version (Crandall et al. 2006): brief account, refined timeline with key events/segments, perceptions/judgments/uncertainties as the event unfolded, and hypothetical/probing questions.[^50][^49]

How long it takes: not quantified precisely in sources found, but the multi-pass structure and requirement for "a diverse team of interviewers"  implies this is a multi-hour, skilled-facilitator exercise per incident, not a quick survey.[^49]

Published LLM application: none found. This is the gap called out above — CDM is the single most rigorous incident-based expertise-elicitation method in the cognitive-task-analysis literature, and no paper surfaced in this research applies it directly to constructing an LLM rubric, skill, or system prompt. The closest adjacent work uses LLM multi-agent simulation to derive weights via the Best-Worst Method, which is a different (preference-ranking rather than incident-retrospection) elicitation technique, and one paper explicitly frames it as a way to avoid recruiting human experts at all rather than eliciting from them.[^54]

### Repertory Grid Technique (Kelly's Personal Construct Psychology, 1955)

What it produces: a matrix (the "grid") of elements (e.g., past client engagements, decision scenarios, competitor products) rated against constructs (bipolar dimensions the expert uses to differentiate them, elicited by triadic comparison — "in what way are two of these three alike and different from the third"). The canonical elicitation procedure: "Constructs are elicited by asking the interviewee to consider them 3 at a time, and to identify two of the three that have something in common in contrast to the third. The attribute they have in common is written down as the emergent pole, and the attribute that characterizes the third... is written down alongside — the implicit pole". Procedure runs four phases: Design (agree a Topic), Administration (elicit Elements, then Constructs via triads, then rate each element 1-7 on each construct), Mathematical Analysis, Interpretation.[^55][^56][^57][^58]

How long it takes: the technique has been used in roughly 3,000 published studies across clinical, educational, and consumer-preference domains, suggesting it is tractable for a single practitioner session, though exact timing was not quantified in sources found.[^59]

Published LLM application: none found directly. This is a second clear gap — Repertory Grid is arguably the single best-fit knowledge elicitation method for a leadership-training consultancy's use case (surfacing the bipolar constructs a senior facilitator uses to differentiate "good" from "bad" client interventions) and it has not been published as an LLM-rubric-construction pipeline in the literature surveyed.

### Cognitive Task Analysis (CTA) and Applied CTA more broadly

CTA is described as "the process of identifying the mental processes and skills, and the amount of practice, needed to perform a task proficiently," with methods "evolving over the past two decades" as of the Handbook of Human Factors chapter cited here. Applied CTA specifically adds a "Review Domain" preparatory step (job descriptions, manuals, performance data) before conducting elicitation interviews, and the IHMC protocol document frames CDM as one specific method within the broader CTA family. No published LLM-rubric application found for the general CTA family beyond the tangential LLM-simulation-of-experts papers already noted, which substitute LLM agents for human experts rather than extracting real human expertise.[^60][^50]

### Laddering, and think-aloud protocol analysis

These were named in the query but did not surface dedicated primary-source coverage in this research pass distinct from the Repertory Grid and CDM material above; flag as a genuine research gap rather than smoothing over — laddering (a technique for eliciting means-end value chains, often paired with Repertory Grid in marketing research) and think-aloud protocols (concurrent verbalization during task performance, the classic Ericsson & Simon method) are both established cognitive-science techniques, but no 2025-2026 paper applying either specifically to LLM system construction was found in the searches conducted. This should be treated as an evidence gap in the corpus, not as evidence the application doesn't exist.

## Rubric engineering and LLM-as-judge: state of the art

Pointwise versus pairwise: a 2026 rubric-generation paper reports human agreement of 71.65-81.62% for pairwise evaluation and Spearman/Pearson correlations of roughly 0.438-0.496 for pointwise evaluation across baselines, with a training-free rubric generator outperforming existing baselines in both settings; notably, joint training on both objectives simultaneously degrades pairwise performance (70.09→68.85 on AlpacaEval, 82.14→81.41 on MT-Bench) while only marginally improving pointwise performance — evidence that pairwise and pointwise judging are not simply interchangeable skills for a single trained judge model.[^61]

Position bias in rubric-based judging: the 2026 "Am I More Pointwise or Pairwise?" paper is the most mechanism-rich source found. It shows rubric-based evaluation (an LLM picking a score from a list) implicitly behaves like a multiple-choice question and inherits primacy/recency bias: smaller judge models (Qwen3-8B) select the first-listed score option 30-39% of the time versus an unbiased expectation of 20%, while larger models (GPT-4.1, GPT-OSS-120B) show distributions closer to 20% [^51][^52]. The proposed mitigation, "balanced permutation," generates 10 complementary cyclic orderings of a 5-point rubric so each score appears exactly twice at each position, then averages scores across permutations; this improved Spearman correlation with human judgment by up to +0.089 for the most biased model tested (Qwen3-32B on HANNA) [^52]. The paper also defines a quotable formalism for a practitioner: Bias Cost of a permutation π is the sum over positions p of |P(p|π_p) − 0.2|, where 0.2 is the ideal per-position selection probability under no bias for a 5-point scale [^52] — orderings with lower Bias Cost reliably ranked in the top half by correlation with human judgment, giving a concrete, annotation-free way to pick a good rubric ordering without ground truth.

Agreement with human raters, at scale: a 2026 large-scale audit (21 judges from 9 providers, MT-Bench/JudgeBench/RewardBench, 3 protocols, 118 runs, ~541,000 individual judgments) reports four findings that should discipline any practitioner claim about judge reliability: (1) kappa deflation between exact-match and Cohen's kappa is universal, 33-41 percentage points on MT-Bench; (2) judge rankings shift by up to 14 positions depending on which benchmark is used to rank them; (3) high test-retest reliability (>0.95) can coexist with severe position bias (>0.10) in the same production-deployed judge — a "consistency-bias paradox," meaning a judge can be highly repeatable and still be systematically wrong in a fixed direction; (4) verbosity bias was small (<0.011) across the cohort under a single pairwise rubric, and position bias ranged almost two orders of magnitude across models, from Gemini 2.5 Pro (0.002) to Qwen3 8B (0.192). This is the strongest single piece of evidence in this corpus that judge quality must be measured per-model and per-benchmark rather than assumed from a single reported number.[^44]

Known failure modes and mitigations, synthesized: position bias (mitigated by permutation averaging ), self-preference bias (not independently verified with fresh primary sources in this pass — treat prior literature consensus as carried forward, flag as needing direct citation if used verbatim), verbosity bias (measured small in the 2026 large-scale audit under the tested rubric, contradicting some earlier literature that treated it as dominant — this is a genuine point of disagreement in the field worth flagging rather than resolving), and rubric-ordering sensitivity generally (directly demonstrated and quantified ).[^52][^51][^44]

## Constitutional AI and RLAIF as taste encoding

Anthropic published a new, 79-80 page Claude constitution on January 21-22, 2026, replacing the 2023 version, under CC0 (public domain) license. Mechanism: the document establishes a strict four-tier priority hierarchy — "1. Broadly safe: not undermining appropriate human mechanisms to oversee the dispositions and actions of AI... 2. Broadly ethical: having good personal values, being honest, and avoiding actions that are inappropriately dangerous or harmful. 3. Compliant with Anthropic's guidelines... 4. Genuinely helpful" — and states explicitly, verbatim: "In cases of apparent conflict, Claude should generally prioritize these properties in the order in which they are listed". It distinguishes hard-coded absolute prohibitions (e.g. bioweapons assistance) from "soft coded defaults that operators and users can adjust within defined boundaries".[^62][^63][^64][^65]

A quotable principle from the 2023 version illustrates what "a principle looks like in practice" at the granular level: "Please choose the response that is least dishonest, abusive, harmful, misleading, or in bad-faith, and that is least associated with planning or engaging in any illegal, fraudulent, or manipulative activity". The 2023 Anthropic-authored constitution comprised 58 principles, sourced partly from the UN Universal Declaration of Human Rights and partly from Apple's Terms of Service.[^66][^67]

The critique-and-revise loop (the original Constitutional AI training mechanism) is not restated in full technical detail in the newer sources surveyed, but the underlying method — the model critiques its own draft response against a constitutional principle and revises accordingly, iteratively, before that data is used for further training — is the mechanism named consistently across secondary sources as "Constitutional AI" and remains the branding Anthropic uses for training Claude against this document.[^68][^69]

Collective/organizational constitution experiment: Anthropic's own 2023 "Collective Constitutional AI" experiment sourced principles from public input and produced a 75-principle constitution, compared directly against the 58-principle Anthropic-authored version; a 2026 legal-analysis paper reports this experiment "found roughly 50% divergence between publicly sourced and corporate-authored principles, with the democratic version producing lower bias across nine social dimensions"  — and critically, the same paper argues "the 2026 constitution incorporates none of those findings," i.e., the participatory-constitution learnings were not carried forward into the newer document. This is a contested, critical secondary-source claim (from an SSRN/arXiv legal paper, not from Anthropic) and should be flagged as such rather than treated as settled.[^70][^71]

Independent replication of adherence: a 2026 audit paper ("How Well Do Models Follow Their Constitutions?") decomposed Anthropic's constitution into 205 atomic testable tenets and OpenAI's Model Spec into 197, ran adversarial multi-turn scenarios via the Petri auditing agent plus a modified SURF-style rubric search, and found the Claude family's constitution-violation rate fell from 15.0% (Sonnet 4) to 2.0% (Sonnet 4.6) across generations, while GPT's Model Spec violation rate fell from 11.7% (GPT-4o) to 3.6% (GPT-5.2). This is genuinely DEMONSTRATED, third-party, adversarial-testing evidence rather than a vendor claim, and is one of the strongest data points in this entire corpus for "does writing down principles actually change measured behavior."[^72]

Culture and bias critique: a 2026 arXiv paper administering 55 World Values Survey items found Claude's value profile most closely resembles Northern European and Anglophone country profiles, and that providing users with different cultural context changed Claude's rhetorical framing but not its substantive value positions, with effect sizes "indistinguishable from zero" across all twelve tested countries. For a UK-based leadership training firm, this is directly relevant: the base model's constitutional value profile is already culturally proximate to a UK context, but should not be assumed to adapt meaningfully to non-Anglophone client cultures without explicit organizational scaffolding.[^73]

## Style and voice as executable rules: Vale as the primary worked example

Vale is the best-documented mechanized style system found. Mechanism: rules are individual YAML files inside a `StylesPath` directory; each rule extends one of six check types — `existence` (regex match), `substitution` (banned phrase + suggested replacement), `occurrence` (frequency cap), `repetition`, `consistency` (flags inconsistent spelling variants), `conditional` (pattern A unless pattern B also present) [^74]. A verbatim example substitution rule: `extends: substitution / message: "Use '%s' instead of '%s'." / level: error / swap: '\b(?:e\.g\.|eg\.)[\s,]': "for example"` [^74]. A verbatim passive-voice existence rule: `extends: existence / tokens: - '\b(am|is|are|was|were|be|been|being)\s+\w+ed\b'` [^74]. Styles (folders of related rules, e.g. "Microsoft," "Google," a custom house style) are activated per file-glob in `.vale.ini` via `BasedOnStyles = Microsoft, MyStyle` [^74][^75].

What can be mechanized: banned/preferred word substitution, sentence length, passive voice detection (imperfectly — the regex approach flags many false positives, acknowledged directly in tutorial sources: "Written text is complicated, and Vale will find false positives" ), terminology consistency, vocabulary/dictionary enforcement for product names. What stubbornly cannot be mechanized with this class of tool: tone, argument structure, whether a piece of writing actually persuades, and anything requiring semantic judgment beyond pattern matching — Vale is fundamentally a regex-and-token-count engine, not a semantic critic. The recommended practitioner rollout sequence, verbatim from a 2026 guide: install, create `.vale.ini` with Microsoft + write-good as a starting stack, run `vale sync`, run against real docs and set `MinAlertLevel`, add a vocabulary accept-list for product names, add CI at `warning` level first, watch the first 10 PRs and tune noise, then switch CI to `error` level once noise is gone. This last point — start lenient, tighten only after measuring false-positive rate on real PRs — is the single most actionable, evidence-adjacent (practitioner-consensus rather than benchmarked) piece of guidance found on rolling out any mechanized style system.[^74][^75]

Vale, textlint, and vendor tools (Writer.com, Jasper, Grammarly, Acrolinx) were the named systems in the query; only Vale surfaced with strong primary-source, code-level documentation in this research pass. The vendor brand-voice tools (Writer.com, Jasper, Acrolinx) did not surface engineering-blog-level mechanism detail in the sources found — their marketing claims about "brand voice AI" should be treated as CLAIMED and unverified at the mechanism level absent further research, consistent with the instruction to deprioritize vendor pages that assert results without mechanism.

## Design systems as encoded taste

The W3C Design Tokens Community Group (DTCG) published the first stable specification (2025.10) in October 2025, with contributions from Adobe, Amazon, Google, Microsoft, Meta, and Figma. Mechanism: a token file (`.tokens` or `.tokens.json`, media type `application/design-tokens+json`) is a JSON tree where every token is an object carrying `$value` (required), and optionally `$type`, `$description`, `$extensions`. Tokens reference other tokens via curly-brace aliasing (`"$value": "{color.blue-500}"`), resolved at build time by tools like Style Dictionary. The standard three-layer architecture — primitive (raw values, rarely change, e.g. `blue-600: #0052a3`), semantic (meaning/intent, changes with themes/modes, e.g. `color-primary: {blue-600}`), and component (per-component usage, optional, e.g. `btn-bg: {color-primary}`) — is explicitly designed so an AI coding agent disambiguates by layer: it picks colors from semantic tokens first, only reads primitive tokens to resolve what semantic points to, and reads component tokens only if that layer exists.[^76][^69][^77][^78][^79][^80]

AI-agent-specific extension: DESIGN.md, open-sourced by Google Labs in April 2026, wraps DTCG-format tokens (YAML frontmatter) together with prose rationale below — "tokens give agents exact values, prose tells them why those values exist and how to apply them". This is a direct, published answer to "how do AI agents consume design systems to critique rather than generate": the deterministic token layer lets an agent verify a proposed color against the approved palette (a checkable, mechanical operation), while the prose layer gives it grounds to explain *why* a proposed deviation is wrong, which is closer to critique than to generation. No dedicated academic paper on "AI agents critiquing against design tokens" was found in this pass; the DESIGN.md pattern is the closest practitioner-level evidence, and should be flagged as an emerging (mid-2026) practice rather than an established, benchmarked one.[^81]

## Preference elicitation and alignment to an individual

DPO (Direct Preference Optimization) is the dominant lightweight alignment method surveyed, alongside KTO and lighter few-shot approaches. The most directly relevant finding for "minimum viable dataset to capture one person's standard" comes from two separate lines of evidence:

DITTO (Demonstration ITerated Task Optimization) explicitly targets this exact problem: "it is instead possible to align an LLM to a specific setting by leveraging a very small number (<10) of demonstrations as feedback," treating a user's own demonstrated outputs as preferred over the LLM's own generations (including intermediate training checkpoints), iteratively constructing pairwise preference pairs from this asymmetry and training with a standard preference-optimization algorithm such as DPO. A separate user study (N=16) evaluated this across news articles, emails, and blog posts as target styles.[^82]

A separate finding, from a jailbreak-attack paper rather than a taste-alignment paper but directly informative on minimum data scale: "a truly benign DPO attack using only 10 harmless preference pairs, the minimum data scale accepted by OpenAI's fine-tuning service" was sufficient to broadly suppress refusal behavior and transfer to out-of-distribution prompts  — this independently corroborates the "under 10 examples" order of magnitude as a real inflection point in DPO's sensitivity to small preference datasets, albeit from an adversarial framing rather than a taste-capture framing.[^59]

A diffusion-model personalization paper (PPD) found that with as few as four preference examples from a new user, a VLM-embedding-conditioned approach achieved a 76% average win rate over baseline in reflecting specific user preferences  — evidence from an adjacent (image generation) domain, useful as a cross-domain data point but not directly transferable to text/rubric taste-capture without caveat.[^68]

No single paper in this corpus definitively answers "what is the minimum viable dataset to capture one person's standard" for text-based executive/leadership-training content specifically; the convergent evidence across DITTO, the DPO-attack paper, and the diffusion personalization paper suggests an order-of-magnitude answer of single digits to roughly ten contrastive pairs is sufficient to shift behavior measurably, but "sufficient to shift behavior" is not the same claim as "sufficient to reliably capture nuanced professional judgment," which none of these papers test directly.

## Critique versus generation: the actual studies

This is the area with the most direct, well-controlled, and genuinely surprising evidence in the corpus. A 2026 paper, "Can LLMs Judge Better Than They Generate?", ran a controlled in-context QA setup (context passage as sole information source, each model judging the answer it generated itself, across SQuAD 2.0, DROP, HotpotQA, MuSiQue) and found: "evaluation is not uniformly easier: generation accuracy exceeds self-evaluation on three of four [benchmarks], with multi-hop MuSiQue the exception". Mechanistic explanation via attention analysis: "evaluation attends to context 3-5x less than generation does and barely reads the candidate answer". LoRA fine-tuning ablations confirmed this is not a training artifact: "generation fine-tuning induces over-acceptance and evaluation fine-tuning degrades generation," i.e., the two capabilities actively trade off against each other rather than being independent skills you can freely improve together. The same paper cites convergent prior findings: "Oh et al. (2024) find LLMs achieve lower accuracy judging generated answers than producing them on TriviaQA; Jiang et al. (2025) show discriminative selection among self-generated candidates is not reliably superior to direct generation; and Lin et al. (2025) find only weak correlation between generation and judgment ability across 21 tasks".[^53]

A separate benchmark (CRITICBENCH) offers a partially contradictory nuance: it finds "stronger models are better at critiquing weaker ones, while weaker models can surprisingly [accurately evaluate stronger models' responses] sometimes" and reports "a positive linear relationship between generating and judging" abilities across models, even though models are not explicitly trained on critique tasks  — this is a cross-model correlation finding (do better generators tend to be better critics), which is a different question from the within-model self-evaluation question that the "Can LLMs Judge Better Than They Generate?" paper addresses. Reading both together: across a population of models, generation skill and critique skill are correlated, but within a single model evaluating its own output, generation is often more reliable than self-critique — a genuinely nuanced, non-obvious finding that a practitioner should not flatten into either "models are great judges" or "models can't judge," because both framings are partially supported and partially contradicted depending on which question you ask.[^66]

Practical implication for a harness: this evidence argues against a lightweight architecture where a cheap model generates and the same or a weaker model self-grades against a rubric, and argues for either a stronger separate judge model, human-in-the-loop grading at the calibration stage, or explicit attention-forcing techniques (e.g., requiring the judge to quote the specific passage it is grading against, since the attention-analysis finding shows judges "barely reads the candidate answer" by default).[^53]

## Real community examples: Apify-adjacent practitioner patterns

Apify's own Store contains scraping/automation Actors used broadly by practitioners building agent pipelines, but no Apify Academy or Apify-community-published primary research specifically on knowledge elicitation, rubric engineering, or constitutional AI surfaced in the searches conducted for this section — Apify's public content in this space is concentrated on web-scraping infrastructure (Actors, MCP servers) rather than on taste-encoding or memory-architecture research. This should be treated as a gap: the query's request to "go and find real world examples from communities too Apify Academic" did not yield material specific to Apify beyond its general role as an Actor marketplace; the strongest "community" evidence in this corpus instead comes from GitHub practitioner repos (jbarbier/CLAUDE.md, agentmd/agent.md, anthropics/skills), Reddit/HackerNews threads on context-window management referenced in the video source on context rot, and Cursor/Windsurf forum discussions on `.mdc` rule structure.[^83][^42][^20]

## Synthesis for the harness architect

For memory: use a file-based memory tool (Anthropic's `/memories` pattern, or an AGENTS.md/CLAUDE.md hierarchy) for anything that functions as standing organizational policy or persona, because it is auditable and version-controlled; reserve a vector or graph store (Mem0-style or Zep-style) only for genuinely high-volume episodic recall where file-based lookup would not scale, and budget explicitly for context rot by keeping any single retrieval context under roughly 30-40K tokens per Anthropic's own cookbook guidance, not the advertised window size.[^29]

For taste: neither CDM nor Repertory Grid has been published as an LLM-encoding pipeline, which is both a risk (no prior art to borrow from) and an opportunity (a genuinely novel contribution for this project). Given the strong evidence that DPO-style methods work with single-digit-to-low-double-digit contrastive pairs, the most evidence-grounded path is: run CDM-style incident interviews with the firm's senior facilitators to elicit 8-12 real "critical decision" cases, use Repertory-Grid-style triadic comparison on a matched set of client-engagement transcripts to extract the bipolar constructs the best facilitators actually use to differentiate strong from weak interventions, encode those constructs as an explicit rubric (aware of position-bias mitigation via permutation testing ), and validate the rubric with a judge model that is demonstrably not also the generator, given the generation/self-evaluation asymmetry finding.[^52][^82][^59][^53]

---

## References

1. [Tokalator: A Context Engineering Toolkit for Artificial Intelligence Coding Assistants](https://arxiv.org/abs/2604.08290) - Artificial Intelligence (AI)-assisted coding environments operate within finite context windows of 1...

2. [CEDAR: Context Engineering for Agentic Data Science](https://link.springer.com/10.1007/978-3-032-21321-1_29) - We demonstrate CEDAR, an application for automating data science (DS) tasks with an agentic setup. S...

3. [Claude API Memory Tool: Build Agents That Learn](https://thomas-wiegold.com/blog/claude-api-memory-tool-guide/) - Claude's Memory Tool lets your AI agents retain knowledge across sessions. Learn how to implement pe...

4. [LongMemEval benchmark results](https://www.retaindb.com/benchmark) - RetainDB's LongMemEval benchmark page: 88% preference recall and 79% overall on LongMemEval (ICLR 20...

5. [Effective context engineering for AI agents - Rajesh Beri](https://www.beri.net/learning/anthropic-effective-context-engineering-agents) - Anthropic's engineering guide (Sept 29, 2025) on context engineering — curating and managing the tok...

6. [Anthropic's Claude Sonnet 4.5 is now in Amazon Bedrock ...](https://aws.amazon.com/about-aws/whats-new/2025/11/anthropics-claude-sonnet-4-5-amazon-bedrock-aws-govcloud-us/) - Discover more about what's new at AWS with Anthropic’s Claude Sonnet 4.5 is now in Amazon Bedrock in...

7. [Building more effective AI agents](https://www.youtube.com/watch?v=uhJJgc-0iTQ) - Anthropic’s Alex Albert (Claude Relations) sits down with Erik (Multi-Agent Research and co-author o...

8. [Building Effective AI Coding Agents for the Terminal: Scaffolding, Harness, Context Engineering, and Lessons Learned](https://arxiv.org/abs/2603.05344) - The landscape of AI coding assistance is undergoing a fundamental shift from complex IDE plugins to ...

9. [Shared Selective Persistent Memory for Agentic LLM Systems](https://www.semanticscholar.org/paper/76c8a9f4e7c44de0c4d68593a3891268c7803bd5) - Agentic LLM systems that generate code through multi-turn tool use face a fundamental context proble...

10. [CRISPR-dCas9 epigenetic reprogramming in cancer: platforms, immuno-modulation and delivery challenges.](https://linkinghub.elsevier.com/retrieve/pii/S0378111926002568) - CRISPR-dCas9 (catalytically dead Cas9) has revolutionized targeted epigenetic editing, offering locu...

11. [Facilitating AI-Driven Sustainability: A Service-Oriented Architecture for Interoperable Environmental Data Access](https://www.mdpi.com/2071-1050/18/5/2445) - Advances in artificial intelligence (AI), particularly agentic AI, have created opportunities to enh...

12. [Engineering](https://www.anthropic.com/engineering) - Anthropic is an AI safety and research company that's working to build reliable, interpretable, and ...

13. [Memory & context management with Claude Sonnet 4.6](https://platform.claude.com/cookbook/tool-use-memory-cookbook) - Build AI agents with persistent memory using Claude's memory tool and context editing.

14. [Context Engineering: From Prompts to Corporate Multi-Agent Architecture](https://arxiv.org/abs/2603.09619) - As artificial intelligence (AI) systems evolve from stateless chatbots to autonomous multi-step agen...

15. [Memory tool (API) - Claude Master](https://claudemaster.net/features/api-memory-tool) - The memory tool is a beta API feature that lets Claude persistently store, retrieve, update, and del...

16. [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) - Discover how Anthropic builds AI agents with practical capabilities through modular skills, enabling...

17. [Claude plays Catan: Managing agent context with Sonnet 4.5](https://www.youtube.com/watch?v=BER3EhUIyz0&attr_tag=8ex0F5Cupc9pGUnu:6&parentCsn=YhYuyr98um7ppFBD&parentTrackingParams=CAgQhsUBIhMIl_atqtyOkAMVW9JyCR0ZLw08kgEYVUNyRHdXcDdFQkJ2NE53dlNjSXBCRE9BsgEpChZHV2Z1anpneGMxZkg5cmJhS3NyY1BBEJQBGgwIiYeNxwYQ-M_sqgI=) - We've added a new context editing capability and memory tool to the Claude API. With Sonnet 4.5, the...

18. [Resolving Evidence Sparsity: Agentic Context Engineering for Long-Document Understanding](https://arxiv.org/abs/2511.22850) - Document understanding is a long standing practical task. Vision Language Models (VLMs) have gradual...

19. [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) - Anthropic is an AI safety and research company that's working to build reliable, interpretable, and ...

20. [Techmeme](https://x.com/Techmeme/status/1972731145122115799)

21. [Context Engineering for Claude Code: The Complete Guide](https://unmarkdown.com/blog/context-engineering-complete-guide) - Context engineering beats prompt engineering in 2026. Learn to architect CLAUDE.md files, rules, and...

22. [Introducing Claude Sonnet 4.5](https://www.anthropic.com/news/claude-sonnet-4-5) - Claude Sonnet 4.5 is the best coding model in the world, strongest model for building complex agents...

23. [DSBC : Data Science task Benchmarking with Context engineering](https://arxiv.org/abs/2507.23336) - Recent advances in large language models (LLMs) have significantly impacted data science workflows, ...

24. [ENGRAM: Effective, Lightweight Memory Orchestration for Conversational Agents](https://arxiv.org/abs/2511.12960) - Large language models (LLMs) deployed in user-facing applications require long-horizon consistency: ...

25. [AI Agents' Context Management Breakthroughs and Long ...](https://bytebridge.medium.com/ai-agents-context-management-breakthroughs-and-long-running-task-execution-d5cee32aeaa4) - AI agents are no longer confined to brief chat exchanges. The latest generation of models can handle...

26. [BOAD: Discovering Hierarchical Software Engineering Agents via Bandit Optimization](https://arxiv.org/abs/2512.23631) - Large language models (LLMs) have shown strong reasoning and coding capabilities, yet they struggle ...

27. [Effective Context Engineering for AI Agents (why agents still fail in practice)](https://www.youtube.com/watch?v=nkJXADeI62c) - Want to start freelancing? Let me help: https://go.datalumina.com/Fsm6CLA
Want to learn real AI Engi...

28. [Anthropic - X](https://x.com/AnthropicAI/status/1973098580060631341)

29. [agentmemory/benchmark/LONGMEMEVAL.md at main - GitHub](https://github.com/rohitg00/agentmemory/blob/main/benchmark/LONGMEMEVAL.md) - #1 Persistent memory for AI coding agents based on real-world benchmarks - rohitg00/agentmemory

30. [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) - Anthropic is an AI safety and research company that's working to build reliable, interpretable, and ...

31. [Using Cognitive Task Analysis to Identify Critical Decisions in the Laparoscopic Environment](https://journals.sagepub.com/doi/10.1177/0018720812448393)

32. [Reproducible Expert Weight Elicitation via LLM Multi-Agent Simulation: A Best–Worst Method Decision Support Framework for AI-Driven E-Commerce Platform Evaluation](https://www.mdpi.com/2076-3417/16/12/6093) - The pervasive integration of artificial intelligence across e-commerce ecosystems has fundamentally ...

33. [Ethical implications of using general-purpose LLMs in clinical settings: a comparative analysis of prompt engineering strategies and their impact on patient safety](https://bmcmedinformdecismak.biomedcentral.com/articles/10.1186/s12911-025-03182-6) - The rapid integration of large language models (LLMs) into healthcare raises critical ethical concer...

34. [Using cognitive task analysis to facilitate the integration of decision support systems into the neonatal intensive care unit](https://linkinghub.elsevier.com/retrieve/pii/S093336570500045X)

35. [2025-10-09 Effective Context Engineering for AI Agents | Blog | MCP](https://docs.tuannvm.com/blog/reading/2025-10-09-effective-context-engineering-for-ai-agents)

36. [LongMemEval: Benchmarking Chat Assistants on Long- ...](https://arxiv.org/abs/2410.10813) - by D Wu · 2024 · Cited by 444 — We introduce LongMemEval, a comprehensive benchmark designed to eval...

37. [LongMemEval — Long-Term Interactive Memory](https://mnemoverse.com/docs/technology/benchmarks/longmemeval) - LongMemEval tests whether a chat assistant recalls facts across many sessions — our protocol and a j...

38. [LongMemEval Benchmark Leaderboard | AI Memory Scores Compared](https://omegamax.co/benchmarks) - LongMemEval benchmark results for 8 AI memory systems. OMEGA: 95.4% (466/500). Side-by-side scores, ...

39. [Anthropic's guide on Effective Context Engineering - LinkedIn](https://www.linkedin.com/posts/giannidalerta_effective-context-engineering-for-ai-agents-activity-7379659066991603712-4fmy) - Anthropic's guide on Effective Context Engineering is straight-up useful. Context windows are finite...

40. [Effective context engineering for AI agents by Anthropic](https://www.youtube.com/watch?v=139Cfcrt2Mk) - https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

#ai  
#llm 
#gena...

41. [Self-Adaptive Cognitive Debiasing for Large Language Models in Decision-Making](https://www.semanticscholar.org/paper/a05c96d58910c04d5136bd4f347a4a7aa67c1378) - Large language models (LLMs) have shown potential in supporting decision-making applications, partic...

42. [Use of the Critical Decision Method to Elicit Expert Knowledge: A Case Study in the Methodology of Cognitive Task Analysis - Robert R. Hoffman, Beth Crandall, Nigel Shadbolt, 1998](https://journals.sagepub.com/doi/10.1518/001872098779480442) - The Critical Decision Method (CDM) is an approach to cognitive task analysis. The method involves mu...

43. [Writing effective tools for AI agents—using ...](https://www.anthropic.com/engineering/writing-tools-for-agents) - Writing effective tools for AI agents—using AI agents

44. [Memoro: Using Large Language Models to Realize a Concise Interface for
  Real-Time Memory Augmentation](https://arxiv.org/pdf/2403.02135.pdf) - People have to remember an ever-expanding volume of information. Wearables
that use information capt...

45. [Anthropic Unveils Advanced APIs for Agentic AI Development](https://www.startuphub.ai/ai-news/ai-video/2025/anthropic-unveils-advanced-apis-for-agentic-ai-development/) - "Raising the ceiling of intelligence" is Anthropic's driving mantra, as articulated by Katelyn Lesse...

46. [Exploring Anthropic's Memory Tool](https://www.leoniemonigatti.com/blog/claude-memory-tool.html) - Learn how to build an example AI agent with persistent memory in Python using the Claude Developer P...

47. [Context Engineering for Claude: How to Train It on Your Codebase ...](https://claudeguide.io/context-engineering-claude) - Context engineering determines what Claude knows before you ask — CLAUDE.md, @file references, and c...

48. [MemGPT: Towards LLMs as Operating Systems](https://arxiv.org/pdf/2310.08560.pdf) - ...using context beyond limited
context windows, we propose virtual context management, a technique ...

49. [MeMo: Towards Language Models with Associative Memory Mechanisms](http://arxiv.org/pdf/2502.12851.pdf) - ...ability of Transformer-based Large Language
Models, achieved through learning. In this paper, we ...

50. [Graph Memory](https://docs.mem0.ai/platform/features/graph-memory)

51. [Memoria: Resolving Fateful Forgetting Problem through Human-Inspired
  Memory Architecture](http://arxiv.org/pdf/2310.03052.pdf) - Making neural networks remember over the long term has been a longstanding
issue. Although several e...

52. [Efficient Memory-Enhanced Transformer for Long-Document Summarization in Low-Resource Regimes](https://www.mdpi.com/1424-8220/23/7/3542/pdf?version=1680073054) - ...understand. Indeed, detecting long-range dependencies is still challenging for today’s state-of-t...

53. [GitHub - getzep/graphiti at dff0b3c42e3ef40282e4cc648f7704fd99e7f103](https://github.com/getzep/graphiti/tree/dff0b3c42e3ef40282e4cc648f7704fd99e7f103) - Build and query dynamic, temporally-aware Knowledge Graphs - GitHub - getzep/graphiti at dff0b3c42e3...

54. [AI-native Memory 2.0: Second Me](https://arxiv.org/pdf/2503.08102.pdf) - Human interaction with the external world fundamentally involves the exchange
of personal memory, wh...

55. [Temporal Memory with Zep — When Your App Needs to Track ...](https://www.vibereference.com/ai-development/zep-temporal-memory) - Zep and the open-source Graphiti engine give your AI app bi-temporal memory: track when facts became...

56. [Zep: A Temporal Knowledge Graph Architecture for Agent ...](https://arxiv.org/abs/2501.13956) - We introduce Zep, a novel memory layer service for AI agents that outperforms the current state-of-t...

57. [Layers of Memory, Layers of Compression](https://timkellogg.me/blog/2025/06/15/compression) - AI superpower = strategic amnesia. Letta caches memory like a CPU, Anthropic spreads it across agent...

58. [Mem0: Scalable Memory Architecture](https://www.emergentmind.com/topics/mem0-system) - Mem0 is a scalable, memory-centric architecture that efficiently manages persistent, structured memo...

59. [What Is a Temporal Knowledge Graph? Definition - Zep](https://www.getzep.com/ai-agents/temporal-knowledge-graph/) - A temporal knowledge graph records when each fact was true and where it came from. Standard vs tempo...

60. [MEMORYLLM: Towards Self-Updatable Large Language Models](https://arxiv.org/pdf/2402.04624.pdf) - ...) usually remain static after deployment,
which might make it hard to inject new knowledge into t...

61. [Mass-Editing Memory in a Transformer](https://arxiv.org/pdf/2210.07229.pdf) - Recent work has shown exciting promise in updating large language models with
new memories, so as to...

62. [Zep - open-source Graph Memory for AI Apps](https://www.reddit.com/r/LLMDevs/comments/1fq302p/zep_opensource_graph_memory_for_ai_apps/) - Zep - open-source Graph Memory for AI Apps

63. [Zep: Temporal Knowledge Graph Architecture](https://www.emergentmind.com/topics/zep-a-temporal-knowledge-graph-architecture) - Zep integrates temporal dynamics with hierarchical memory organization to enable advanced AI reasoni...

64. [Multi-Agent Based Spam Detection Using Langchain LLM and Google Gemini](https://journals.nipes.org/index.php/jstrissue/article/view/2400) - This study presents a novel multi-agent spam detection framework that leverages Langchain, large lan...

65. [Integrating Visual Data in Conversational AI: A Study on LangChain Custom Tools for Image-Based Interaction](https://ieeexplore.ieee.org/document/11118796/) - This research investigates the development of a visual question answering (VQA) system embodied as a...

66. [A Local Hierarchical LLM Framework for Privacy-Preserving Memory Forensics of Cryptocurrency Wallets](https://ieeexplore.ieee.org/document/11478432/) - Cryptocurrency-related crime continues to expand worldwide. Chainalysis reports that the global valu...

67. [Healthify: A Conversational AI for Mental Health Support Using Groq and LangChain Frameworks](https://www.ijisrt.com/healthify-a-conversational-ai-for-mental-health-support-using-groq-and-langchain-frameworks) - Mental health issues are a growing global concern, with many individuals facing barriers to accessin...

68. [From Storage to Steering: Memory Control Flow Attacks on LLM Agents](https://arxiv.org/abs/2603.15125) - Modern agentic systems allow Large Language Model (LLM) agents to tackle complex tasks through exten...

69. [A Two-Dimensional Framework for AI Agent Design Patterns: Cognitive Function and Execution Topology](https://arxiv.org/abs/2605.13850) - Existing frameworks for LLM-based agent architectures describe systems from a single perspective: in...

70. [GitHub - letta-ai/letta: Platform for stateful agents: AI with advanced memory that can learn and self-improve over time.](https://github.com/letta-ai/letta) - Platform for stateful agents: AI with advanced memory that can learn and self-improve over time. - l...

71. [O-Mem: Omni Memory System for Personalized, Long Horizon, Self-Evolving Agents](https://arxiv.org/abs/2511.13593) - Recent advancements in LLM-powered agents have demonstrated significant potential in generating huma...

72. [Mem0 vs Zep (Graphiti): AI Agent Memory Compared (2026)](https://vectorize.io/articles/mem0-vs-zep) - Mem0 vs Zep — compare dual-store vector+graph architecture with temporal knowledge graphs for AI age...

73. [Letta (MemGPT) — The Memory-Native Agent Framework ...](https://chatforest.com/reviews/letta-memgpt-stateful-agent-framework/) - Letta (letta-ai/letta, ~22.4K stars, Apache 2.0, Python, v0.16.7) is the production evolution of the...

74. [Virtual context management with MemGPT and Letta](https://www.leoniemonigatti.com/blog/memgpt.html) - MemGPT paper review: How virtual memory management enables unlimited LLM context. Learn how to imple...

75. [Letta](https://www.letta.com/) - Making machines that learn. Create stateful agents that remember everything, learn continuously, and...

76. [LangChain Orchestrated Ecosystem for Token-Aware LLM Routing, Hybrid Semantic Retrieval and Explainable Conversational Automation with Dynamic Data Handling](https://ieeexplore.ieee.org/document/11507246/) - With the increasing complexity of institutional workflows and information management, there is a gro...

77. [LangMem](https://langchain-ai.github.io/langmem/) - Build language agents as graphs

78. [Build Agents that Never Forget: LangMem Semantic Memory Tutorial](https://www.youtube.com/watch?v=3Yp-hIEcWXk) - Build agents that remember facts, relationships, and user context across conversations. You'll imple...

79. [[2502.12110] A-MEM: Agentic Memory for LLM Agents](https://arxiv.org/abs/2502.12110) - While large language model (LLM) agents can effectively use external tools for complex real-world ta...

80. [LangMem — LangChain](https://www.memoryatlas.dev/frameworks/langmem) - Procedural memory — learns how to do tasks and rewrites the agent's own behavior/prompts.

81. [Architecture](https://docs.cognee.ai/core-concepts/architecture)

82. [MemGPT — Letta | Documentation](https://docs.letta.com/letta_memgpt) - Learn about the key ideas behind MemGPT

83. [Am I More Pointwise or Pairwise? Revealing Position Bias in Rubric-Based LLM-as-a-Judge](https://www.arxiv.org/abs/2602.02219) - Large language models (LLMs) are now widely used to evaluate the quality of text, a field commonly r...

