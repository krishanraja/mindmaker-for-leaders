# Production AI Agent Memory Systems: Mechanism-Level Notes

Scope note: this is dense reference material for building a persistent scaffolding layer ("harness") around Claude for Teams for a 40-person UK leadership training company. Emphasis is on mechanism over marketing, claim vs demonstration, and failure modes. No em dashes are used per instruction.

## 1. Open Memory Frameworks

Three findings that would most change how you build:

1. Every serious framework has converged on a hybrid substrate (vector plus graph plus relational/file), not a single database. Pure vector RAG for memory is treated as a legacy pattern by 2026, not the frontier.
2. "Write trigger" design is the highest-leverage decision. Systems that let the LLM decide when to write (Letta, LangMem hot-path tools) are simple but bloat and drift; systems that run background extraction pipelines (Zep/Graphiti, Mem0 async mode) are more reliable but add latency and cost, and still require conflict resolution logic.
3. Conflict resolution is solved differently everywhere: Zep/Graphiti does temporal edge invalidation (new fact closes the validity window of the old one) rather than deletion; Mem0 uses an LLM-mediated "ADD/UPDATE/DELETE/NOOP" decision per incoming fact; Letta and A-MEM rely on the agent's own judgment via tool calls, which is the weakest and most failure-prone approach because it depends on the model noticing the contradiction at all.

### Letta (formerly MemGPT)

Storage substrate: relational DB (Postgres) holds discrete "memory blocks," each with a `block_id`, `label`, `value` string, and character/token size limit, individually persisted and addressable via API/ADE. Archival memory is a vector database (Chroma or pgvector by default).[^1][^2]

Memory taxonomy in Letta's own terms: core memory (in-context, always injected: `persona` and `human` blocks), recall memory (vector-indexed message history, searchable via `conversation_search`), and archival memory (arbitrary documents, searched via `search_archival`). This maps loosely to CoALA's working/episodic/semantic split but Letta's own docs use different names, illustrating that vendor taxonomies are not standardized.[^3][^4]

Write trigger: the LLM itself issues function calls (`core_memory_append`, `archival_memory_insert`, etc.) to decide what to write and when; nothing is automatically promoted from context overflow into archival memory unless the agent calls the tool. This is a claimed design choice ("self-editing memory"), and it is also a known weak point: if the model does not think to call the tool, nothing persists.[^4]

Read scope: core memory blocks are unconditionally injected into every prompt ("cheap to read, expensive to bloat"). Archival and recall memory require an explicit tool call and semantic query; they are not automatically surfaced.[^3]

Conflict resolution: none is enforced by the framework. Since blocks are edited by explicit LLM tool calls (unless marked read-only, in which case only the developer can change them), an old fact is simply overwritten by whatever the agent decides to write next. There is no built-in temporal versioning of block values in the open-source core.[^1]

Pruning/decay: none automatic. Developer guidance explicitly instructs keeping "total core memory under 80% of context window" and block sizes to roughly 2,000 to 5,000 characters, which is a manual discipline, not a system mechanism.[^4]

Known failure mode: Letta's own Context-Bench (published October 2025) found that in Letta's production telemetry, 90% of agent failures trace to context window/memory mismanagement rather than model capability gaps, with the dominant failure being an agent retrieving too much material via RAG/broad file reads and filling context with material that confuses subsequent steps. This is a demonstrated, vendor-published number, not third-party replicated, so treat it as a claim from an interested party even though the benchmark itself is public.[^5]

### Mem0

Storage substrate: hybrid. A vector store (for semantic lookups: skills, notes, FAQs) plus an optional built-in graph layer that requires no separate Neo4j/Memgraph deployment on Mem0 Platform. Self-hosted Mem0 can also point at Neo4j directly.[^6][^7][^8]

Taxonomy: Mem0 does not enforce episodic/semantic/procedural distinctions in its schema; it stores "memories" as extracted facts tied to `user_id`/`agent_id`/`app_id`/`run_id` scopes, with graph entities layered on top for relational reasoning.[^7]

Write trigger: two-phase pipeline. On `add`, an LLM extracts entities and candidate facts from the new content; Mem0 then compares extracted facts against existing memory and issues one of ADD/UPDATE/DELETE/NOOP per fact, which is the explicit conflict-resolution mechanism, not the LLM freely appending text.[^7]

Read scope: at query time, entities are extracted from the query and matched against the graph for a ranking boost, combined with vector and BM25 keyword scores into a single blended relevance score. Multi-tenant scoping is enforced through organization/project membership with READER/OWNER-style roles controlling who can view or modify memories at all.[^9][^7]

Conflict resolution: explicit and demonstrated (ADD/UPDATE/DELETE/NOOP classification at write time), which is more rigorous than Letta's implicit approach.[^7]

Pruning/decay: Mem0's 2026 update introduced a "token-efficient memory algorithm" using single-pass hierarchical extraction, reporting roughly 6,700 to 6,900 tokens per retrieval call across benchmarks (versus roughly 26,000 tokens per conversation for full-context baselines in the 2025 paper); this is a vendor-published efficiency claim, cross-checked partially by a third-party paper below.[^10][^11]

Known failure mode/contested claim: a third-party 2026 paper ("Storage Is Not Memory: A Retrieval-Centered Architecture," arXiv 2605.04897) benchmarked Mem0 directly on LongMemEval strict and measured 66.0% accuracy under gpt-4.1-mini, versus Mem0's own 2026 marketing claim of 92.5 to 94.4% on the same benchmark family. This is a significant, explicit discrepancy between a vendor-reported number and an independent replication and should be flagged prominently: the vendor number likely reflects a different, newer algorithm version, different backbone model, or different benchmark variant, but the gap (66% vs. mid-90s) is large enough that any procurement decision should demand the practitioner's own replication rather than trusting either number as-is.[^12][^11][^10]

### Zep and Graphiti

Storage substrate: Graphiti is the open-source temporal knowledge graph engine (20,000-plus GitHub stars) that Zep is built on top of. Graphiti supports Neo4j, FalkorDB, Kuzu, and Neptune as graph backends, with embeddings for semantic search over nodes/edges.[^13][^14]

Taxonomy: three explicit subgraphs. Episode subgraph (raw events/messages/JSON, "non-lossy," each node is an ingested episode with its original timestamp), semantic entity subgraph (entities and facts extracted from episodes, embedded in high-dimensional space, e.g., 1024D, connected by typed relationship edges), and community subgraph (entities clustered by connectivity via dynamic label propagation for higher-level summarization).[^15][^16]

Write trigger: continuous, automatic ingestion. As chat messages or structured business data arrive, Graphiti extracts entities/relationships/facts, assigns a validity window and provenance, and updates the graph, invalidating superseded facts. This is a background/async pipeline, not an LLM tool call the agent must remember to invoke.[^13]

Read scope: query-time retrieval pulls "the relevant, current (or as-of-date) slice, not the whole history," combining semantic, BM25, and graph-based search with result fusion, claimed to run under 100 to 200ms p95 at scale. Multi-tenant isolation is structural: "All graphs, whether user graphs or standalone graphs, are completely isolated from each other with no shared state," and cross-user sharing requires explicitly creating a standalone graph. Zep also ships a role-based access control model (Account Owner/Admin, Project Admin/Editor/Viewer) distinguishing account-wide administration from per-project data access, and a Memory MCP Server pattern where each authenticated end user reaches only their own user graph, gated by the customer's own identity provider, with no tool argument able to name another user's graph.[^17][^18][^19][^20][^13]

Conflict resolution: explicit, temporal, and non-destructive. Each edge (fact) carries four timestamps: valid-from, valid-to, observed (when source stated it), and recorded (when ingested). New contradicting facts set `t_invalid` on the old edge rather than deleting it, preserving full provenance and enabling point-in-time queries ("what was true on 2025-12-01").[^16][^13]

Pruning/decay: not a hard deletion model; superseded facts remain in the graph as closed-interval edges for auditability, which trades storage growth for traceability. This is architecturally the most rigorous conflict-resolution mechanism among the frameworks reviewed, and it is backed by a peer-reviewed arXiv paper claiming Zep outperforms MemGPT on the Deep Memory Retrieval benchmark, a result that is the authors' own paper (not independently replicated) but is a real, citable technical claim rather than pure marketing.[^21]

### LangMem (LangChain/LangGraph)

Storage substrate: LangGraph's `BaseStore`, which persists memories as JSON documents under a namespace (folder-like) and key (filename-like) structure; supports semantic search when an embedding index is configured.[^22][^23]

Taxonomy: LangMem explicitly documents three long-term memory types mirroring human memory: semantic (facts/knowledge, stored as "profile" schema-bound singleton records or "collection" append-only documents), episodic (past experience summaries, collection format), and procedural (prompt/instruction optimization).[^24]

Write trigger: two modes. "Hot path" tools (`create_manage_memory_tool`) let the agent write/update/delete memory mid-conversation; a "background memory manager" runs between interactions to extract, consolidate, and update knowledge automatically without blocking the conversation.[^25]

Read scope: namespace-based isolation is the core multi-user mechanism. Namespaces are tuples like `("memories", "{user_id}")` populated at runtime from the `configurable` dict; a demonstrated tutorial explicitly shows that when configured for User B, the agent tools "don't even require a namespace parameter" and "cannot access memories from one user when configured for another," because the namespace is resolved from session config, not from agent-visible input. This is a clean per-user privacy pattern usable directly as a template for the leadership-training company's likely need to keep participant coaching notes separate from firm-wide IP.[^26][^27][^28]

Conflict resolution: relies on the LLM performing update/delete calls against existing keyed memories (the "profile" format is designed to always reflect the latest state and gets overwritten in place); this is closer to Letta's implicit approach than Zep's temporal-edge approach, and LangMem's own docs do not claim a systematic contradiction-detection mechanism.

Pruning/decay: not a built-in automatic decay; developers are expected to manage TTL and consolidation via the background manager's summarization pass.

### Cognee

Storage substrate: explicitly a three-store hybrid, and unusually, all defaults are file-based with zero infrastructure to stand up: SQLite (relational, for documents/chunks/provenance), LanceDB (vector), and Kuzu (graph), with production alternatives (Postgres, Qdrant/pgvector/Pinecone, Neo4j/FalkorDB/Neptune/Memgraph) available as swap-ins.[^29][^30]

Taxonomy: Cognee frames it as session memory (short-term, working) vs. permanent memory (long-term artifacts: user data, interaction traces, documents, derived relationships), which is a two-tier model rather than the four-part CoALA split.[^29]

Write trigger: an explicit `cognify` pipeline runs a six-stage process on ingestion: classify documents, check permissions, extract chunks, LLM-extract entities/relationships, generate summaries, then embed and commit to the graph; incremental re-runs only process new/changed files. A separate `memify` step is a distinct maintenance pass that prunes stale nodes, strengthens frequent connections, reweights edges by usage signals, and adds derived facts. This separation of "write new" from "refine existing" into two named operations is architecturally notable and is a demonstrated (open-source, inspectable) mechanism, not just a claim.[^29]

Read scope: hybrid retrieval combining vector similarity, graph traversal (Cypher), and combined hybrid queries. Cognee also supports OWL-ontology-constrained entity extraction: LLM-extracted entity names are fuzzy-matched (Python `difflib`, default cutoff 0.80) against a canonical ontology and canonicalized, reducing duplicate-entity fragmentation, which is a concrete, code-level mechanism worth studying for reducing "Krish" vs. "Krish Raja" vs. "K. Raja" fragmentation in an org memory.[^30][^31]

Conflict resolution: `memify`'s pruning and reweighting is the closest analog, but Cognee's own docs do not describe an explicit temporal-invalidation model comparable to Graphiti's; this is thinner evidence than Zep's mechanism and should be treated as less mature.

### A-MEM (Agentic Memory, arXiv 2502.12110)

Storage substrate: research prototype, open-sourced (github.com/WujiangXu/A-mem and agiresearch/A-mem), not a managed product.[^32][^33]

Taxonomy/mechanism: explicitly modeled on the Zettelkasten note-linking method rather than CoALA. Each new memory becomes a "note" with generated structured attributes (contextual description, keywords, tags); the system then analyzes historical memories to find relevant links and creates edges where "meaningful similarities exist." Critically, new memories can trigger updates to the attributes of existing historical memories, an explicit "memory evolution" mechanism where old notes get re-contextualized as new information arrives. This is architecturally distinct from every other system reviewed (none of the commercial products let a new write silently mutate old records' metadata), and it is a genuine research contribution rather than a productized feature, so treat maturity/production-hardening as unproven.[^33][^32]

Write trigger: automatic on ingestion of new interaction.

Conflict resolution: implicit, through the link/re-contextualization mechanism rather than explicit invalidation; no timestamped validity windows are described.

Known limitation: this is a benchmark paper claiming superiority over unspecified "SOTA baselines" on six foundation models; independent, large-scale production validation was not found in this research.

### Comparison table

| System | Substrate | Taxonomy | Write trigger | Conflict resolution | Decay/pruning |
|---|---|---|---|---|---|
| Letta/MemGPT | Postgres blocks + vector DB (Chroma/pgvector) | core/recall/archival | Agent-called tools[^1] | None enforced; overwrite | Manual size discipline only[^4] |
| Mem0 | Vector + built-in graph | Undifferentiated "memories" + entities | LLM extraction pipeline | Explicit ADD/UPDATE/DELETE/NOOP[^7] | Token-efficient extraction algorithm (2026)[^10] |
| Zep/Graphiti | Temporal knowledge graph (Neo4j/Kuzu/FalkorDB) | episode/semantic-entity/community subgraphs | Continuous background ingestion[^13] | Bi-temporal edge invalidation[^16] | No deletion; closed-interval edges persist |
| LangMem | LangGraph BaseStore (JSON docs) | semantic/episodic/procedural[^24] | Hot-path tool calls + background manager[^25] | LLM overwrite of profile records | Manual TTL via background manager |
| Cognee | SQLite + LanceDB + Kuzu (file-based defaults) | session/permanent (two-tier)[^29] | `cognify` pipeline on ingest[^29] | `memify` reweighting/pruning pass[^29] | Explicit `memify` stale-node pruning[^29] |
| A-MEM | Research prototype (open code) | Zettelkasten note-links | Automatic per interaction | Implicit via link re-contextualization[^33] | Not specified |

No credible, well-documented "newer 2026 entrant" beyond incremental updates to the above (Mem0's April 2026 algorithm revision, Zep's 2026 RBAC/MCP additions) was found in this research; claims of wholly new frameworks surfacing in 2026 searches were mostly blog commentary about the existing six, not new systems with independent code repos.

## 2. Is the Episodic/Semantic/Procedural/Working Distinction Load-Bearing?

Three findings:

1. The taxonomy is load-bearing only where it changes retrieval scope or write pipeline, and decorative where it is just a naming convention applied to a single undifferentiated store.
2. Claude Code is the clearest production example where the categories map to genuinely different mechanisms with different loading behavior, not just labels.
3. Several 2026 commentators explicitly warn that CoALA's "working memory" label is a persistent source of confusion because it means "in-context scratchpad" in the academic framing but often gets colloquially misused to mean "short-term but persisted," which causes real design errors.

CoALA (Sumers, Yao, Narasimhan, Griffiths, 2023) is the source framework: working memory (in-context scratchpad, current decision-cycle variables), episodic memory (logs of past experiences/events, time-indexed), semantic memory (generalized facts/concepts), and procedural memory (implicit, in model weights; explicit, in agent code such as prompt templates and skills). CoALA is explicit that "language agents contain two forms of procedural memory: implicit knowledge stored in the LLM weights, and explicit knowledge written in the agent's code," and that you cannot edit the implicit half.[^34][^35][^36]

Where the distinction is demonstrably load-bearing: Claude Code. A single blog post analysis maps each CoALA type to a concrete, differently-behaving mechanism: working memory is the context window itself; semantic memory is the `CLAUDE.md` hierarchy (user-level `~/.claude/CLAUDE.md` plus project-level checked-in `CLAUDE.md`, edited by hand); procedural memory is skills (a folder with `SKILL.md`, using "progressive disclosure" so only a roughly 100-token name+description is loaded until the task matches, at which point the full instructions and any linked files/scripts load); episodic memory is "learned experience," specifically Claude Code's auto-generated `MEMORY.md`, populated from the agent's own corrections/preferences it decided were "worth remembering," distinct from static CLAUDE.md which the agent can only read, not write. This is load-bearing because each type has a different write permission (agent can write auto memory but not CLAUDE.md), a different loading rule (CLAUDE.md loads in full at session start; skills load progressively; auto memory loads only its first 200 lines/25KB), and a different owner (human writes CLAUDE.md, agent writes MEMORY.md). Changing the category changes system behavior, which is the definition of load-bearing.[^37][^34]

Where it is closer to decorative: several production write-ups note that "semantic memory" in practice is "just simply Markdown files" rather than vector databases or knowledge graphs, and the CoALA label is applied after the fact to systems that were not designed around the taxonomy at all. A 2026 essay bluntly states: "Working memory in CoALA is the in-context scratchpad... 'Working memory' in everyday usage often means 'stuff I want to remember for a few hours but not forever.' Pin which definition you're using before the design conversation," flagging that teams routinely conflate the categories, which is itself evidence the taxonomy is not automatically load-bearing; it only becomes so when a team enforces distinct code paths per type.[^38][^39]

Evidence quality flag: the "episodic feeds procedural via success-attribution" claim (that a completed task's episodic log gets scanned and successful action sequences get promoted to procedural memory as a post-task hook) appears in a single practitioner blog with no cited production system doing this at scale; treat this as an architecturally sensible but empirically unverified pattern, i.e., folk wisdom rather than demonstrated practice.[^38]

## 3. Anthropic's Own Memory Surface

Three findings:

1. Anthropic's memory tool is deliberately client-side and file-based: Anthropic never sees or stores the files; your infrastructure does, and Claude only requests file operations via a fixed, schema-less tool named `memory`.[^40]
2. Context editing and the memory tool are two separable mechanisms designed to be used together: context editing clears stale tool-call results from the active context, while the memory tool is where anything worth keeping gets written before it is cleared, and Claude receives an automatic warning to save to memory before a clearing threshold is crossed.[^41][^40]
3. Anthropic's own definition of context engineering explicitly subordinates prompt engineering to it: "context engineering is iterative and the curation phase happens each time we decide what to pass to the model," a discipline applied at every model call rather than once per session.[^42][^43]

### The memory tool (`memory_20250818`)

Mechanism: Claude requests file operations (view, create, edit, delete) against a directory tree rooted at `/memories`; the developer's application executes these operations against its own storage. Available on all Claude 4-plus models, generally available on the Messages API with no beta header required. Security note explicitly called out in docs: the client-side handler "must reject paths outside `/memories`," implying path traversal is a real, documented risk surface, not a theoretical one. Claude automatically checks its memory directory before starting a task and reads files back in later conversations "to continue earlier work," and this is described as "just-in-time context retrieval" (record what you learn, read it back on demand, rather than loading everything up front).[^40]

### Context editing

Mechanism: a beta feature that clears specific tool-use/tool-result pairs from context once a trigger threshold is crossed. Configuration surface includes `trigger` (default 100,000 input tokens, or a tool-use count), `keep` (default: 3 most recent tool-use/result pairs survive), `clear_at_least` (minimum tokens that must be freed for a pass to run, protecting prompt-cache economics), `exclude_tools` (tools that are never cleared; the memory tool itself should be excluded here so its own calls survive clearing), and `clear_tool_inputs` (also clear the call parameters, not just results). Runs entirely server-side, applied before the prompt reaches Claude; the client's local copy of history is untouched, so there is no need to sync local state to match what got cleared.[^41]

Distinct from compaction: compaction summarizes the entire conversation and replaces the full history with the summary once a token threshold is crossed, a coarser mechanism; Anthropic's stated guidance is that "server-side compaction is the primary strategy for most long conversations," with context editing reserved for scenarios needing finer-grained control over exactly what gets cleared.[^41]

### CLAUDE.md and Claude Code's dual memory system

Two complementary, both-loaded-every-session mechanisms per Anthropic's own docs:[^37]

CLAUDE.md files: plain markdown, human-written, hierarchical (managed/enterprise policy level loads before user level, which loads before project level), delivered as a user message after the system prompt (not folded into the system prompt itself), consuming context tokens at every session start. `/init` auto-generates a starting file by analyzing the codebase for build commands, test instructions, and conventions. Explicitly not an enforced configuration layer: "CLAUDE.md instructions shape Claude's behavior but are not a hard enforcement layer," and reliability of compliance depends on how clearly instructions are written, especially for vague or conflicting instructions. Important interoperability note: Claude Code reads CLAUDE.md, not AGENTS.md; teams that already standardized on AGENTS.md for other tools are told to create a CLAUDE.md that imports AGENTS.md so both are honored without duplicating content.[^37]

Auto memory: notes Claude writes itself, unprompted, about build commands, debugging insights, architecture notes, style preferences, and workflow habits, based on user corrections. On by default; toggled via `/memory` or `autoMemoryEnabled` setting, or the `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` environment variable. Storage location: `~/.claude/projects/<project>/memory/`, where `<project>` is derived from the git repo so all worktrees/subdirectories of one repo share a single auto memory directory; the directory is machine-local and not synced across machines or cloud environments. `MEMORY.md` acts as an index into the directory; only its first 200 lines or 25KB (whichever is smaller) load at session start, with content beyond that threshold not loaded, forcing Claude to keep the index concise and push detail into separate topic files.[^37]

Quote (verbatim, exact field/threshold values matter for implementation): "The first 200 lines of MEMORY.md, or the first 25KB, whichever comes first, are loaded at the start of every conversation. Content beyond that threshold is not loaded at session start."[^37]

### Agent Skills as procedural memory

Mechanism: a skill is a directory with a `SKILL.md` file; YAML frontmatter holds a short `description` (roughly 100 tokens) that is always visible in a lightweight index, while the body (steps, and any linked checklist files or scripts) loads only when a task matches the description, a mechanism called progressive disclosure. This is explicitly framed by third-party analysts as how you "give an agent fifty capabilities without paying for fifty [skills worth of tokens] on every turn".[^34]

### Context engineering vs. prompt engineering (Anthropic's published position)

Anthropic's engineering blog post ("Effective context engineering for AI agents," September 29, 2025) is the primary source. Verbatim framing: "After a few years of prompt engineering being the focus of attention in applied AI, a new term has come to prominence: context engineering... In contrast to the discrete task of writing a prompt, context engineering is iterative and the curation phase happens each time we decide what to pass to the model." The post names "structured note-taking, or agentic memory" as a specific technique: "a technique where the agent regularly writes notes persisted to memory outside of the context window," which is the direct textual link between Anthropic's context-engineering framing and the memory tool/CLAUDE.md mechanisms above.[^43][^42]

Contested point: independent commentary notes that Anthropic, LangChain, and LlamaIndex published three different operational definitions of "context engineering" in 2025 that disagree on the unit of analysis; LangChain's version reduces to four concrete operations (write, select, compress, isolate) applied to tokens, while Anthropic's framing is more about iterative curation discipline than a fixed operation set. This is worth flagging explicitly to the practitioner: "context engineering" is not yet a standardized term across vendors, and any rubric built around it should cite Anthropic's specific version rather than assume industry consensus.[^43]

## 4. The File-as-Memory Pattern

Three findings:

1. AGENTS.md has become the closest thing to a genuine cross-tool standard (stewarded by the Linux Foundation's Agentic AI Foundation as of 2026, claimed adoption across 60,000-plus repos and 20-plus tools), while CLAUDE.md, Cursor's `.mdc` rules, and Windsurf's rules remain vendor-specific formats layered on top or alongside it.[^44][^45]
2. The mechanism that makes file-based memory work at all is scope-based auto-loading (root-level files are always-on; subdirectory files apply only when the agent touches that directory), not retrieval, which is the core reason teams choose files over embeddings for this use case: deterministic, auditable inclusion rather than probabilistic similarity search.[^46]
3. Character/size caps are a real, quietly-enforced constraint across every format (Windsurf: 6,000 chars per rule file, 12,000 total; Codex CLI: 32 KiB for AGENTS.md), meaning file-based memory does not scale by simply appending forever; teams must actively prune or split files, which is a manual governance burden analogous to Letta's "keep memory blocks under 80% of context" discipline.[^47][^48]

Why teams choose files over embeddings: files are human-readable, git-diffable, and PR-reviewable, so a change to organizational standards goes through the same code-review process as any other change, which vector-database memory writes typically do not. They are also deterministic in scope (a file at a given path either loads or does not, versus a vector query that may or may not surface the right chunk), which several sources describe as the "why" behind the pattern's popularity for coding-agent conventions specifically.[^49][^50]

Format-by-format mechanism:

- AGENTS.md: single plain markdown file, no required frontmatter, placed at repo root (with optional nested copies per subdirectory); read natively by Codex CLI, Cursor, GitHub Copilot's coding agent, Gemini CLI, Windsurf, Aider, Zed, Devin, Amp (falls back to CLAUDE.md if absent), and more. Devin/Cascade's implementation is explicit about the auto-scoping mechanism: root-level AGENTS.md is treated as "always-on" (full content in every system prompt); subdirectory AGENTS.md is treated as a "glob" rule auto-scoped to `<directory>/**`, applied only when the agent reads or edits files in that directory. Codex CLI caps AGENTS.md at 32 KiB and also reads an `AGENTS.override.md` for temporary overrides.[^45][^46][^44]
- CLAUDE.md: Claude Code only, hierarchical (managed/policy > user `~/.claude/CLAUDE.md` > project), delivered as a post-system-prompt user message, no size cap specified in the sources found; the documented convention is to `@`-import AGENTS.md at the top of CLAUDE.md for cross-tool teams so both formats stay in sync without duplication.[^45][^37]
- Cursor rules: two generations. Legacy `.cursorrules` (single plain-text file, deprecated but still read). Current `.cursor/rules/*.mdc` (Markdown + YAML frontmatter, per-file glob-pattern scoping, four activation modes: Always, Auto Attached to matching file globs, Agent/Model Decision based on a description, and Manual via `@ruleName`). Cursor also supports plain "Team Rules" (free-form text, no folder structure or metadata, managed centrally on Team/Enterprise plans) as a simpler alternative.[^50][^49]
- Windsurf rules: `.windsurfrules` (legacy, plain text, project root) and `.windsurf/rules/*.md` plus `global_rules.md` (current; global applies to all workspaces, directory-scoped files apply per-repo), with explicit character caps (6,000 chars per file, 12,000 chars combined total) that force teams to prioritize content.[^48][^47]
- Devin knowledge: distinct from AGENTS.md/rules. Devin's "Knowledge" is added via Settings > Devin's Settings > Knowledge, persists across future sessions, and can be individually pinned, functioning more like a curated fact list than a scoped rules engine; "Playbooks" separately support a "Forbidden Actions" section listing things Devin should never do.[^51]
- GitHub Copilot repository custom instructions: `.github/copilot-instructions.md`, repo-wide, alongside native AGENTS.md support as the recommended cross-tool path.[^44][^45]

What breaks with the file pattern: because CLAUDE.md/AGENTS.md content is delivered as context rather than enforced configuration, compliance is probabilistic, not guaranteed, especially for vague or conflicting instructions, per Anthropic's own docs. Auto-generated starter files (from `/init`) are explicitly criticized in a widely-cited 2026 video walkthrough as "generic," requiring teams to hand-edit in their specific conventions, error-handling patterns, and architectural decisions rather than trusting the auto-generated baseline. Versioning and review happen exactly like code: the files live in the repo and go through normal git history and pull-request review, which is the primary mechanism (not a special tool) that "versions and reviews them."[^52][^37]

## 5. Benchmarks and Evidence

Three findings:

1. Benchmark numbers for the same system and the same benchmark vary wildly depending on who publishes them and which model version is used as the "answer model," to the point that vendor self-reported numbers and independent third-party replications can differ by more than 25 percentage points on identical benchmarks. This is the single most important thing to flag to a skeptical practitioner.
2. LoCoMo and LongMemEval are both saturating: state-of-the-art systems now claim 90%-plus on both, but the harder subcategories (temporal reasoning, multi-hop, multi-session) remain the primary source of remaining errors across every system studied.
3. BEAM (a 2026 ICLR benchmark testing up to 10 million tokens across ten memory capabilities) is emerging as the harder successor to LoCoMo/LongMemEval specifically because published accuracy drops substantially at the 10M scale (Mem0's own reported BEAM-10M score is roughly 48.6%, well below its LoCoMo/LongMemEval scores in the low-to-mid 90s), which is itself evidence that current systems are tuned to the older, easier benchmarks rather than solving long-horizon memory generally.[^11]

LoCoMo: 1,540 questions across four categories (single-hop, multi-hop, open-domain, temporal) testing multi-session conversational recall. LongMemEval: 500 questions across six categories (single-session user recall, single-session assistant recall, single-session preference recall, knowledge update, temporal reasoning, multi-session recall).[^10]

Documented discrepancy (contested, flag explicitly): Mem0's own 2026 "State of AI Agent Memory" report cites 92.5% on LoCoMo and 94.4% on LongMemEval using its April 2026 algorithm update. A different vendor blog citing the original ECAI 2025 Mem0 paper instead reports 66.9% LoCoMo accuracy (base Mem0) and 68.4% (graph-enhanced Mem0g). An independent, non-Mem0-affiliated 2026 paper ("Storage Is Not Memory," arXiv 2605.04897) directly benchmarked Mem0 on LongMemEval strict and measured 66.0% accuracy (330/500 correct) with a 95% confidence interval of 61.7 to 70.0%, using gpt-4.1-mini as the answer model. This third-party number (66.0%) is far closer to Mem0's own original 2025 self-reported figure (66.9 to 68.4%) than to Mem0's 2026 marketing figure (92.5 to 94.4%), which strongly suggests the 92.5/94.4 numbers reflect either a materially different (and not independently verified) 2026 algorithm, a more favorable benchmark variant, or both. Treat the mid-90s Mem0 numbers as an unreplicated vendor claim and the mid-60s to high-60s numbers as the better-supported, cross-validated figure until independent replication of the 2026 algorithm appears.[^53][^12][^11][^10]

Independently, the same "Storage Is Not Memory" paper reports its own system, "True Memory," at 93.0% LoCoMo (3-run mean) and 87.8% LongMemEval strict (3-run mean, 95% CI reported), running as a single SQLite file on commodity CPU, and states this leads "every other agent memory product by at least 4.8 pp (EverMemOS at 83.0%)" on LongMemEval. This is a demonstrated, methodologically transparent result (multiple runs, confidence intervals, named comparison systems) and is a stronger evidentiary standard than most vendor blog posts reviewed in this research.[^12]

BEAM: a 2026 benchmark (per Mem0's own report, ICLR 2026) testing ten memory capabilities up to 10 million tokens, split into BEAM-1M and BEAM-10M variants. Mem0 reports BEAM-1M at 64.1% and BEAM-10M at only 48.6%, a roughly 16-point drop purely from scale, which is the clearest available evidence (even from a vendor's own disclosure) that memory system performance degrades substantially as the effective knowledge base grows, independent of the LoCoMo/LongMemEval numbers looking saturated.[^11]

Third-party academic replication attempts beyond Mem0: EMem/EMem-G (event-centric memory, Nov 2025) reports 76 to 85% QA accuracy on gpt-4o-mini/gpt-4.1-mini backbones with strong temporal/multi-session gains; LiCoMemory (Nov 2025) reports outperforming Mem0, Zep, A-Mem, and LoCoMo-RAG baselines directly, with 73.8% accuracy on LongMemEval (GPT-4o-mini) and 10 to 40% latency reduction, largest gains in multi-session (plus 26.6 points) and temporal (plus 15.9 points) subsets; ENGRAM-R (Nov 2025) reports a 95.5% reduction in input token budget alongside a plus 21.8 point overall accuracy improvement. These are independent academic papers directly comparing against Mem0/Zep/A-Mem as named baselines, which is closer to genuine cross-validation than most vendor-to-vendor comparisons in this space, though none of them have been independently replicated a third time.[^54]

## 6. Failure Modes at Scale

Three findings that should shape rubric/gate design more than any success story:

1. Context rot is now measured, not theoretical, and its magnitude at frontier-model scale in 2026 is larger than the original 2023 "lost in the middle" numbers suggested, and it does not improve with bigger context windows; a 200K-token-window model can degrade meaningfully by 50K tokens.
2. Memory poisoning is structurally different from prompt injection because it requires only one successful write, decouples the attack from its execution in time, and existing prompt-injection defenses provide "incomplete coverage" against it per a controlled academic study.
3. Cross-user memory contamination is reported at a startling 57 to 71% rate "in the wild" across eight surveyed production harnesses in one 2026 vendor report; even discounting for vendor incentive to sell a fix, this is the single most relevant number for a multi-user Claude for Teams deployment and should drive a hard architectural requirement (namespace isolation, not best-effort prompting) rather than a soft guideline.

### Context rot / lost-in-the-middle

Origin: Liu et al., "Lost in the Middle: How Language Models Use Long Contexts" (2023), found a U-shaped accuracy curve: models handle information well at the start or end of context but poorly in the middle, and this held "even for explicitly long-context models". Stanford's original numbers: with roughly 20 retrieved documents (about 4,000 tokens), accuracy could fall from 70 to 75% down to 55 to 60%.[^55][^56]

2026 update and magnitude increase: Chroma's 2026 study tested 18 frontier models, including 1M-token-window models, and found "every one degraded with length," with 30-plus percentage point accuracy drops when the relevant document sat in positions 5 through 15 of a 20-document context (the "death zone"), and a length-only floor: even with distractor content stripped so nothing competed for attention, accuracy still fell 7.9% from length alone. Quote (verbatim): "The 1M-token models did not behave like 1M-token models past roughly 200K tokens." Refinement of the mechanism (Veseli et al. 2025, cited secondhand): the classic U-shape only holds when context is less than 50% full; beyond 50% full, the pattern shifts to favor the most recent tokens, then middle tokens, over the earliest tokens, meaning "lost in the middle" and "lost at the start" are both real depending on fill level.[^57][^58]

Practical implication for a harness: do not treat a large context window as a substitute for curated retrieval; the failure is silent (output still reads as coherent) even when core instructions have effectively been dropped from attention.[^59]

### Memory poisoning

Mechanism distinction (verbatim from a direct academic comparison): "Prompt injection embeds explicit adversarial commands... in most cases the malicious intent is recoverable from the raw input. In contrast, memory poisoning payloads, particularly weak-signal attacks, are semantically indistinguishable from legitimate content: the agent stores them because they look like valid facts, policies, or past experiences, not because they contain an explicit write command. This is why existing prompt injection defenses fail against weak-signal attacks." This is from a controlled academic study (arXiv 2606.04329), which measured average attack success rate (ASR) of 50.46% and retained success rate (RSR, meaning the poisoned memory still influenced behavior in a later, separate session with no further attacker involvement) of 41.05% across two tested agent frameworks, with RSR reaching as high as 92.76% for "Conditional Command Insertion" attacks on one framework (HERMES). This is demonstrated, quantified, adversarially tested evidence, not a hypothetical.[^60]

Real-world precedent: security researcher Johann Rehberger (Embrace The Red) demonstrated in 2024 that a prompt injection delivered through an untrusted website could write attacker-controlled instructions into ChatGPT's long-term memory, surviving across sessions and devices because the memory was stored server-side. This is the earliest documented real (not just academic-lab) instance of the attack class and predates the "memory poisoning" terminology becoming standard.[^61]

Recommended defense-in-depth (per two independent security-focused sources converging on similar controls): provenance tagging on every memory entry (source, creation time, session context, initial trust score), write-time screening for injection signatures (including "remember this" or "remember to always..." phrasing patterns), trust-aware retrieval that factors provenance into ranking with temporal decay, scope isolation (a memory written in one tenant/task context should not silently re-enter another), and human-in-the-loop confirmation for high-impact or sensitive memory writes. OWASP has assigned this its own category (ASI06, distinct from LLM01 prompt injection), calling for exactly this control set.[^62][^63][^64][^61]

### Cross-user contamination and general memory failure taxonomy

A 2026 practitioner analysis, citing Mem0's own "State of AI Agent Memory 2026" survey of eight production agent harnesses, reports "57 to 71% cross-user memory contamination in production harnesses" and single-request token costs up to $47 when teams treat the context window itself as storage. This figure should be treated cautiously (it is a secondary source citing a vendor report, and the underlying methodology was not independently located in this research), but it is directionally consistent with the mechanism-level finding that Letta, LangMem, and Zep all require an explicit namespace/scope design and do not provide safe cross-user isolation "for free" if a team wires memory tools without deliberately scoping them.[^65]

Four recurring failure clusters identified across multiple independent sources:

- Silent truncation: when combined prompt content exceeds the token limit, most frameworks silently drop the oldest content with no error raised; the agent continues producing plausible output while having lost its system instructions or task state, and "the failure is invisible precisely because the output still looks coherent".[^59]
- Persistence gap across sessions: an agent that performs well within one session can still fail across a multi-session workflow because working memory (volatile, discarded at session end) was never promoted into episodic or semantic storage, so the next session starts from a fragmented view.[^59]
- Retrieval that surfaces the wrong thing confidently: production guidance converges on capping retrieved chunks at roughly 3 to 5, since accuracy peaks there and "degrades beyond that as noise overwhelms signal," and recommends cross-store retrieval fusion (vector plus keyword, weighted by recency) as a baseline requirement rather than an optimization.[^59]
- Stale/contradictory memory: recommended baseline mitigation is explicit contradiction detection via an LLM-as-judge or rule-based check on write, entry versioning, and TTL enforcement, none of which is automatic in most of the frameworks reviewed in Section 1.[^59]

Postmortem-adjacent evidence on a shipped consumer product (ChatGPT memory): community and support reports describe saved memories silently failing to persist, memory recall becoming inconsistent within the same conversation, deleted memories reappearing after refresh ("Backend bug as of late 2025, no official patch" per one secondary source), a hard cumulative cap (reported around 24,000 words total across all saved memories, not per-entry) that produces "Memory Full" errors blocking new writes until manual deletion, and desktop/mobile sync drift. These are consumer-facing anecdotal reports rather than an official Anthropic/OpenAI postmortem, so confidence is lower, but the pattern (hard caps, silent write failures, deletion not truly deleting) recurs across multiple independent user reports and is useful as a cautionary checklist of what to test for before relying on any memory system's advertised behavior.[^66][^67][^68]

## 7. Multi-User and Organizational Memory

Three findings:

1. The two production-grade patterns for separating private-user memory from shared organizational memory are namespace isolation (LangMem, Zep) and role-based project/account scoping (Mem0, Zep RBAC); no framework reviewed offers a mechanism for automatically deciding which facts should be private versus shared, that decision remains a manual design choice the harness architect must make explicitly.
2. Zep's model is the most fully specified for an enterprise identity-provider-gated deployment: authentication happens through the customer's own IdP, and "no tool takes a user, graph, or project argument," meaning the isolation is structural (enforced by which token was issued) rather than something the agent could be tricked into overriding via a crafted argument.[^20]
3. Cross-user sharing, when genuinely needed (e.g., a shared organizational "leadership training methodology" memory alongside private per-participant coaching notes) requires an explicit, separate construct in every framework reviewed (a "standalone graph" in Zep, a team-wide namespace value in LangMem, an organization/project scope in Mem0); none of them make org-wide memory the default, which is a deliberate, demonstrated design choice toward privacy-by-default.

Zep: full multi-tenant isolation is the documented default. Verbatim: "Zep provides full multi-tenant isolation. All graphs, whether user graphs or standalone graphs, are completely isolated from each other with no shared state." A call to `thread.get_user_context()` retrieves context only from that user's graph; other users' data is "never accessible." Deliberate cross-user sharing requires creating a separate "standalone graph" and querying it explicitly, and group-chat data must use `graph.add` with `type = message` rather than the per-user `thread.add_messages` helper, specifically so the content is not tied to a single user's private graph. RBAC is a two-scope model: account scope (org-wide settings, billing, member management, full access to every project, roles Account Owner/Admin) and project scope (a single project's data plane, roles Project Admin/Editor/Viewer), with Project Viewer able to run read-only queries/exports but not ingest or delete data. The Memory MCP Server pattern is the clearest applied example for a consulting/training deployment: each end user signs in via the org's own SSO/identity provider, Zep issues a short-lived token scoped to that one user's graph, and "one user's token can never reach another user's memory or another project," with no tool argument capable of naming a different graph.[^18][^19][^20]

Mem0: access control is organization/project membership based, with READER (view/search only) and OWNER (full access including project modification and member management) as the documented role tiers, and the explicit design goal stated as "Only members can access memories and data within their organization/project scope," providing "Team Isolation" between different teams/projects.[^9]

LangMem/LangGraph: the mechanism is namespace templating rather than roles. A namespace tuple like `("memories", "{user_id}")` is resolved at runtime from the session's `configurable` dict, so per-user isolation happens automatically as long as the harness always supplies a `user_id`; a demonstrated video tutorial shows that switching the configured user from A to B causes the agent's own memory tools to operate on a completely different, non-overlapping memory set without the tools themselves needing any user-facing parameter, which closes off a class of prompt-based social-engineering attack where a user asks "show me what you remember about someone else," since the tool literally cannot address another namespace. For team-wide (organizational) memory, the same mechanism is reused with a team ID as the namespace value instead of a user ID, e.g., `config = {"configurable": {"langgraph_user_id": "team-x"}}` resulting in namespace `("memories", "team-x")`. There is no automatic "promote to org memory" step; a private user memory and a team memory are simply two different namespace values the harness must choose to write to.[^27][^28][^26]

Cognee: the only framework reviewed that builds a permission check directly into the ingestion pipeline itself, not just at query time. The `cognify` pipeline's six stages explicitly include "check permissions" as its second stage, before entity/relationship extraction happens. Specific access-control mechanics beyond that single pipeline-stage mention were not detailed in the sources found, which is a gap in available evidence; treat Cognee's permission model as less mature/documented than Zep's or Mem0's for this specific requirement.[^29]

Practical synthesis for a 40-person UK training company: the demonstrated pattern across Zep and LangMem is to treat "organizational memory" (the firm's proprietary training methodology, rubrics, past client engagement patterns) as a distinct namespace/graph from "per-consultant" or "per-client-engagement" memory, gated by the firm's own SSO the same way Zep's Memory MCP Server pattern does, rather than relying on prompt-level instructions ("don't share User A's notes with User B") to enforce the boundary, since prompt-level enforcement is exactly the layer that memory-poisoning and cross-contamination failures (Section 6) have been shown to defeat.

## Summary Table: Mechanism Fields by System

| System | What is stored | Format | Write trigger | Read scope | Update mechanism | Conflict resolution | Known failure mode |
|---|---|---|---|---|---|---|---|
| Letta/MemGPT | Persona/human facts, archival docs | DB rows (blocks) + vector DB | Agent tool call[^1] | Core: always in-context; archival: on tool call | Agent overwrites block value | None enforced | 90% of prod failures trace to context mismanagement[^5] |
| Mem0 | Extracted facts + graph entities | Vector + graph | LLM extraction on `add`[^7] | Query-time entity match + vector/BM25 fusion | ADD/UPDATE/DELETE/NOOP per fact[^7] | Explicit classification | Independent replication of LongMemEval (66.0%) far below vendor 2026 claim (94.4%)[^12][^10] |
| Zep/Graphiti | Episodes, entities, facts, communities | Temporal knowledge graph | Continuous background ingestion[^13] | Per-user graph, isolated by default[^18] | New edge invalidates old edge's validity window[^16] | Bi-temporal, non-destructive | Requires explicit standalone-graph step for intentional sharing |
| LangMem | Profile facts, episodic collections | JSON docs in namespaced store[^23] | Hot-path tool or background manager[^25] | Namespace-scoped (e.g. per-user_id)[^27] | Agent update/delete on profile record | LLM-driven overwrite | No built-in contradiction detection |
| Cognee | Chunks, entities, relationships, provenance | SQLite + LanceDB + Kuzu[^30] | `cognify` pipeline on ingest[^29] | Vector, graph, or hybrid query[^30] | `memify` reweights/prunes[^29] | Reweighting, not temporal invalidation | Permission model thinly documented |
| A-MEM | Zettelkasten-style linked notes | Research prototype store | Automatic per interaction[^33] | Link-graph traversal | New memory can mutate old memory's attributes[^33] | Implicit via re-linking | No production validation found |
| Claude memory tool | Free-text files | Files under `/memories`[^40] | Agent-initiated, client-executed | Agent reads back on demand | Agent edits files directly | None enforced by Anthropic | Path traversal risk if handler misconfigured[^40] |
| CLAUDE.md | Human-authored standards | Markdown, hierarchical[^37] | Human edits only | Full file loads every session | Manual edit/PR review | Human resolves via editing | Not enforced; compliance probabilistic[^37] |
| Auto memory (Claude Code) | Agent-observed corrections/preferences | Markdown, `MEMORY.md` index[^37] | Agent decides what's worth saving[^37] | First 200 lines/25KB of index loads[^37] | Agent appends/edits | None described | Machine-local, not synced across devices[^37] |
| Agent Skills | Procedures | `SKILL.md` + linked files[^34] | Human-authored | Progressive disclosure (index then full load)[^34] | Manual edit/PR review | Human resolves | None documented in sources found |

This corpus should be paired with direct replication of the LongMemEval/LoCoMo discrepancy (Section 5) and a live red-team test of memory-write injection (Section 6) before committing to any single vendor's memory layer as the organizational-memory substrate for the Claude for Teams harness.

---

## References

1. [Memory Blocks: The Key to Agentic Context Management](https://www.letta.com/blog/memory-blocks/) - Memory blocks offer an elegant abstraction for context window management. By structuring the context...

2. [MemGPT — Letta | Documentation](https://docs.letta.com/letta_memgpt) - Learn about the key ideas behind MemGPT

3. [MemGPT and Letta: managing agent memory beyond context - n4n AI](https://n4n.ai/blog/memgpt-and-letta-managing-agent-memory-beyond-context/) - Analysis of MemGPT agent memory and Letta's approach to state management beyond LLM context windows,...

4. [letta-development-guide by letta-ai/skills](https://skills.sh/letta-ai/skills/letta-development-guide) - Discover and install skills for AI agents.

5. [Context-Bench: Why 90% of Agent Failures Are Memory Failures ...](https://agentmarketcap.ai/blog/2026/04/24/context-bench-letta-long-running-agent-context-management-benchmark) - Letta's Context-Bench reveals that 90% of production agent failures trace to context window mismanag...

6. [mem0](https://x.com/mem0ai/status/1994128016247857550)

7. [Graph Memory](https://docs.mem0.ai/platform/features/graph-memory)

8. [Architectures, Vector Stores, and GraphRAG](https://mem0.ai/blog/what-is-ai-agent-memory) - Mem0's Graph Memory, for example, allows for dynamic relationship mapping that evolves as the agent ...

9. [Organizations & Projects](https://docs.mem0.ai/api-reference/organizations-projects)

10. [AI Agent Memory 2026: Progress Benchmark Report ...](https://mem0.ai/blog/state-of-ai-agent-memory-2026) - Explore AI agent memory trends shaping intelligent systems in 2026. This guide covers agentic AI mem...

11. [AI Memory Benchmarks 2026: LoCoMo, LongMemEval & ...](https://mem0.ai/blog/ai-memory-benchmarks-in-2026) - LoCoMo 92.5%, LongMemEval 94.4%, BEAM 1M 62%: a breakdown of every major AI memory benchmark in 2026...

12. [Storage Is Not Memory: A Retrieval-Centered Architecture for Agent ...](https://arxiv.org/html/2605.04897v1)

13. [What Is a Temporal Knowledge Graph? Definition - Zep](https://www.getzep.com/ai-agents/temporal-knowledge-graph/) - A temporal knowledge graph is a knowledge graph in which every fact carries time — when it became tr...

14. [getzep/graphiti: Build Real-Time Knowledge Graphs for AI ...](https://github.com/getzep/graphiti) - Graphiti is a framework for building and querying temporal context graphs for AI agents. Unlike stat...

15. [Zep: Temporal Knowledge Graph Architecture](https://www.emergentmind.com/topics/zep-a-temporal-knowledge-graph-architecture) - Zep is a temporal knowledge graph architecture that organizes data into episodic, semantic, and comm...

16. [Breakdown of Zep: A Temporal Knowledge Graph Architecture for Agent Memory](https://gist.github.com/lancejpollard/6a516392ebf42fcc63a80140495f6dac) - Breakdown of Zep: A Temporal Knowledge Graph Architecture for Agent Memory - readme.md

17. [Graphiti: Temporal Knowledge Graphs for Agentic Apps - Zep](https://blog.getzep.com/graphiti-knowledge-graphs-for-agents/) - Graphiti builds dynamic, temporally aware knowledge graphs that represent complex, evolving relation...

18. [FAQ - Zep Documentation](https://help.getzep.com/faq) - Zep provides full multi-tenant isolation. All graphs—whether user graphs or standalone graphs—are co...

19. [Role-Based Access Control | Zep Documentation](https://help.getzep.com/role-based-access-control) - Agent memory at enterprise scale. Zep gives your agents memory of users, the business, and work done...

20. [Memory MCP Server - Zep Documentation](https://help.getzep.com/memory-mcp-server) - Let your users' off-the-shelf agents work with the same memory as the agents you build, secured by y...

21. [Zep: A Temporal Knowledge Graph Architecture for Agent ...](https://arxiv.org/abs/2501.13956) - by P Rasmussen · 2025 · Cited by 307 — Graphiti -- a temporally-aware knowledge graph engine that dy...

22. [Long-term Memory in LLM Applications](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/) - Build language agents as graphs

23. [Memory overview - Docs by LangChain](https://docs.langchain.com/oss/python/concepts/memory)

24. [LangMemの3種類の長期記憶（セマンティック・エピ ...](https://dev.classmethod.jp/articles/python-litellm-langmem/)

25. [LangMem](https://langchain-ai.github.io/langmem/) - Build language agents as graphs

26. [Build Agents that Never Forget: LangMem Semantic Memory Tutorial](https://www.youtube.com/watch?v=3Yp-hIEcWXk) - Build agents that remember facts, relationships, and user context across conversations. You'll imple...

27. [Memory Tools API Reference](https://langchain-ai.github.io/langmem/reference/tools/) - Build language agents as graphs

28. [Memory management in LLMs using LangMem - GitHub](https://github.com/rishabbahal9/LLM-memory-LangMem) - Managing Memory in LLMs with LangMem. Contribute to rishabbahal9/LLM-memory-LangMem development by c...

29. [How Cognee Builds AI Memory for Agents](https://www.cognee.ai/blog/fundamentals/how-cognee-builds-ai-memory) - Cognee is a memory engine for AI agents that builds a knowledge graph from data and makes it searcha...

30. [Architecture](https://docs.cognee.ai/core-concepts/architecture)

31. [AI Memory with Ontologies: Build Structured Knowledge ...](https://www.cognee.ai/blog/deep-dives/grounding-ai-memory) - Learn how ontology-based validation grounds AI memory in structured knowledge graphs. Reduce entity ...

32. [A-MEM: Agentic Memory for LLM Agents](https://arxiv.org/pdf/2502.12110.pdf) - While large language model (LLM) agents can effectively use external tools
for complex real-world ta...

33. [[2502.12110] A-MEM: Agentic Memory for LLM Agents](https://arxiv.org/abs/2502.12110) - While large language model (LLM) agents can effectively use external tools for complex real-world ta...

34. [The Four Types of Memory for AI Agents (and How Claude ...](https://alexop.dev/posts/four-types-memory-coding-agents-claude-code/) - Procedural: skills, a folder with a SKILL.md. Claude Code implements all four, and maps each to some...

35. [Cognitive Architectures for Language Agents (CoALA)](https://agentwiki.org/cognitive_architectures_language_agents) - The Cognitive Architectures for Language Agents (CoALA) framework, proposed by Sumers et al. (2023),...

36. [Building Robust AI Agents: Insights from CoALA Paper](https://medium.com/vaibhav31/building-robust-ai-agents-insights-from-coala-paper-3a87324f3438) - Prototyping AI agents is straightforward, but building AI agent systems that are scalable and reliab...

37. [How Claude remembers your project - Claude Code Docs](https://code.claude.com/docs/en/memory)

38. [The Cognitive Taxonomy: Semantic, Episodic, Procedural](https://jatinbansal.com/ai-engineering/memory-cognitive-taxonomy/) - How working, episodic, semantic, and procedural memory differ in agent systems.

39. [The Four Types of Memory Every AI Agent Needs](https://www.youtube.com/watch?v=BacJ6sEhqMo) - Learn more about AI Agents here → https://ibm.biz/~OSlmklt3a

AI agents remember in more than one wa...

40. [Memory tool - Claude Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool) - The memory tool pairs with context editing to manage long-running conversations. Context editing cle...

41. [Claude Memory Tool + Context Editing: Agent Tutorial (2026)](https://nerdleveltech.com/claude-memory-tool-context-editing-typescript-tutorial) - Give a Claude agent cross-session memory with the Memory Tool and stop long runs from exhausting con...

42. [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) - Structured note-taking, or agentic memory, is a technique where the agent regularly writes notes per...

43. [Context Engineering: What Anthropic, LangChain, and the ...](https://www.tentrilliontriangles.com/blog/2026-07-01-context-engineering-vs-prompt-engineering/) - Anthropic, LangChain, and LlamaIndex shipped three different definitions of context engineering in 2...

44. [AGENTS.md Guide (2026): Copilot, Cursor & More](https://vibecoding.app/blog/agents-md-guide) - What is AGENTS.md? The cross-tool standard for AI coding agent instructions. Setup guide for Copilot...

45. [AGENTS.md Complete Guide 2026: Spec, Tools, Examples - Codersera](https://codersera.com/blog/agents-md-complete-guide-2026/) - AGENTS.md is the Linux Foundation-stewarded open standard 60,000+ repos use to guide AI coding agent...

46. [AGENTS.md](https://docs.devin.ai/desktop/cascade/agents-md)

47. [AGENTS.md Guide 2026: How to Write AI Agent Instructions for ...](https://baeseokjae.github.io/posts/agents-md-guide-2026/) - AGENTS.md is the open standard for AI agent instructions that cuts agent runtime 28.6% and works acr...

48. [CLAUDE.md, AGENTS.md & Copilot Instructions: Configure Every AI ...](https://www.deployhq.com/blog/ai-coding-config-files-guide) - Configure Claude Code, Codex, Cursor, Copilot, Gemini, and Windsurf with AGENTS.md and CLAUDE.md tha...

49. [cursor-handbook/docs/components/agents.md at main - GitHub](https://github.com/girijashankarj/cursor-handbook/blob/main/docs/components/agents.md) - Open-source rules engine for Cursor IDE — 110 rules, agents, skills, commands that give AI permanent...

50. [cursor-rules-reference.md - GitHub](https://github.com/sanjeed5/awesome-cursor-rules-mdc/blob/main/cursor-rules-reference.md) - Curated list of awesome Cursor Rules .mdc files. Contribute to sanjeed5/awesome-cursor-rules-mdc dev...

51. [A comprehensive list of Agent-rule files: do we need a standard?](https://www.reddit.com/r/ArtificialInteligence/comments/1kw16yi/a_comprehensive_list_of_agentrule_files_do_we/) - A comprehensive list of Agent-rule files: do we need a standard?

52. [Context Engineering Explained: Why Prompt Engineering Is No Longer Enough (2026)](https://www.youtube.com/watch?v=sDkx_hz67ko) - Prompt engineering got us far — but it's no longer enough.

In 2026, the developers getting the best...

53. [AI Memory Benchmarks in 2026: What LoCoMo and LongMemEval ...](https://www.databaset.com/blog/ai-memory-benchmarks-2026-explained) - Persistent semantic memory for AI apps. One npm install, one API key. Store, recall, and ship. Free ...

54. [LoCoMo and LongMemEval_S Benchmarks](https://www.emergentmind.com/topics/locomo-and-longmemeval-_s-benchmarks) - LoCoMo and LongMemEval_S benchmarks evaluate LLM long-term memory and reasoning in multi-session dia...

55. [Lost in the Middle: How Language Models Use Long Contexts](https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00638/119630/Lost-in-the-Middle-How-Language-Models-Use-Long) - ...changing the position of relevant information, indicating that current language models do not rob...

56. [Context rot explained (& how to prevent it)](https://redis.io/blog/context-rot/) - Context rot is the performance degradation that happens when LLMs have to process increasingly long ...

57. [What Chroma's Context Rot Study Proves - Particula Tech](https://particula.tech/blog/chroma-context-rot-long-context-degradation) - Chroma tested 18 frontier models across long contexts. All of them degraded, 30%+ accuracy drops whe...

58. [Context Rot: Why AI Gets Worse the Longer You Chat (And ...](https://www.producttalk.org/context-rot/) - In November 2023, Liu et al released a paper called "Lost in the Middle" that introduced the first e...

59. [The New Reality of Agent Memory: The Complete Guide (2026)](https://www.sitepoint.com/ai-agent-memory-guide/) - Learn how AI agent memory works, the 5 failure modes that break production agents, and practical fix...

60. [A Systematic Study of Memory Poisoning Attacks in LLM ...](https://arxiv.org/html/2606.04329v1)

61. [Memory poisoning: the one injection that never leaves](https://dev.to/brennhill/memory-poisoning-the-one-injection-that-never-leaves-5ab2) - When a prompt injection lands in an agent's persistent memory, it stops being a one-shot incident an...

62. [Memory poisoning in AI agents: exploits that wait](https://christian-schneider.net/blog/persistent-memory-poisoning-in-ai-agents/) - Learn how memory poisoning attacks create persistence in agentic AI systems, why this differs fundam...

63. [Memory Poisoning vs Prompt Injection: Both Matter - Vectorize](https://vectorize.io/articles/memory-poisoning-vs-prompt-injection) - Prompt injection (OWASP LLM01) is session-scoped. Memory poisoning (OWASP ASI06) is persistent. Here...

64. [AI Agent Memory Poisoning: Persistent Agent Attacks](https://cybersecpentesting.com/blog/ai-agent-memory-poisoning.html) - AI agent memory poisoning turns an agent's persistent memory into an attack surface: how malicious s...

65. [AI Agent Memory: The Real Bottleneck Nobody Is Talking About in 2026](https://ishchuk.eu/blog/ai-agent-memory-the-real-bottleneck-nobody-is-talking-about-in-2026) - Context windows ballooned to 10 million tokens in 2026, but production AI agents still break at the ...

66. [ChatGPT Memory Not Working: Diagnosis and Fixes - AI Learning Guides](https://ailearningguides.com/product/chatgpt-memory-not-working/) - Diagnose and fix every ChatGPT memory failure in 2026: settings missing, saves not persisting, recal...

67. [ChatGPT memory issues and not saving or referencing ...](https://community.openai.com/t/chatgpt-memory-issues-and-not-saving-or-referencing-memories/1308586) - I think a few days ago I noticed this but ChatGPT can not save memories or use memories in chats. It...

68. [How to Use ChatGPT Memory Feature (2026 Guide)](https://www.qwe.edu.pl/tutorial/how-to-use-chatgpt-memory-feature/) - ChatGPT memory works two ways: saved memories you control and chat history it learns from. Here's th...

