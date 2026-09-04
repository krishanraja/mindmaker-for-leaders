# AI Harness Architecture Research Corpus (July 2026)

No em dashes are used anywhere in this document, per instructions. Claims are marked CLAIMED (vendor assertion, no independent replication) or DEMONSTRATED (benchmark, open repo, or third-party replication) wherever the evidence allows that distinction.

## Part 1: Persistent Memory Systems

### Three findings that should change how you build

1. Independent, cryptographically-audited benchmark runs contradict nearly every vendor-published memory benchmark number. Bench'd's open-harness May 2026 run found Graphiti, Letta, and several "agent memory" products scoring 0.0% on LoCoMo/LongMemEval when tested as shipped, against 90%+ self-reported numbers from the same vendors, while a plain LLM-with-no-memory baseline scored 57.6% on LongMemEval. Treat every vendor benchmark table as CLAIMED until you see the harness and raw transcripts.[^1]
2. The "episodic/semantic/procedural" taxonomy is doing real architectural work in some systems (LangMem ties each type to a distinct storage pattern and update trigger) and is purely decorative marketing language in others. The test is whether the taxonomy changes write triggers, read scope, or conflict resolution, not whether the docs use the words.[^2][^3]
3. Anthropic's memory tool is explicitly client-side and file-based: Claude writes plain files to a `/memories` directory that your application, not Anthropic, stores and controls. This makes CLAUDE.md-style files and the memory tool structurally the same pattern (plain text the model reads and writes), which matters directly for a 40-person org running Claude for Teams without a vector database team.[^4][^5]

### System-by-system mechanism table

| System | Storage substrate | Taxonomy | Write trigger | Read scope | Conflict resolution | Known failure mode |
|---|---|---|---|---|---|---|
| Letta (ex-MemGPT) | Core memory: in-context XML blocks, DB-persisted (Postgres/SQLite). Archival: vector store (pgvector, Pinecone, Turbopuffer). Recall: message log DB | OS-inspired: core (RAM), archival (cold storage), recall (disk cache), not episodic/semantic/procedural | Agent decides via function calls (`core_memory_replace`, `archival_memory_insert`) during its own reasoning loop; fully self-directed | Agent chooses: reads core every turn, queries archival/recall via explicit tool call | No formal resolution layer; the agent's own edit function can overwrite core memory blocks, so correctness depends on agent judgment at write time | Independent benchmark run scored Letta 0.0% on LongMemEval as shipped, versus its own docs' framing as reference implementation[^1]; retrieval quality "depends on the agent making good tool-call decisions," an admitted weak point[^6] |
| Mem0 / Mem0g | Vector DB (base) plus knowledge graph (Mem0g variant); hybrid vector+graph backend | User/session/agent three-scope hierarchy, not cognitive taxonomy | Two-phase LLM pipeline per turn: extraction then conflict-detection/update, always LLM-mediated | Scoped retrieval by user/session/agent namespace, semantic search | Explicit "conflict detection and graph update" phase; the extraction LLM decides whether new fact supersedes, merges with, or coexists with old fact[^7][^8] | Independent replication (Storage Is Not Memory paper, gpt-4.1-mini matched) scored Mem0 at 66.0% on LongMemEval versus Mem0's self-reported 93-94%[^9][^10]; open-source Mem0 scored 32.4% LongMemEval / 0.0% LoCoMo on an independent harness versus 93%+ on the managed, self-reported version[^1] |
| Zep / Graphiti | Bi-temporal knowledge graph (episode, semantic entity, community subgraphs); Neo4j-style graph store | Explicit three-layer: episodic (raw timestamped turns, not directly queryable), semantic (deduplicated entities/facts with valid_at/invalid_at), community (cluster summaries) | `add_raw_episode()` sends text to an LLM which extracts entities/relationships and updates the graph on ingestion | Fusion of time, full-text, semantic, and graph-algorithm search scoped per user or group | Non-lossy: contradicting facts are never overwritten; the old edge gets an `invalid_at` timestamp and a new edge is created, preserving full history[^11][^12] | Third-party (Storage Is Not Memory) matched-model run put Graphiti/EverMemOS class systems below their own claims; independent Bench'd harness scored Graphiti 0.0% as shipped[^1]. Zep's own published paper (arXiv 2501.13956) reports 94.8% Deep Memory Retrieval and +18.5% LongMemEval improvement over prior state of the art, which is CLAIMED by the paper's authors (Zep) though it is peer-adjacent (published, not third-party replicated)[^11][^13] |
| LangMem | Backend-agnostic; native integration with LangGraph BaseStore (Postgres, Redis, in-memory) | Explicit three-type: semantic (facts, as collections or single-document profiles), episodic (few-shot examples of past interactions), procedural (prompt-rule updates, i.e. behavior-as-data)[^3][^14] | Two modes: hot-path (agent calls `manage_memory` tool mid-conversation) or background (async Memory Manager processes conversation after it ends)[^2] | Namespace-scoped (org/user/app hierarchy); vector search over collections or direct read of profile document | "Memory consolidation" step merges related facts and resolves contradictions automatically via the Memory Manager LLM call, explicitly built to avoid "memory hoarding"[^15] | No independent LoCoMo/LongMemEval numbers surfaced in this research; procedural memory (prompt-rewriting) is the least tested arm architecturally, since it changes agent behavior rather than storing retrievable facts |
| Cognee | Triple storage: relational DB (provenance), vector store (semantic retrieval), graph store (multi-hop entity relationships) | Not cognitive taxonomy; pipeline stages: Remember, Improve Recall, Forget[^16] | Ingestion pipeline with custom-ontology structured extraction (BAML) | Multi-hop graph traversal plus vector similarity, synchronized triple-storage retrieval | Relies on custom ontologies defined per deployment; no published third-party conflict-resolution benchmark found in this research | No independent benchmark score located; treat all Cognee performance claims as unverified pending a public leaderboard entry |
| A-MEM | Zettelkasten-style interconnected note network; each memory stored with generated structured attributes (context, keywords, tags) | Not episodic/semantic/procedural; note-based with dynamic links, closer to a personal knowledge graph than a cognitive model | On each new memory, the system generates a note and searches historical memories for links, which can trigger updates to old notes' attributes ("memory evolution")[^17] | Link-traversal plus keyword/embedding retrieval across the note network | Old notes get incrementally re-contextualized as new ones arrive rather than a discrete conflict check; open question whether this converges or drifts over many updates | Empirical claims are self-reported ("superior improvement against SOTA baselines" on six foundation models)[^17]; no independent LoCoMo/LongMemEval placement found, flag as evidence-thin |
| Claude memory tool (Anthropic) | Plain files in a `/memories` directory, storage location and format fully controlled by the implementing application (not Anthropic-hosted)[^4] | No formal taxonomy; files are whatever the agent chooses to write (markdown, structured notes) | Claude decides when to write, typically triggered by "learning something" mid-task or by a context-editing warning that a clearing pass is about to remove tool results[^5][^18] | Claude checks the memory directory automatically at task start and reads back specific files as needed via `view`/`view_range`[^5] | No built-in conflict resolution; if Claude writes contradictory notes across sessions, nothing in the tool itself reconciles them, that is left to prompt design or a periodic review process | Documented interaction with context editing: if clearing removes tool results before Claude has written the relevant fact to memory, the information is lost; the docs explicitly recommend triggering memory writes before the clearing threshold[^19][^5] |
| 2026 entrants (MemOS, Second Me, EverMemOS, True Memory) | Varies; MemOS proposed as a governance layer over context/memory rather than a storage engine[^20]; Second Me uses LLM-parameterized memory inside model weights rather than external files[^21] | No consensus taxonomy across entrants; several papers explicitly note the field lacks agreement on what "memory" even denotes as of mid-2026[^20] | Varies by system; several (AgeMem, AdMem) use reinforcement learning (step-wise GRPO) so the model learns when to write/retrieve/discard as a policy rather than a hand-coded trigger[^22][^23] | Varies; retrieval-centered systems like "True Memory" argue storage-plus-retrieval-quality, not storage architecture, is the dominant variable in benchmark performance[^9] | Largely unresolved in public literature as of July 2026 | This is an actively churning research area; treat any single 2026 paper's benchmark table as provisional until a third party reproduces it under a fixed harness |

### Benchmarks: what the numbers actually show

LoCoMo (about 1,540 questions across single-hop, multi-hop, temporal, and open-domain categories) and LongMemEval (500 questions across six ability types including knowledge update and abstention) are the two benchmarks every vendor cites. The trouble is reproducibility. Mem0's own July 2026 blog reports 92.5% LoCoMo and 94.4% LongMemEval, but a matched-model third-party paper (Storage Is Not Memory, gpt-4.1-mini) reproduces Mem0 at only 66.0% on LongMemEval, and the independently-run, cryptographically-signed Bench'd harness scores managed Mem0 at 93.4%/68.5% (self-reported, flagged with an asterisk) but the actual open-source Mem0 package at 32.4%/0.0%. Zep reports 94.7% LoCoMo and 90.2% LongMemEval on its own research page, numbers that come from a January 2025 arXiv paper (2501.13956) authored by Zep employees, so they are CLAIMED by an interested party rather than independently replicated, though the paper itself is public and includes methodology. The clearest independent, matched-model comparison found in this research (Storage Is Not Memory, arXiv 2605.04897) ranks a lightweight retrieval-centered SQLite system above Mem0, RAG-ChromaDB, and most named products on LongMemEval, with the caveat that its own top score of 87.8% (3-run mean) sits meaningfully below several products' self-reported 90%+ figures. The honest read: LongMemEval scores cluster around 85-95% for well-tuned systems under favorable (self-selected) conditions, and collapse toward 30-70% or even 0% under independent, out-of-the-box evaluation harnesses. A basic LLM-with-full-context baseline scored 57.6% LongMemEval / 50.4% LoCoMo on the same independent harness that zeroed out several named products, meaning "no memory system at all" beat several shipped memory products in that specific test. For a 40-person deployment, this means: do not select a memory framework off a vendor benchmark table; run your own eval on your own transcripts before committing.[^12][^13][^24][^25][^10][^26][^9][^27][^1]

### The taxonomy question: load-bearing or decorative

LangMem is the clearest case where the episodic/semantic/procedural distinction is load-bearing rather than decorative, because each type maps to a different storage pattern and a different downstream effect: semantic memory changes what facts the agent retrieves, procedural memory changes the agent's system prompt/behavior rules directly, and episodic memory supplies few-shot exemplars that shape response style. The distinction demonstrably changes behavior because procedural memory writes are architected to modify prompts (an entirely different mechanism from a fact lookup). Letta's core/archival/recall split is a different taxonomy (storage-tier, OS-inspired) that does not map cleanly onto episodic/semantic/procedural, illustrating that "memory taxonomy" in production systems is really two separate axes: a cognitive-type axis (what kind of information) and a storage-tier axis (how fast can you access it). Zep's episodic/semantic/community layering is closer to LangMem's cognitive framing but is really a data-processing pipeline stage (raw text to entity extraction to cluster summary), not a claim about mimicking human memory faculties. AdMem (2026) explicitly builds a unified semantic/episodic/procedural system with a bi-level short-term/long-term store and reports the taxonomy improves "adaptive retrieval" via reward-based pruning, but this is a single paper's self-reported result, not yet independently confirmed.[^28][^11][^7][^14][^23][^3][^15]

## Part 2: Anthropic's Own Memory and Context Surface

### Three findings that should change how you build

1. Context editing and the memory tool are two separate mechanisms solving two separate problems, and conflating them is the most common design error. Context editing (`clear_tool_uses_20250919`) clears old tool-call results from the live context window server-side when a token trigger fires (default 100,000 input tokens, keep 3 most recent tool uses); it does not persist anything anywhere. The memory tool (`memory_20250818`) is the persistence layer: Claude writes to `/memories` files that survive across conversations. The two are designed to pair together: Anthropic's docs state Claude gets a warning before a clearing pass, prompting it to write anything important to a memory file first.[^19][^29][^5][^4]
2. Anthropic's own framing draws a sharp line between prompt engineering (a discrete, one-time task: writing a good instruction) and context engineering (an iterative discipline: curating what gets passed to the model on every single call, across the life of a long-running session). For a harness architect, this reframes CLAUDE.md, skills, and memory files not as "a better prompt" but as parts of a continuously curated context pipeline that changes contents on every invocation.[^30][^31]
3. Agent Skills are structurally procedural memory: a `SKILL.md` file is loaded only when triggered by task-relevant description matching, keeping the base context lean while making specific "how to do X the way we do it" instructions available on demand, which is the textbook definition of procedural knowledge stored external to working memory.[^32][^33][^34]

### Mechanism detail

The memory tool operates entirely client-side: "Claude requests file operations, and your application executes them. You control where and how the data is stored through your own infrastructure". Commands are `view`, `create`, `str_replace`, `insert`, `delete`, `rename`. Your application must implement path-traversal protection since Claude's file paths are model-generated text, not a sandboxed filesystem call. It ships generally available on the Messages API for Claude 4-and-later models, no beta header required as of the most recent docs, though an earlier version required the `context-management-2025-06-27` beta header. Context editing is configured with a `trigger` (input tokens or tool-use count), a `keep` value (how many recent tool-use pairs survive), an optional `clear_at_least` floor, and an `exclude_tools` list to protect specific tool calls from ever being cleared. Anthropic's own guidance: "server-side compaction is the primary strategy for most long conversations, and Context Editing is for scenarios needing finer-grained control". Compaction (a separate, coarser mechanism) summarizes the entire conversation server-side once a threshold is crossed, versus context editing's targeted clearing of specific tool results.[^29][^5][^18][^4][^19]

Agent Skills are packaged as a directory with a required `SKILL.md` top-level file containing YAML frontmatter (`name`, max 64 characters, lowercase/numbers/hyphens only; `description`, max 1024 characters) plus optional supporting files (FORMS.md, REFERENCE.md, EXAMPLES.md, scripts/, data/) loaded progressively to control token cost. The description field is what determines whether Claude autonomously invokes the skill, so its precision is the single highest-leverage piece of a skill definition. Official guidance recommends keeping SKILL.md concise and pushing detail into separate files, with explicit unambiguous triggers such as "Use this skill when the user asks for a weekly KPI report". Total skill bundle upload must be under 30 MB.[^33][^34][^32]

CLAUDE.md conventions: files can live at the repo root, in any parent directory of the working directory (useful for monorepos), or as `CLAUDE.local.md` for personal, gitignored overrides. Claude Code specifically uses CLAUDE.md rather than the emerging cross-tool AGENTS.md standard, though teams commonly symlink the two for interoperability.[^35][^36]

## Part 3: The File-as-Memory Pattern

### Three findings that should change how you build

1. AGENTS.md has become a genuine open, cross-tool standard used by over 60,000 open-source repositories, distinct from any single vendor's proprietary format. It is deliberately unstructured markdown, no YAML schema, no JSON, "readable by humans, parseable by any model, and writable without tooling". This is the opposite design philosophy from a vector database: legibility and version control over semantic search.[^37][^38]
2. Hierarchical scope resolution is the load-bearing mechanism that makes file-based memory workable at scale: nested AGENTS.md/CLAUDE.md files merge top-down, with the most deeply nested (most specific) file taking precedence on conflict, and direct user/system prompts overriding all files. This is a deterministic conflict-resolution rule, in contrast to the probabilistic, LLM-mediated conflict resolution in Mem0 or Zep.[^36][^35]
3. Practitioners consistently report the same maintenance failure mode: cramming everything into a single root file until it becomes bloated and ignored. The documented fix is "progressive disclosure": a minimal root file (one-sentence description, package manager, non-standard build commands only) with links out to domain-specific files, loaded on demand.[^36]

### Why files over embeddings

Teams choose plain files because the content is auditable in a code review, diffable in git, and legible to a human without a retrieval step; a vector store hides its contents behind an embedding index that nobody reads directly. The tradeoff is that files do not scale to large, unbounded knowledge the way a vector or graph store does, which is why AGENTS.md guidance explicitly recommends splitting into a nested directory tree rather than growing one file indefinitely. What breaks in practice: contradictions accumulate across files because there is no automatic dedup step (unlike Mem0's LLM-mediated conflict detection), so teams instruct their own agents to run a periodic "find contradictions, ask which version to keep" reconciliation pass, an explicitly manual review step rather than an automated one.[^38][^36]

Version control and review: AGENTS.md and CLAUDE.md are recommended to be checked into git and reviewed like code, while personal override files (CLAUDE.local.md, `.claude/settings.local.json`) stay out of version control. Conflict resolution across nested files: deeper directory files win; if the same agent name is defined at two levels, the more specific (deeper) definition wins.[^35][^38]

## Part 4: Failure Modes at Scale

### Three findings that should change how you build

1. Reproducibility collapse is the single largest headline failure mode in 2026 memory research. The Bench'd independent harness zeroing out Letta, Graphiti, and gbrain (all scored 0.0% versus 90%+ self-reported) is not a fringe result, it is published alongside the Mem0-authored papers that report the opposite. This should be read as evidence that "works in the vendor's demo" and "works when a third party runs your exact package" are currently two different claims.[^1]
2. Context editing and compaction exist specifically because "context rot" and "lost in the middle" are acknowledged production problems, not theoretical ones; Anthropic's own engineering guidance frames the entire context-engineering discipline around managing the fact that stuffing more tokens into a window degrades rather than improves reliability over a long session.[^31][^30]
3. The generator-verifier self-correction failure mode generalizes to memory: an agent deciding on its own what to write to memory (Letta's fully agent-directed writes) has no external check on whether the written memory is accurate, exactly parallel to the finding that LLMs cannot reliably self-critique their own reasoning without an external signal (see Part 5). A memory system with agent-only write control inherits this same blind spot.

Zep's own documentation states plainly that non-temporal memory systems "struggle with dynamic and continuously evolving data" and that overwriting facts without versioning causes contradiction accumulation, which is precisely why Zep's bi-temporal model exists as a designed-around fix rather than a solved problem broadly across the field. The specific mechanism for stale-memory handling in Zep: it never deletes, it timestamps an `invalid_at` on the old edge, which avoids silent contradiction but means retrieval must correctly filter by validity window or it will surface stale facts confidently, a failure mode the system design acknowledges but does not eliminate.[^11][^13]

## Part 5: Self-Correction, Verification, and Gating

### Three findings that should change how you build

1. The strongest, most load-bearing finding in this entire corpus: intrinsic self-correction (an LLM revising its own output using only its own judgment, no external signal) reliably degrades reasoning-task performance rather than improving it. Huang et al. (ICLR 2024, DeepMind/UIUC) found GPT-4 dropped from 95.5% to 91.5% to 89.0% across two rounds of self-correction on GSM8K, and GPT-3.5 collapsed from 75.8% to 38.1% on CommonSenseQA after a single round. A 2024 critical survey (TACL) confirms "no prior work demonstrates successful self-correction with feedback from prompted LLMs, except for studies in tasks that are exceptionally suited for self-correction," and identifies that prior positive results relied on oracle labels to decide when to stop correcting, which is not self-correction, it is oracle-guided filtering.[^39][^40][^41]
2. The actual bottleneck is not the correction step, it is the error-finding step. Tyen et al. (ACL Findings 2024) show LLMs "generally struggle with" finding their own mistakes even in "highly objective, unambiguous cases," but "can correct outputs, if given information about the mistake location". This reframes the design problem for a harness: build the external error-location signal (a rubric checker, a schema validator, a human flag), not a generic "review your work" prompt.[^42]
3. Even when given high-quality external feedback, current LLMs plateau below their theoretical ceiling. A phenomenon labeled "feedback friction" shows solver models "consistently resist" incorporating correct external feedback across multiple iterations, ruling out several intuitive explanations. This means external feedback is necessary but not sufficient; the harness needs a hard gate (block/require human sign-off) rather than trusting the model to fully absorb a critique.[^43]

### When self-correction works versus degrades

| Condition | Effect | Evidence |
|---|---|---|
| Intrinsic (no external signal), general reasoning tasks | Degrades: GSM8K 95.5% to 89.0% (GPT-4, two rounds); CommonSenseQA 75.8% to 38.1% (GPT-3.5, one round) | Huang et al. ICLR 2024[^41][^40] |
| Oracle-labeled stopping criterion (told when the answer is already correct) | Improves, but this is not self-correction in a deployed system where ground truth is unknown | Huang et al.: GSM8K 95.5% to 97.5% with oracle labels[^41] |
| External feedback with mistake location given | Improves: LLMs "can correct outputs, if given information about the mistake location," even though they cannot find that location themselves | Tyen et al. 2024[^42] |
| Reliable external tool feedback (code execution, calculator, retrieval) | Works well; this is the one condition where self-correction literature and counter-evidence agree | TACL 2024 survey[^39]; DeepMind study[^44] |
| Large-scale fine-tuning for self-correction | Works, at the cost of dedicated training investment (e.g. reinforcement learning approaches like PAG) | TACL survey[^39]; PAG paper[^45] |
| Confidence-miscalibrated self-evaluation | Fails: models show "overconfidence or high randomness when self-evaluate, offering stubborn or inconsistent feedback"[^46] | Hindsight is Not 20/20 paper[^46] |

### Verifier and critic architectures

Best-of-N with a verifier and separate critic models generally outperform intrinsic self-correction because they introduce an external judgment that is not subject to the same blind spot as the generator judging itself. Program-driven Self-Correction (ProgCo) is a representative 2025 mitigation: it has the model generate an executable verification program rather than a natural-language self-critique, converting an unreliable natural-language judgment into a checkable, deterministic one. PAG (Policy as Generative Verifier) introduces a "selective revision mechanism," only revising when the model's own verification step detects an error, explicitly designed to "alleviate model collapse" from indiscriminate self-correction. No consistent, cross-paper published ratio of generation-to-verification compute was found in this research; individual systems (SETS, PAG) report gains from combining parallel sampling with sequential refinement but do not standardize a compute-split metric, so treat any specific "X% compute to verification" claim as evidence-thin until you find the source paper directly.[^45][^47][^48]

### Evaluation infrastructure in practice

Promptfoo, Braintrust, and LangSmith occupy genuinely different niches rather than being interchangeable: Promptfoo is an open-source, CLI-first, YAML-config tool built for CI-gated prompt regression testing, with no built-in production tracing; Braintrust is a hosted platform combining dataset curation, production trace analysis, and CI/CD quality gates in one data layer; LangSmith is the LangChain ecosystem's native tracing-plus-eval platform, best when the runtime is already LangGraph. The recommended pattern that recurs across independent sources: Promptfoo in CI for pre-deploy prompt-regression gates, paired with whichever observability tool already captures production traces for post-deploy monitoring.[^49][^50][^51][^52][^53]

On golden-set sizing, one detailed practitioner guide gives a specific, actionable number: "20-50 inputs is usually right. Tighter than that is too small to be meaningful; looser than that takes too long to run on every PR and accumulates noisy cases nobody investigates". The same source specifies three required qualities for a usable golden set: real (drawn from actual past user messages, never synthetic), distribution-aware (matching the proportions of real traffic types), and tight (in the 20-50 range). For subjective, taste-based tasks specifically, the guidance is to document "expected behavior," not an exact expected output, and to combine programmatic checks with LLM-as-judge scoring for the open-ended portions. Regression detection follows a three-layer CI pipeline: schema checks first (fastest), golden-set scoring second, then a diff against the current production baseline, blocking merges when the candidate scores worse by more than a defined threshold.[^51][^54]

### Guardrails and gating placement

This research did not surface a single authoritative, controlled, published comparison isolating exactly where in the pipeline a check should sit (pre-generation constraint versus post-generation review versus human approval gate) with quantified tradeoffs. What is consistently observed across the eval-tooling sources is a layered pattern in practice: fast/cheap schema and structural checks run first, semantically richer LLM-as-judge or rubric scoring runs second, and human review is reserved for borderline cases near the acceptance threshold, e.g. "Slack alert for borderline cases (within 2 percentage points of acceptance bar)". Flag this sub-question as evidence-thin: the placement decision in production is currently driven by cost/latency engineering judgment more than published controlled experiments.[^54][^51]

### The measurement problem: workslop

BetterUp Labs and the Stanford Social Media Lab's "workslop" research is the sharpest published critique of consumption-metric AI adoption measurement found in this corpus. Their finding: workslop (AI-generated content that looks polished but requires more rework than it saves) is predicted specifically by "conditions in which employees were asked to use AI," not by usage volume itself. BetterUp Labs' 2026 follow-on recommends replacing seat/token/session counts with individual capacity metrics (courage and curiosity, agency, i.e. whether people feel meaningful control over how they use the tools, and "mattering" tracked over time) and organizational condition metrics (psychological safety to ask questions and admit mistakes, an active learning culture, and trust that leadership's stated AI commitment is genuine). This is a direct, actionable outcome-metric alternative to seats/tokens/sessions for a 40-person org: measure whether staff report agency and psychological safety around AI use, not how many prompts they send.[^55][^56]

## Part 6: Learning Styles, Cognitive Load, and Individual Adaptation

### Three findings that should change how you build

1. The learning-styles hypothesis (VARK, Kolb) is not merely "under-evidenced," it has been directly tested with the required experimental design (crossover interaction) and has failed. Pashler, McDaniel, Rohrer, and Bjork's 2008 review in Psychological Science in the Public Interest is the canonical source: "We found virtually no evidence for the meshing hypothesis," and of the few studies using the correct crossover design, several found results that directly contradicted it. A follow-up 2023 meta-analysis of 21 studies found a supportive crossover interaction in only 26% of measures and concluded the benefits are "too small and too infrequent to warrant widespread adoption". Do not build role- or persona-based content adaptation on a learning-styles premise; it is a neuromyth by the field's own current consensus.[^57][^58][^59][^60]
2. What does have real evidence: cognitive load theory (Sweller) and specifically the expertise reversal effect, meaning instructional scaffolding that helps novices measurably hurts experts. A 2025 meta-analysis (Tetzlaff, Learning and Instruction, cited 33 times already) confirms the effect is real and calls it "a cornerstone of adaptivity". Prior knowledge, not a stable "learning style," is the dominant variable determining what kind of instructional support helps versus harms a given individual.[^61][^62][^63][^64]
3. Big Five personality traits can be reliably induced and measured in LLM personas (large, instruction-tuned models show consistent, human-comparable self-reported trait scores that verifiably shift downstream writing style), but this research found no controlled study demonstrating that adapting an assistant's persona to a user's measured personality improves any task outcome. That is a distinct, unanswered question from "can an LLM express a personality," and the evidence gap should be treated as significant, not smoothed over.[^65][^66]

### The evidence-based alternative to learning styles

Cognitive load theory's core mechanism: instructional guidance reduces extraneous cognitive load for novices (helpful) but becomes redundant information competing for the same limited working-memory capacity in experts (harmful), the expertise reversal effect. The worked-example effect (novices learn faster from studying solved examples than from unaided problem-solving) and its reversal (experts learn better from unaided practice than from worked examples) are the most replicated instantiation of this principle. A 2025 Frontiers study adds nuance: pre-training (giving learners foundational vocabulary before instruction) reduced extraneous load "across all learners, including those with higher prior knowledge, challenging the expected expertise reversal effect" in that specific case, showing the effect is real but not universal across every intervention type. Desirable difficulties (Bjork) and prior knowledge as the dominant individual-difference variable are consistently cited alongside cognitive load theory as the evidence-backed alternative to learning-styles matching, though this research did not surface a single fresh 2025-2026 meta-analysis specifically quantifying desirable-difficulties effect sizes; treat that sub-claim as resting on the pre-2025 literature rather than fresh replication.[^62][^64][^67][^61]

### Personality frameworks: skepticism warranted

Big Five personas in LLMs are DEMONSTRATED to be inducible and measurable: PersonaLLM found large effect sizes on self-reported BFI scores matching assigned traits, with significant correlations to measurable linguistic features of generated writing. A Nature Machine Intelligence paper (Serapio-Garcia, Safdari et al.) goes further, showing shaped personality "verifiably influences LLM behaviour in common downstream tasks" for sufficiently large, instruction-tuned models. What is CLAIMED and not demonstrated in this corpus: that matching an assistant's induced personality to a user's actual personality improves any objective outcome (accuracy, satisfaction, task completion) for that user. No such controlled study was found. This is a genuine evidence gap, distinguishable from the settled learning-styles failure; the LLM-persona literature demonstrates the mechanism works technically but has not tested the adaptation hypothesis against outcomes.[^68][^65]

### Intelligent tutoring systems: the mature field

Bayesian Knowledge Tracing (BKT) stores a probability of mastery per skill per learner, updated after every practice item using a four-parameter model (prior knowledge, learning rate, guess rate, slip rate). A published comparison found enhanced BKT (with a forgetting parameter, "BKT+F") performs on par with or better than Deep Knowledge Tracing (DKT, a neural sequence model) on average across four datasets, and "outperforms DKT by 20.0% (.05 AUC units) on Synthetic" data specifically. This is a genuinely useful, demonstrated result: more sophisticated modeling architecture does not automatically beat a well-tuned classical model, a caution directly relevant to over-engineering a harness's personalization layer. A time-dependent BKT variant (TD-BKT) was tested in a controlled experiment and showed learners using it acquired significantly more new skills than three baseline BKT variants (Cohen's d ranging 0.92 to 1.64 against different comparisons), the clearest published effect size found in this corpus for any individual-adaptation mechanism. This research did not surface specific published effect sizes for Khanmigo or Duolingo's proprietary models; their internal mechanisms are not published in comparable peer-reviewed detail, so their adaptation claims should be treated as CLAIMED pending disclosure.[^69][^70]

### AI onboarding and profiling interviews

Anthropic Interviewer is the most concretely documented published pattern for AI-conducted profiling. It runs three explicit stages: planning (a system prompt encodes interview methodology and hypotheses; Claude drafts a rubric and question flow which humans then review and edit before launch), interviewing (10-15 minute adaptive real-time conversations on Claude.ai, following the approved plan but flexible to tangents), and analysis (a human researcher collaborates with Claude to extract answers to the research questions plus illustrative quotes, with an automated tool identifying emergent themes and their prevalence). This is a human-in-the-loop design at both the planning and analysis stages, not a fully autonomous pipeline, which is the key mechanism detail for anyone building a similar onboarding-interview pattern. Anthropic's published Economic Index primitives (task complexity, human/AI skill level, work/education/personal purpose, AI autonomy level, task success) are the closest published example of a durable profile schema derived from AI-mediated interaction rather than a self-report survey.[^71][^72][^73]

## Part 7: Resistance, Adoption, and Tacit Knowledge Transfer

### Three findings that should change how you build

1. This research did not find a specific, named published study on "co-opting internal critics as quality owners" as a distinct, tested intervention. General organizational-change literature confirms the underlying dynamic (resistance to standardization is real, measurable, and peaks during implementation, then decreases once the standard is embedded) but the specific mechanism you describe (making the skeptic the owner rather than the target) is not directly evidenced in what this research surfaced; flag this explicitly as an evidence gap rather than fabricate a citation.
2. Resistance to standardization is not uniform across a workforce: a documented case study found "older employees expressed more resistance to the standardisation initiative than the younger generation" among toolmakers, welders, and specialists, suggesting tenure and craft identity, not just generic change-aversion, predict resistance intensity. This matters directly for a leadership-training company where senior facilitators are likely to be both the most skilled and the most resistant.[^74]
3. Cognitive apprenticeship theory (Collins, Brown, Newman, 1989) gives a precise, six-part mechanism for tacit knowledge transfer: modeling (expert performs while thinking aloud, making internal heuristics externally visible), coaching (expert observes the learner and gives targeted hints/feedback), scaffolding (support that is explicitly, gradually withdrawn, i.e. fading), articulation (learner is made to verbalize their own reasoning), reflection (learner compares their process against an expert's or an internal model), and exploration (learner sets their own subgoals independently). The mechanism most directly transferable to a machine intermediary is modeling-plus-articulation, since both operate on externalized, verbalizable content; scaffolding-with-fading and coaching depend on real-time judgment about a specific human's current competence level, which is exactly the kind of tacit judgment the theory itself says is normally invisible even between human experts and novices, and there is no published evidence in this corpus that an LLM can reliably detect the right moment to fade support for a specific person.[^75][^76]

### The resistance literature in more depth

General resistance-to-change research (Sciencedirect 2023 review) confirms resistance is not a fixed trait but follows a lifecycle: it increases during a change project, peaks at implementation, and decreases once the standard is embedded, which argues for planning around a temporary spike in friction rather than treating early resistance as a permanent verdict. This research did not surface a named, current (2025-2026) Anthropic study specifically on "creatives managing peer judgment" as described in the query; it was not located in the search results gathered, and should not be treated as confirmed without a direct citation. Flag this as an explicit gap in this corpus rather than asserting a source that was not found.[^77]

### What is provably not transferable (per cognitive apprenticeship theory itself)

The theory's own framing draws the relevant line: modeling and articulation operate on content that can be made explicit (heuristics stated aloud, reasoning written down), while coaching and scaffolding-with-fading depend on the expert's real-time, often non-verbalized read of exactly where a specific learner's competence currently sits, which is precisely the tacit judgment the theory was built to study because it usually cannot be directly observed even between two humans. This is the honest limit for a machine intermediary: it can plausibly encode and deliver a modeled demonstration or prompt a learner's articulation, but reliably calibrating the fade rate of scaffolding to an individual's actual (not self-reported) competence trajectory is not demonstrated anywhere in the ITS literature surveyed here as solved by LLM-based systems specifically, only by narrower statistical models (BKT/DKT) built and validated for that single purpose over years of tuning on large item-response datasets.[^70][^76][^69][^75]

## Cross-Cutting Implications for a 40-Person Claude for Teams Harness

Given the org's scale, the file-as-memory pattern (CLAUDE.md, Agent Skills, the memory tool) is architecturally the right fit over a dedicated vector/graph memory service: it is auditable in git review, requires no additional infrastructure team, and the failure modes (bloat, staleness, unreconciled contradictions) are manageable manually at 40-person scale in a way they might not be at enterprise scale. The self-correction literature argues strongly against building any "have Claude review its own rubric compliance" step without an external, structured check (a schema validator, a second independent rubric pass, or human sign-off), since intrinsic self-review is demonstrated to degrade rather than improve output quality on reasoning-adjacent tasks. On personalization, the evidence supports building around cognitive load and prior-knowledge-level adaptation (novice facilitators get more explicit scaffolding, expert facilitators get less), not around VARK-style learning-style matching, which is empirically dead. On adoption, the workslop research argues the harness's success metric should be staff-reported agency and psychological safety in using the system, not usage volume, directly actionable for a leadership-training company whose own product is about human judgment and craft.[^41][^56][^64][^58][^4][^38][^39][^55][^36]

---

## References

1. [AI Memory Benchmarks 2026: Complete Guide to Evaluating Agent ...](https://benchd.ai/benchmarks) - Independent benchmark results and methodology for evaluating AI memory systems.

2. [Long-term Memory in LLM Applications](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/) - Build language agents as graphs

3. [Long-term Memory: LangMem SDK Conceptual Guide](https://www.youtube.com/watch?v=snZI5ojuMRc) - This is the conceptual video for the LangMem SDK launch. For "How-to" guides on particular memory ty...

4. [Memory tool - Claude Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool) - Let Claude store and retrieve information across conversations by implementing the memory tool's fil...

5. [Memory & context management with Claude Sonnet 4.5](https://platform.claude.com/cookbook/tool-use-memory-cookbook?r=0&cc61befa_page=1) - Build AI agents with persistent memory using Claude's memory tool and context editing.

6. [Mem0 vs Letta (MemGPT): AI Agent Memory Compared (2026)](https://vectorize.io/articles/mem0-vs-letta) - Mem0 vs Letta (MemGPT) — compare passive memory extraction with self-editing agent runtime for AI ag...

7. [AI Agent Memory Architectures: From Context Windows to ...](https://zylos.ai/research/2026-04-05-ai-agent-memory-architectures-persistent-knowledge/) - A comprehensive survey of memory systems for AI agents — from in-context buffers to persistent knowl...

8. [Mem0: Building Production-Ready AI Agents with Scalable ...](https://arxiv.org/abs/2504.19413) - Large Language Models (LLMs) have demonstrated remarkable prowess in generating contextually coheren...

9. [Storage Is Not Memory: A Retrieval-Centered Architecture for Agent ...](https://arxiv.org/html/2605.04897v1)

10. [AI Agent Memory 2026: Progress Benchmark Report ...](https://mem0.ai/blog/state-of-ai-agent-memory-2026) - Explore AI agent memory trends shaping intelligent systems in 2026. This guide covers agentic AI mem...

11. [Temporal Memory with Zep — When Your App Needs to Track ...](https://www.vibereference.com/ai-development/zep-temporal-memory) - Zep and the open-source Graphiti engine give your AI app bi-temporal memory: track when facts became...

12. [ZEP Temporal Knowledge Graph Architecture For AI Agents](https://www.scribd.com/document/820497260/ZEP-Temporal-Knowledge-Graph-Architecture-for-AI-Agents) - Zep is a novel memory layer service for AI agents that surpasses the performance of MemGPT in the De...

13. [Zep: Temporal Knowledge Graphs for AI Agent Memory](https://www.youtube.com/watch?v=2V-zMRF7lL0) - https://arxiv.org/abs/2501.13956






The research introduces Zep, a novel memory service for AI ag...

14. [Understanding LangMem's Long-Term Memory](https://developer.mamezou-tech.com/en/blogs/2025/02/26/langmem-intro/) - A little while ago, an interesting product was released by LangChain, a provider of LLM frameworks.h...

15. [LangMem | Ry Walker Research](https://rywalker.com/research/langmem) - LangMem is an open-source Python SDK by LangChain that gives LangGraph agents long-term memory — sem...

16. [Cognee GitHub Walkthrough: RAG, Graphs, and Long-Term AI Memory](https://www.youtube.com/watch?v=Rnm2BlZU1t0) - Cognee GitHub: https://github.com/topoteretes/cognee

Cognee is an open-source AI memory framework t...

17. [[2502.12110] A-MEM: Agentic Memory for LLM Agents](https://arxiv.org/abs/2502.12110) - While large language model (LLM) agents can effectively use external tools for complex real-world ta...

18. [Herramienta de memoria - Claude Docs - Home - Anthropic](https://anthropic.mintlify.app/es/docs/agents-and-tools/tool-use/memory-tool) - La herramienta de memoria permite a Claude almacenar y recuperar información a través de conversacio...

19. [Claude Memory Tool + Context Editing: Agent Tutorial (2026)](https://nerdleveltech.com/claude-memory-tool-context-editing-typescript-tutorial) - Give a Claude agent cross-session memory with the Memory Tool and stop long runs from exhausting con...

20. [Memory as Metabolism: A Design for Companion Knowledge Systems](https://arxiv.org/abs/2604.12034) - Retrieval-Augmented Generation remains the dominant pattern for giving LLMs persistent memory, but a...

21. [AI-native Memory 2.0: Second Me](https://arxiv.org/pdf/2503.08102.pdf) - Human interaction with the external world fundamentally involves the exchange
of personal memory, wh...

22. [Agentic Memory: Learning Unified Long-Term and Short ...](https://arxiv.org/abs/2601.01885) - Large language model (LLM) agents face fundamental limitations in long-horizon reasoning due to fini...

23. [AdMem: Advanced Memory for Task-solving Agents](https://arxiv.org/html/2606.06787v1)

24. [Benchmarks for agent memory. - Zep](https://www.getzep.com/research/) - Benchmark results on LoCoMo and LongMemEval, two industry benchmarks for long-running agent memory.

25. [OpenAI Memory vs LangMem vs MemGPT ...](https://mem0.ai/blog/benchmarked-openai-memory-vs-langmem-vs-memgpt-vs-mem0-for-long-term-memory-here-s-how-they-stacked-up) - AI memory benchmark comparing Mem0, OpenAI Memory, LangMem, and MemGPT for LLM long-term memory. Mem...

26. [AI Memory Benchmarks 2026: LoCoMo, LongMemEval & ...](https://mem0.ai/blog/ai-memory-benchmarks-in-2026) - LoCoMo 92.5%, LongMemEval 94.4%, BEAM 1M 62%: a breakdown of every major AI memory benchmark in 2026...

27. [How Do You Test Agent Memory? A Practical Guide - Zep](https://www.getzep.com/ai-agents/how-to-test-agent-memory/) - Test agent memory across sessions and over time — measure context completeness first, then answer co...

28. [Letta (MemGPT) — The Memory-Native Agent Framework ...](https://chatforest.com/reviews/letta-memgpt-stateful-agent-framework/) - Letta (letta-ai/letta, ~22.4K stars, Apache 2.0, Python, v0.16.7) is the production evolution of the...

29. [Memory Tool and Context Management | anthropics/claude ...](https://deepwiki.com/anthropics/claude-cookbooks/5.2-memory-tool-and-context-management) - This page documents the memory tool (`memory20250818`) and context management (`cleartooluses2025091...

30. [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) - Anthropic is an AI safety and research company that's working to build reliable, interpretable, and ...

31. [Context Engineering: What Anthropic, LangChain, and the ...](https://www.tentrilliontriangles.com/blog/2026-07-01-context-engineering-vs-prompt-engineering/) - Anthropic, LangChain, and LlamaIndex shipped three different definitions of context engineering in 2...

32. [Usare le Agent Skills con l'API - Claude Platform Docs](https://platform.claude.com/docs/it/build-with-claude/skills-guide) - Scopri come usare le Agent Skills per estendere le capacità di Claude attraverso l'API.

33. [claude skills repository — Ultimate Guide to Agent Skills - Skywork](https://skywork.ai/blog/claude-skills-repository-ultimate-guide/) - Explore the claude skills repository: SKILL.md anatomy, orchestration patterns, use cases, tool comp...

34. [Agent Skills in the SDK - Claude Code Docs](https://code.claude.com/docs/en/agent-sdk/skills)

35. [Some notes on AI Agent Rule / Instruction / Context files / etc](https://gist.github.com/0xdevalias/f40bc5a6f84c4c5ad862e314894b2fa6) - Some notes on AI Agent Rule / Instruction / Context files / etc - ai-agent-rule-instruction-context-...

36. [A Complete Guide To AGENTS.md - GitHub Gist](https://gist.github.com/skyzyx/c91d9be9e5050c85e81ccbcca022ff6b) - https://www.aihero.dev/a-complete-guide-to-agents-md - README.md

37. [AGENTS.md](https://agents.md/) - AGENTS.md is a simple, open format for guiding coding agents, used by over 60k open-source projects....

38. [AGENTS.md Best Practices: Structure, Scope, and Real Examples](https://thepromptshelf.dev/blog/agents-md-best-practices/) - A practical guide to writing effective AGENTS.md files for Claude Code and multi-agent systems. Cove...

39. [When Can LLMs Actually Correct Their Own Mistakes? A Critical Survey of Self-Correction of LLMs](https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00713/125177/When-Can-LLMs-Actually-Correct-Their-Own-Mistakes) - Abstract. Self-correction is an approach to improving responses from large language models (LLMs) by...

40. [Large Language Models Cannot Self-Correct Reasoning Yet](https://arxiv.org/abs/2310.01798) - Large Language Models (LLMs) have emerged as a groundbreaking technology with their unparalleled tex...

41. [LLMs Cannot Self-Correct Reasoning Yet — ICLR 2024 ...](https://beancount.io/bean-labs/research-logs/2026/04/28/llms-cannot-self-correct-reasoning-yet) - Huang et al. (ICLR 2024) show that LLMs asked to review their own reasoning without external feedbac...

42. [[PDF] LLMs cannot find reasoning errors, but can correct them given the ...](https://aclanthology.org/2024.findings-acl.826.pdf)

43. [[PDF] LLMs Struggle to Fully Incorporate External Feedback - OpenReview](https://openreview.net/pdf/eccd2acb7a6781dcf3c02474daa623367b3329ce.pdf)

44. [LLMs can't self-correct in reasoning tasks, DeepMind study ...](https://bdtechtalks.com/2023/10/09/llm-self-correction-reasoning-failures/) - A study by Google's DeepMind and the University of Illinois at Urbana-Champaign has found that self-...

45. [PAG: Multi-Turn Reinforced LLM Self-Correction with Policy as Generative Verifier](https://arxiv.org/abs/2506.10406) - Large Language Models (LLMs) have demonstrated impressive capabilities in complex reasoning tasks, y...

46. [When Hindsight is Not 20/20: Testing Limits on Reflective Thinking in Large Language Models](https://bohrium.dp.tech/paper/arxiv/2404.09129)

47. [SETS: Leveraging Self-Verification and Self-Correction for Improved Test-Time Scaling](https://arxiv.org/abs/2501.19306) - Recent advancements in Large Language Models (LLMs) have created new opportunities to enhance perfor...

48. [ProgCo: Program Helps Self-Correction of Large Language Models](https://arxiv.org/abs/2501.01264) - Self-Correction aims to enable large language models (LLMs) to self-verify and self-refine their ini...

49. [Eval Frameworks Compared | The Prompt Bench](https://thepromptbench.com/evals-and-testing/eval-frameworks-compared/) - A working comparison of the main LLM eval frameworks: Inspect, Promptfoo, Braintrust, LangSmith, Dee...

50. [Braintrust vs. Promptfoo: 2026 LLM evaluation comparison](https://www.braintrust.dev/articles/braintrust-vs-promptfoo) - This article compares Promptfoo and Braintrust across interface, observability, security testing, re...

51. [Prompt Regression Testing | The Prompt Bench](https://thepromptbench.com/evals-and-testing/prompt-regression-testing/) - Preventing prompts from silently getting worse: golden sets as contracts, CI integration, prompt ver...

52. [Braintrust vs Promptfoo vs LangSmith: Testing and Iterating ...](https://bestai24.aistudio.sk/braintrust-vs-promptfoo-vs-langsmith-testing-and-iterating-prompts-at-scale/) - This guide teaches you: How to decompose a prompt evaluation stack into three layers — instrumentati...

53. [Prompt Testing & Evaluation Tools 2026: Promptfoo vs Braintrust vs ...](https://www.promptquorum.com/prompt-engineering/best-prompt-testing-evaluation-tools?lang=jp)

54. [AI Agent Eval Frameworks 2026: Testing Guide & Tools](https://www.digitalapplied.com/blog/ai-agent-eval-frameworks-testing-guide-2026) - The May 2026 AI agent eval landscape — LangSmith, Braintrust, Helicone, Phoenix, Promptfoo (now Open...

55. [What Belongs On Your AI Dashboard](https://www.betterup.com/blog/ai-dashboard-metrics) - Most AI dashboards measure activity, not outcomes. BetterUp Labs research shows which conditions act...

56. [Workslop: The Hidden Cost of AI-Generated Busywork](https://www.betterup.com/workslop) - And it's costing millions. Research from BetterUp Labs and Stanford Social Media Lab uncovers how AI...

57. [Finding No Evidence for Learning Styles](https://pubs.acs.org/doi/10.1021/acs.jchemed.7b00424) - An extensive literature exists that describes how to categorize students by a plethora of learning s...

58. [The Learning Styles Myth: What Science Actually Says - Athenify](https://athenify.io/blog/learning-styles-myth) - Learning styles are a popular myth with no scientific foundation. Discover why the theory doesn't ho...

59. [Learning Styles: Out of Fashion](https://www.apa.org/pubs/highlights/spotlight/issue-22) - This issue describes an empirical investigation of the effect of learning style preference as applie...

60. [From Styles to Science: Debunking the Learning Styles Myth ...](https://gc-bs.org/articles/from-styles-to-science-debunking-the-learning-styles-myth-and-embracing-an-evidence-based-framework-for-learning/) - The Global Council for Behavioral Science is a global community advancing behavioral science researc...

61. [Five Strategies for Optimizing Instructional Materials: Instructor- and Learner-Managed Cognitive Load](https://pmc.ncbi.nlm.nih.gov/articles/PMC7940870/) - ... which agent, either the instructor or the learner, was most effective, we observed mixed results...

62. [A meta-analysis of the expertise reversal effect](https://www.sciencedirect.com/science/article/pii/S0959475225000660) - by L Tetzlaff · 2025 · Cited by 33 — The expertise reversal effect is present when instructional ass...

63. [A meta-analysis of the expertise reversal effect - OUCI](https://ouci.dntb.gov.ua/en/works/7qEELO0A/)

64. [Frontiers | Rethinking pre-training: cognitive load implications for learners with varying prior knowledge](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1628047/full) - This study examines how prior knowledge and pre-training relate to cognitive load during problem-sol...

65. [A psychometric framework for evaluating and shaping personality traits in large language models](https://www.nature.com/articles/s42256-025-01115-6) - Serapio-García, Safdari and colleagues develop a method based on psychometric tests to measure and v...

66. [PsychAdapter: adapting LLMs to reflect traits, personality, and ... - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12953147/) - AI language generators are now ubiquitous but typically produce generic text that fails to reflect i...

67. [L-73044-f0d048cd9a.pdf](https://content.e-bookshelf.de/media/reading/L-73044-f0d048cd9a.pdf)

68. [PersonaLLM: Investigating the Ability of Large Language Models to Express Big Five Personality Traits](https://ar5iv.labs.arxiv.org/html/2305.02547) - Despite the many use cases for large language models (LLMs) in creating personalized chatbots, there...

69. [Time-dependant Bayesian knowledge tracing—Robots that model ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC10925631/) - Creating an accurate model of a user’s skills is an essential task for Intelligent Tutoring Systems ...

70. [[PDF] How Deep is Knowledge Tracing? - Computer Science](https://home.cs.colorado.edu/~mozer/Research/Selected%20Publications/reprints/KhajahLindseyMozer2016.pdf)

71. [Anthropic Economic Index report: Economic primitives](https://www.anthropic.com/research/anthropic-economic-index-january-2026-report) - This report introduces new metrics of AI usage to provide a rich portrait of interactions with Claud...

72. [Introducing Anthropic Interviewer \ Anthropic](https://www.anthropic.com/news/anthropic-interviewer) - What 1,250 professionals told us about working with AI

73. [Introducing the Anthropic Economic Index](https://www.anthropic.com/news/the-anthropic-economic-index) - Announcement of the new Anthropic Economic Index and description of the new data on AI use in occupa...

74. [Managing in-company standardisation while avoiding resistance11](https://repub.eur.nl/pub/117896/REPUB_117896.pdf)

75. [Cognitive Apprenticeship](https://www.aft.org/ae/winter1991/collins_brown_holum) - In ancient times, teaching and learning were accomplished through apprenticeship: We taught our chil...

76. [Cognitive apprenticeship - Wikipedia](https://en.wikipedia.org/wiki/Cognitive_apprenticeship)

77. [Revisiting resistance to change and how to manage it: What has been learned and what organizations need to do](https://www.sciencedirect.com/science/article/abs/pii/S0007681322001070) - Resistance to change can be a significant factor in the success or failure of changes. As such, rese...

