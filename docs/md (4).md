This corpus separates CLAIMED from DEMONSTRATED evidence on how production AI agents implement persistent memory and self-correction, for a practitioner architecting a Claude for Teams harness for a 40-person UK leadership and training company. No em dashes are used anywhere below.

## Part 1: Memory Architecture

### Three findings that should change how you build

1. Every framework survey that reports a single benchmark number for a memory system is probably not comparable to any other framework's number. An independent third-party audit found 6.4% of the LoCoMo answer key is factually wrong and the LLM judge used to score it accepts up to 63% of intentionally wrong answers when tested adversarially, and a separate independent replication ("Bench'd") using a controlled harness scored several widely cited systems (Letta, Graphiti, gbrain) at 0.0% on LongMemEval and LoCoMo under GPT-4o-mini, while vendor self-reported numbers for the same systems ran 60 to 90 points higher. Treat every vendor benchmark table as a claim, not a result, until you see the eval harness.[^1][^2]

2. The "procedural memory" distinction is load-bearing in exactly one place found in this research: LangMem's `create_prompt_optimizer`, which lets an agent rewrite its own system prompt from accumulated episodic feedback, a capability no other reviewed framework (Mem0, Zep, Letta) has. Everywhere else (Letta's core/archival/recall split, Mem0's vector/graph/KV split, Zep's episodic/semantic/community split), the taxonomy tracks storage substrate and retrieval mechanism rather than cognitive category, and swapping the labels would not change system behavior.[^3][^4]

3. Memory poisoning is a documented, reproducible attack class with success rates far higher than most teams expect: MINJA achieves over 95% injection success and about 70% attack success under idealized conditions via query-only interaction, no backend access required; a systematic study across two production-style agents found average attack success rate of 50.46% and a "residual success rate" (the attack persisting into a later, unrelated session) as high as 92.76% for some attack classes. Standard prompt injection defenses do not transfer to this attack surface.[^5][^6][^7]

### Open memory frameworks compared

| System | Storage substrate | Taxonomy | Write trigger | Retrieval scope | Conflict resolution | Pruning/decay |
|---|---|---|---|---|---|---|
| Letta (MemGPT) | Core memory (in-context XML blocks, up to 128K tokens as of v0.16.7) + Archival (pgvector/SQLite/Pinecone/Turbopuffer vector store) + Recall (message history in SQLAlchemy-backed Postgres/SQLite) [^8][^9] | Three-tier hierarchy modeled on OS memory (RAM/cache/disk), not cognitive categories [^10] | Agent self-edits via explicit tool calls when it decides something is worth keeping; no automatic background extraction [^10][^11] | Agent issues tool calls to search archival (embedding similarity) or recall (keyword/semantic search over history); core memory is always in context [^8] | Not centrally arbitrated; the agent overwrites blocks itself via tool calls, so conflict resolution is whatever the agent's own edit logic does | Automatic summarization/compaction when recall history exceeds context window; no published automatic archival decay [^8] |
| Mem0 | Hybrid: vector store (Qdrant/Chroma/Weaviate/pgvector) for semantic facts, graph store (Neo4j) for entities/relations, key-value store (Redis) for exact-match fields [^12][^13] | Short-term (session), long-term (consolidated), user/session/agent-scoped namespaces; documented as memory "scopes," not cognitive types [^12][^13] | LLM extraction pipeline runs on every `add()` call, pulling candidate facts from the latest exchange plus rolling summary [^14][^12] | `search()` performs routed retrieval across vector, graph, and KV backends, then a ranking/fusion step scores by relevance, importance, recency [^15][^12] | Update phase asynchronously "consolidates memories... to maintain a coherent, non-redundant store," described as deduplication rather than an explicit conflict resolver [^14] | Background consolidation; no published TTL/decay mechanism found in reviewed sources |
| Zep / Graphiti | Bi-temporal knowledge graph; Graphiti is the open-source engine (20,000+ GitHub stars), Zep Cloud serves it via a "Context Graph Engine" [^16][^17] | Episodic (raw time-stamped conversation turns, not directly queryable) -> Semantic (LLM-extracted entities/facts with `valid_at`/`invalid_at` timestamps) -> Community (cluster summaries) [^17] | `add_raw_episode()`/`memory.add()` triggers LLM extraction, entity deduplication against existing graph nodes, and graph update; not instant, since each ingestion calls an LLM [^17] | Sub-200ms p95 context assembly per official repo claims [^16]; retrieval traverses the temporal graph, not flat vector search | Facts are never overwritten. A new fact contradicting an old one sets `invalid_at` on the old edge and creates a new edge; full history preserved [^17][^18] | No deletion by default; explicit invalidation via bi-temporal edges is the decay mechanism |
| LangMem | Whatever LangGraph `BaseStore` backend you provision (commonly Postgres); not a turnkey backend [^19][^3] | Explicit semantic (facts/preferences), episodic (past interaction examples), procedural (agent's own system-prompt rules) taxonomy, closely following CoALA [^20][^21] | "Hot path" (immediate, in the agent loop) or background (asynchronous, between interactions) [^22][^23] | Namespace-scoped search against the LangGraph store; no default cross-namespace retrieval | Not centrally documented; procedural memory specifically resolves conflicting behavior by rewriting the system prompt itself via `create_prompt_optimizer` | Background manager "extracts, consolidates, and updates" but no published automatic decay; independent benchmarking measured LangMem's p95 search latency at 59.82 seconds, explicitly flagged as unsuitable for interactive agents [^3][^4] |
| A-MEM | Open repo (agiresearch/A-mem); note-based memory with Zettelkasten-style dynamic linking rather than fixed schema [^24] | Not organized by episodic/semantic/procedural; organized as interconnected "memory notes" that link to each other, closer to a personal knowledge graph pattern | Agent generates structured notes from experience and the system dynamically creates links between related notes [^24] | Retrieval via note interconnections plus similarity, per the published architecture [^24] | Not separately documented as a distinct conflict-resolution step in the abstract-level sources reviewed | Not documented in sources reviewed; flagged here as a gap |
| Cognee | Not independently verified in this research pass beyond being listed as a comparison point alongside Mem0/Letta/Zep in third-party surveys [^25]; no primary-source mechanism detail was found and should be verified directly against Cognee's own repo before relying on it | | | | | |

Independent evaluators list "Cognee" and "smrti" alongside Mem0, Letta, Zep, and MemOS as the current competitive set as of May 2026, but a claimed mechanism description for Cognee specifically was not found in primary sources during this research pass; treat any Cognee mechanism claim as unverified until checked against the project's own documentation.[^25]

### Newer 2026 entrants (flagged as thin evidence)

Several 2026 arXiv papers describe additional memory systems (MemOS, "Second Me," EverMemOS, True Memory, Supermemory, MemPalace) with self-reported benchmark scores substantially higher than independently verified numbers for the same class of system. One academic audit of a self-reported "100% LoCoMo" claim from a community project found the claim used `top_k=50` against conversations of at most 32 sessions, effectively retrieving the entire conversation and bypassing the embedding retrieval step it claimed to test; the more honest, disclosed number for the same system was 88.9% recall at top_k=10. This is a specific, named example of a benchmark claim failing to replicate under scrutiny from within the same community, not an outside critique.[^26][^27][^28]

### Memory taxonomy question: is it load-bearing or decorative

CoALA's episodic/semantic/procedural framing is used as vocabulary by nearly every framework surveyed (LangMem, Mem0, Zep, academic surveys), but the mechanism that actually changes agent behavior differently per "type" is narrower than the vocabulary suggests. In LangMem, procedural memory is explicitly described as "internalized knowledge of how to perform tasks... saved as updated instructions in the agent's prompt," distinct from episodic memory's "generalized skills, rules, and behaviors" versus semantic memory's static facts. This is the one demonstrated case in this research where the taxonomy produces a different code path: procedural memory triggers a prompt-rewrite operation (`create_prompt_optimizer`) that neither semantic nor episodic memory triggers.[^29][^3]

For Anthropic's Agent Skills, the procedural memory framing is argued at the conceptual level by an academic preprint ("Agent Skills organize instructions, executable code, and supporting resources into modular skill units... a structured memory system that encodes how to perform tasks rather than merely what to know"), but this is a post-hoc academic interpretation of a product feature, not a claim Anthropic itself makes using CoALA vocabulary. It is a useful mental model, not evidence that Anthropic engineered the distinction as load-bearing internally.[^30][^31]

Elsewhere the taxonomy is closer to decorative labeling. Mem0's "short-term/long-term/user-scoped/session-scoped/agent-scoped" split is a namespace and retention-window distinction, not an episodic/semantic split, despite marketing language sometimes using both vocabularies interchangeably. Zep's "episodic/semantic/community" is a pipeline-stage distinction (raw ingestion -> extracted facts -> cluster summary), where episodic memory is explicitly "not directly queryable," meaning it functions as input buffer rather than a genuine retrievable memory type.[^17][^12][^13]

### Anthropic's own memory surface

The memory tool (beta, header `context-management-2025-06-27`) is a client-side tool: Claude issues structured commands (`create`, `view`, `str_replace`, `insert`, `delete`, `rename`) against a `/memories` directory, and the calling application executes the actual file I/O against whatever backend it chooses (local disk, database, encrypted cloud storage). Anthropic explicitly does not store the memory files itself; storage ownership, retention, and access control are the implementer's responsibility. The tool combines with context editing, which automatically clears old tool results once conversation context crosses a configured threshold; Anthropic's release notes report context editing alone delivered a 29% improvement (unspecified metric, vendor claim, not independently benchmarked in sources reviewed).[^32][^33][^34]

Claude Code implements a separate, higher-level surface: `CLAUDE.md` for human-written persistent instructions plus "auto memory," described in Anthropic's own documentation as "catatan yang Claude tulis sendiri berdasarkan koreksi dan preferensi Anda" (notes Claude writes itself based on your corrections and preferences). Each project gets its own memory directory at `~/.claude/projects/<project>/memory/`, with an `MEMORY.md` index file auto-loaded into every session, and subagents can maintain their own separate auto memory. Critically, Claude Code reads `CLAUDE.md`, not the competing open standard `AGENTS.md`; there is no automatic fallback, confirmed directly in Anthropic's documentation, so multi-tool teams must either symlink the two files or use Claude Code's `@import` mechanism inside `CLAUDE.md`.[^35][^36][^37]

Anthropic's engineering blog states the field-defining distinction for context engineering directly: "In contrast to the discrete task of writing a prompt, context engineering is iterative and the curation phase happens each time we decide what to pass to the model," describing context engineering as "the natural progression of prompt engineering," concerned with "the set of strategies for curating and maintaining the optimal set of tokens (information) during LLM inference, including all the other information that may land there outside of the prompts". This is the primary source; secondary sources (LinkedIn, YouTube explainers) largely restate it without adding new mechanism detail.[^38][^39][^40][^41]

Agent Skills (announced 16 October 2025, opened as a standard 18 December 2025) are structured as a folder centered on a `SKILL.md` file with metadata and task-oriented instructions, optionally with executable scripts and reference materials, and follow "context progressive disclosure": the agent loads only the short description into context by default and pulls the full skill body in only when relevant. This progressive-disclosure design is the direct mechanism for the harness pattern you are building: skills as procedural memory that does not bloat every prompt.[^42][^30]

### The file-as-memory pattern

The core practical argument for files over embeddings, as documented across the CLAUDE.md/AGENTS.md ecosystem, is that files are versionable, diffable, human-reviewable, and git-native, while vector store contents are none of those things by default. AGENTS.md, published August 2025 by OpenAI, Google, Cursor, Factory, Sourcegraph and others, is now Linux Foundation-hosted under the Agentic AI Foundation, with adoption "past sixty thousand repos" as of the source's writing. It is a single flat markdown file with no required schema and no import mechanism in the specification; tools that read it simply concatenate the file contents into model context as-is.[^43][^37]

A working convention that has emerged distinguishes three files by lifecycle and audience rather than treating them as redundant: AGENTS.md (project-wide consensus, shared across every tool and collaborator, lives in git); CLAUDE.md (Claude-specific overrides, also in git); and per-user memory (personal sediment, not in git, accumulates for a single machine/account). The stated failure mode from a practitioner writeup: "Push personal preferences into AGENTS.md and you poison your teammates' context. Push project commands into memory and they disappear the moment anyone else clones the repo". This is a direct, quotable mechanism-level warning relevant to your 40-person deployment: personal preference leakage into shared org files, and org policy leakage into personal memory, are the two concrete failure directions.[^36]

A second documented convention worth quoting verbatim because the exact rule matters: one practitioner's rule for the "agent writes to its own memory file" pattern is to "write a rule on every bash failure" changed to "write a rule only on the second occurrence of the same failure," logging the first occurrence merely as "observed X". This is a specific anti-noise mechanism for procedural memory writes that your harness rubric should probably borrow directly: single occurrences are logged as observations, not promoted to standing rules, until repeated.[^43]

### Benchmarks and evidence, examined critically

LoCoMo (Maharana et al., ACL 2024, 1,540 questions across single-hop/multi-hop/temporal/open-domain categories) and LongMemEval (500 questions across six categories including knowledge updates and multi-session recall) remain the two most-cited benchmarks. Both have been independently challenged on construct validity. The LoCoMo audit found 99 score-corrupting ground-truth errors across 1,540 questions (6.4%), including hallucinated facts in the answer key and incorrect temporal reasoning, and separately found the LLM-judge grading protocol "accepts up to 63% of intentionally wrong answers" under adversarial testing. The same audit argues LongMemEval-S is "more of a context window test than a memory test" because its entire ~115K-token corpus fits inside the context window of current frontier models, meaning it measures in-context retrieval rather than persistent cross-session memory.[^44][^45][^1]

An independent, cryptographically-signed benchmark harness ("Bench'd," May 2026) reports drastically different numbers than vendor self-reported figures for the same systems under controlled, identical conditions (GPT-4o-mini via OpenRouter): Mem0 OSS scored 32.4% on LongMemEval and 0.0% on LoCoMo in the independent harness, versus 93.4%/68.5% self-reported by the vendor; Graphiti and Letta scored 0.0% on LongMemEval in the same independent test. The gap between vendor-reported and independently-verified numbers here is not marginal, it is the difference between "best in class" and "non-functional under this harness." This is the single most important piece of evidence in this corpus for a practitioner: do not adopt a memory framework on the strength of a vendor-published benchmark table without either replicating the eval yourself or finding an independent third-party run.[^2]

### Failure modes at scale: real postmortems and writeups

Palo Alto Networks Unit 42 published a working proof-of-concept in which indirect prompt injection via a malicious webpage manipulates an agent's session summarization process, causing injected instructions to be written into long-term memory; once planted, the instructions "persist across sessions... incorporated into the agent's orchestration prompts," ultimately enabling silent exfiltration of a user's conversation history in future interactions. This is a named, published, mechanism-level postmortem, not a theoretical paper.[^46]

Microsoft researchers documented a real-world attack in the wild: 31 companies were found embedding hidden prompt injections inside "Summarize with AI" buttons that silently manipulate the memory of Copilot, ChatGPT, Claude, and Perplexity, formally classified under MITRE ATLAS as technique AML.T0080 (AI Agent Context Poisoning: Memory). This confirms memory poisoning is an active, deployed attack pattern against consumer-facing assistants with persistent memory, not purely an academic construct.[^47]

MINJA (Memory Injection Attack, NeurIPS 2025, arXiv 2503.03704) demonstrated over 95% injection success and roughly 70% attack success through query-only interaction against agents built on GPT-4o-mini, Gemini-2.0-Flash, and Llama-3.1-8B, with no backend access required. A follow-up systematic study on realistic conditions found "pre-existing legitimate memories dramatically reduce attack effectiveness," a partial mitigation discovered empirically rather than by design. A separate defense paper measured a median surviving poison lifetime of 12 weeks before any explicit purge, with some poisoned entries surviving to 26 weeks by consolidating into derivative memories, terming this the "Poison Half-Life".[^48][^7][^5]

Context rot and lost-in-the-middle are referenced across multiple 2026 sources as motivating context editing and progressive disclosure, but this research did not surface a named, quantified production postmortem specifically for context rot with a measured before/after metric from a real deployment; the LangMem p95 latency figure of 59.82 seconds is the closest concrete, sourced production-performance failure mode found, explicitly documented as making the tool "not viable" for interactive user-facing agents. Flag this as a gap: context rot is widely discussed but the strongest evidence found in this pass is architectural (Anthropic's context editing feature exists to address it) rather than a published incident report with before/after numbers.[^4][^3]

### Multi-user and organizational memory

The clearest documented separation pattern in this research is Mem0's namespace model: user-scoped memory is "isolated to individual user_id" (preferences and history), session-scoped is temporary and conversation-specific, and agent-scoped is "global or shared facts across users and agents". This is a namespace-key design, not a permissions system; access control is left to the implementing application.[^12]

The privacy-focused local-first system SuperLocalMemory (open-source, MIT license) documents "GDPR Article 17 erasure support" with behavioral data isolated in a separate database, and claims architectural isolation and Bayesian trust scoring specifically to prevent cross-session/cross-user memory propagation of poisoned content, reporting trust separation with a measured 72% trust degradation for "sleeper attacks" in its own evaluation. This is a vendor's own reported evaluation of its own system (self-conducted), so mark the specific percentage as a claim pending third-party replication, while the architectural pattern itself (separate isolated database for behavioral/personal data) is a reasonable design precedent regardless of the specific number's replication status.[^49]

For your specific deployment: Claude Code's per-project memory directory keyed to git repository identity (`~/.claude/projects/<project>/memory/`), with subagents maintaining their own separate auto memory, is the closest documented Anthropic-native pattern for separating personal working memory from shared project context, though it is designed around individual developers working on shared codebases rather than an organization-wide leadership-training knowledge base, so it will need adaptation, not direct reuse.[^35]

## Part 2: Self-Correction and Quality Gating

### Three findings that should change how you build

1. The most rigorous critical survey found on this topic states plainly: "no prior work demonstrates successful self-correction with feedback from prompted LLMs, except for studies in tasks that are exceptionally suited for self-correction," and separately, "self-correction works well in tasks that can use reliable external feedback". The load-bearing variable is not whether the model reflects, it is whether the feedback signal is external and reliable (execution results, ground truth, a separate verifier), not the model's own re-reading of its own output.[^50]

2. Reflexion's original design explicitly depends on oracle information unavailable in production: it "generates feedback by using an exact match between the generated and ground-truth answers, which cannot be accessed in real-world applications". A benchmark reproduction (CorrectBench) confirms self-correction without tools degrades output on real tasks: Reflexion without external tools showed declines on HotpotQA (-11.13%) and AQUA (-12.90%). Self-Refine on LLaMA3.1-8B showed similarly mixed results, improving MATH (+7.74) and GPQA (+10.88) while degrading HotpotQA (-14.21) and CS-QA (-12.25) in the same study. There is no universal "self-correction helps" or "self-correction hurts" answer; it is task-dependent and the direction is not predictable from task type alone without testing.[^51][^50]

3. Human corrections closing the loop back into a persisted artifact (rubric, prompt, or memory) is documented as a real product mechanism in exactly one place in this corpus with clear provenance: Braintrust's workflow where "when a user reports a bad response... the engineer opens the trace, clicks once, and the trace becomes an entry in the evaluation dataset that runs on every future deployment". Everywhere else reviewed, correction capture is described at the conceptual level (LangMem's procedural memory rewriting a system prompt from feedback ) without a documented, named production case study showing sustained improvement over time; treat the LangMem procedural-memory mechanism as demonstrated at the SDK level but not yet evidenced at the "sustained organizational improvement" level in sources found here.[^52][^53][^29]

### Self-correction literature, honestly stated

Reflexion (Shinn et al. 2023) introduced generate-critique-refine loops using self-reflection stored as episodic memory across trials, but its original evaluation relied on ground-truth exact match for feedback, an oracle signal not available at inference time in production. Self-Refine similarly uses the same model to critique and revise its own output with no external signal. CRITIC and Constitutional AI's critique-revise step differ in one structural way that matters: Constitutional AI critiques against an explicit written constitution/rubric rather than the model's own unguided judgment, which is closer to an external signal than pure self-reflection, though it is still the same model doing the critiquing.[^50]

The counter-evidence base is substantial and specific. "Large Language Models Cannot Self-Correct Reasoning Yet" (2023/2024) is the foundational negative result. The later critical survey (TACL, 2024/2025) formalized the conditions under which self-correction actually works after auditing prior papers for methodological flaws (oracle feedback, weak initial prompts): self-correction from prompted-LLM-generated feedback alone does not work in general tasks; self-correction works when reliable external feedback exists; large-scale fine-tuning (not prompting) can enable self-correction; and some narrow task types are exceptionally suited to it regardless. CorrectBench (2026) independently confirmed the negative direction is real and measurable: "nearly all data points fall below the baseline" for Reflexion without tools, and reasoning models with built-in correction (DeepSeek-R1-class) show "limited optimization under additional self-correction methods and high time costs," meaning bolting an external self-correction loop onto an already-strong reasoning model can be pure overhead.[^54][^51][^50]

A separate mechanistic decomposition ("Confidence vs. Critique," ACL 2025) breaks self-correction into two distinct capabilities that behave differently: confidence capability (maintaining correct answers correctly under self-scrutiny) and critique capability (actually fixing wrong answers), noting that "a decline in accuracy after self-correction is also witnessed," meaning a model can lose confidence in a correct answer it should have kept, which is a distinct failure mode from failing to fix a wrong one.[^55]

### Verifier and critic architectures

The clearest production-relevant distinction found is generator-verifier separation with an external, non-self-referential critic. AlphaLLM integrates Monte Carlo Tree Search with "a trio of critic models for precise feedback," explicitly built because "the efficacy of LLMs in self-refining its response... remains dubious" per its own stated motivation. This is a design choice to route around the self-correction limitation rather than solve it: separate critic models, not the generator judging itself.[^56]

No source in this research pass published a clean, generalizable "ratio of compute to generation versus verification" figure for production systems; this is flagged explicitly as a gap. The nearest proxy evidence is architectural rather than quantitative: best-of-N with a verifier and process reward models are referenced across the self-correction survey literature as the reliable external-feedback category that does work, but specific production compute-allocation ratios were not found and should not be inferred from academic ablations alone.

### Evaluation infrastructure in practice

A convergent, well-sourced practical answer emerged on "how many test cases is enough": multiple independent 2026 practitioner sources converge on 20 to 50 curated, real (not synthetic) inputs for a CI-gated golden set, explicitly warning that "tighter than that is too small to be meaningful; looser than that takes too long to run on every PR and accumulates noisy cases nobody investigates". For a broader labeled comparison dataset (not a CI gate, but a framework-selection benchmark), the recommendation shifts to 200 to 1,000 representative production examples.[^57][^58]

The documented three-layer CI pattern is: schema checks (fastest, cheapest; does output match expected shape), golden-set scoring (programmatic checks plus LLM-as-judge for open-ended content), and diff-against-baseline (block merge if candidate scores worse than production by more than a defined threshold). The verbatim guidance on avoiding brittle tests: "'Must classify as refund' is a useful expectation. 'Must equal refund: yes' is brittle and treats every wording change as a regression". For subjective, taste-based tasks specifically (directly relevant to your leadership-training use case), the documented fix for judge brittleness is: "Tighten the rubric... replace it with a rubric that scores the structural property you actually cared about," and "use LLM-as-judge for open-ended cases" while calibrating the judge against hand-labeled examples first, because an exact-match assertion "does not tolerate style drift" the way a calibrated judge can.[^59][^57]

Tool selection by job, as documented across independent comparison sources: Promptfoo is CLI-first, open-source (MIT), YAML-config-driven, purpose-built for CI regression gates and includes red-team plugins (jailbreak, PII leak, prompt injection, hallucination). It explicitly ships a "Memory Poisoning" red-team plugin that scripts an attack sequence: establish a memory, send a poisoned message attempting to corrupt it, then test whether a follow-up question reflects the original memory (secure) or the poisoned one (vulnerable). This is directly reusable for testing your own harness's memory layer. Braintrust and LangSmith are SaaS platforms for production trace analysis, dataset curation, and human-review workflows, slower (minutes to hours) but with the closed-loop "click to add to eval set" mechanism described above. Inspect (not detailed at mechanism level in sources found) is referenced as the choice for frontier-model safety/capability evals rather than application-level prompt testing. A reasonable starting stack repeatedly recommended: Promptfoo in CI for every prompt-touching pull request, plus a tracing/observability layer (Langfuse, Phoenix, or Braintrust) for production monitoring, calibrating any LLM-as-judge against hand-labeled examples before trusting it.[^60][^61][^53][^58][^62][^59]

### Guardrails and gating

This research did not surface a rigorous, cited, primary-source published comparison specifically contrasting NeMo Guardrails against Guardrails AI on where in the pipeline checks should sit (pre-generation constraint vs post-generation review vs human approval gate); this is flagged as a gap requiring direct primary-source investigation of both projects' own documentation, which was not completed in this research pass. What is well documented is the layered-defense pattern from the memory poisoning literature, which is directly transferable to a harness gate design: retrieved memory or generated content should be treated structurally as "data, not instructions" (untrusted by default), given provenance metadata at write time, gated by a signed-write requirement with scope and time-to-live, and subjected to periodic human or automated review for high-impact writes before they become standing instructions. Promptfoo's red-team plugin architecture operationalizes a version of post-generation review testing (does the output reflect poisoned vs. legitimate memory) that could be adapted into a pre-production gate for your skill and rubric changes.[^63][^64][^62]

### Feedback loops that actually close: the honest state

The single clearest, mechanism-documented, named example of human correction demonstrably improving a system over time, with provenance, is Braintrust's one-click "trace to eval dataset entry" workflow, which converts a specific reported failure into a permanent regression test that runs on every future deployment. LangMem's `create_prompt_optimizer` is architecturally capable of the same class of loop (episodic feedback rewriting procedural memory, i.e., the system prompt) and is demonstrated at the SDK/tutorial level, but this research did not find a named production case study quantifying sustained improvement from this specific mechanism over a period of months; treat it as demonstrated-at-the-component-level, not demonstrated-at-the-organizational-outcome-level.[^53][^52][^29]

The practitioner convention quoted earlier for CLAUDE.md/MEMORY.md (log a single occurrence as an observation, promote to a standing rule only on the second occurrence of the same failure) is itself a feedback-loop design pattern intended to prevent noisy over-promotion of one-off corrections into permanent procedural memory, directly addressing your "what happens when it is wrong" rule.[^43]

### The measurement problem: workslop and outcome metrics

The BetterUp/Stanford Social Media Lab research (September 2025, survey of 1,004 to 1,150 full-time US desk workers depending on the specific release) coined "workslop," defined as "AI-generated work content that masquerades as good work, but lacks the substance to meaningfully advance a given task". The published figures: 40% of employees believe they received workslop in the last month, and workers estimate that 15.4% of the work they receive is AI workslop on average. This survey-based, self-reported data should be read as a claim about perception, not an independently measured productivity metric; it is nonetheless the most cited source connecting consumption-based AI adoption metrics (seats, sessions) to a documented downstream cost, framed explicitly by researchers as a candidate explanation for "the 95% of organizations that have tried AI but report seeing zero" measurable return, per a Harvard Business Review framing cited in TechCrunch's coverage.[^65][^66][^67]

This research did not find a rigorous published successor study that operationalizes a validated outcome metric for knowledge-work quality beyond the original workslop survey (e.g., a peer-reviewed, quantitatively validated instrument distinct from the original self-report survey); this is flagged as a genuine evidence gap as of July 2026. Practitioners building an outcome-based measurement system for a harness should treat "reduction in reported workslop" and "seat/session/token consumption" as two different, currently uncorrelated metric families, and should not assume that reducing the latter improves the former without direct measurement.

### Drift and decay over six to twelve months

No source in this research pass provided a rigorous, quantified, longitudinal (six to twelve month) published maintenance case study for a harness specifically. The closest documented quantitative proxy is the memory poisoning "Poison Half-Life" concept (median 12-week survival before purge, up to 26 weeks via consolidation into derivative memories), which is adjacent to but not the same phenomenon as ordinary rule staleness or skill collision. The CLAUDE.md/AGENTS.md ecosystem sources describe practitioner-level anti-decay conventions (two-strikes promotion rule, source-of-truth file hierarchy, periodic review sweeps for high-impact memory writes) as living practice rather than as a study with before/after measurement. This is a genuine gap in the current literature: prompt bloat, skill collision, and rule staleness are widely discussed as folk wisdom in practitioner writeups but this research did not locate a peer-reviewed or rigorously benchmarked study quantifying harness decay over a defined multi-month period. Flag any such claim you encounter elsewhere as unverified until you see a dataset and methodology.[^36][^48][^43]

---

## References

1. [We audited LoCoMo: 6.4% of the answer key is wrong and ...](https://dev.to/penfieldlabs/we-audited-locomo-64-of-the-answer-key-is-wrong-and-the-judge-accepts-up-to-63-of-intentionally-33lg) - Projects are still submitting new scores on LoCoMo as of March 2026. We audited it and found 6.4% of...

2. [AI Memory Benchmarks 2026: Complete Guide to Evaluating Agent ...](https://benchd.ai/benchmarks) - Independent benchmark results and methodology for evaluating AI memory systems.

3. [How to Add Long-Term Memory to LangChain Agents](https://atlan.com/know/long-term-memory-langchain-agents/) - How to add long-term memory to LangChain agents using LangGraph checkpointer, BaseStore, LangMem SDK...

4. [LangGraph Memory vs Mem0: Which Should You Use in 2026?](https://atlan.com/know/ai-agent/ai-agent-memory/langgraph-memory-vs-mem0/) - Compare LangGraph memory (checkpointer + LangMem) vs Mem0 for AI agents. Latency, token reduction, m...

5. [Memory Poisoning Attack and Defense on Memory Based LLM-Agents](https://arxiv.org/abs/2601.05504) - Large language model agents equipped with persistent memory are vulnerable to memory poisoning attac...

6. [A Systematic Study of Memory Poisoning Attacks in LLM ...](https://arxiv.org/html/2606.04329v1) - We also show that existing prompt injection defenses fail to cover memory poisoning attacks. Our fin...

7. [What is Agent Memory Poisoning?](https://www.youtube.com/watch?v=YQnQucM7YUU) - The MINJA attack poisons an AI agent's persistent memory. Imagine poisoning an AI agent's long-term ...

8. [Letta (MemGPT) — The Memory-Native Agent Framework ...](https://chatforest.com/reviews/letta-memgpt-stateful-agent-framework/) - Letta (letta-ai/letta, ~22.4K stars, Apache 2.0, Python, v0.16.7) is the production evolution of the...

9. [MemGPT — Letta | Documentation](https://docs.letta.com/letta_memgpt) - Learn about the key ideas behind MemGPT

10. [Mem0 vs Letta (MemGPT): AI Agent Memory Compared (2026)](https://vectorize.io/articles/mem0-vs-letta) - Mem0 vs Letta (MemGPT) — compare passive memory extraction with self-editing agent runtime for AI ag...

11. [Agent Memory Architecture Wars 2026: Letta, Mem0, and Zep vs ...](https://agentmarketcap.ai/blog/2026/04/08/agent-memory-architecture-wars-letta-mem0-zep-native-provider) - How Letta, Mem0, and Zep compare on multi-session accuracy, storage cost, and privacy compliance — a...

12. [Mem0 [AI Agent Knowledge Base]](https://agentwiki.org/mem0) - Mem0 is a universal, self-improving memory layer for AI agents and LLM applications that combines ve...

13. [Mem0 Guide 2026: Add Persistent Memory to Your AI Agents](https://baeseokjae.github.io/posts/mem0-agent-memory-guide-2026/) - Add persistent memory to AI agents with Mem0: architecture, quick start, memory scoping, LangChain i...

14. [architecture.md - mem0-plugin - GitHub](https://github.com/mem0ai/mem0/blob/main/mem0-plugin/skills/mem0/references/architecture.md) - Universal memory layer for AI Agents. Contribute to mem0ai/mem0 development by creating an account o...

15. [markmbain/mem0ai-mem0: The memory layer for ...](https://github.com/markmbain/mem0ai-mem0) - The memory layer for Personalized AI. Contribute to markmbain/mem0ai-mem0 development by creating an...

16. [What Is a Temporal Knowledge Graph? Definition - Zep](https://www.getzep.com/ai-agents/temporal-knowledge-graph/) - A temporal knowledge graph records when each fact was true and where it came from. Standard vs tempo...

17. [Temporal Memory with Zep — When Your App Needs to Track ...](https://www.vibereference.com/ai-development/zep-temporal-memory) - Zep and the open-source Graphiti engine give your AI app bi-temporal memory: track when facts became...

18. [Zep: A Temporal Knowledge Graph Architecture for Agent ...](https://arxiv.org/abs/2501.13956) - We introduce Zep, a novel memory layer service for AI agents that outperforms the current state-of-t...

19. [LangMem — LangChain](https://www.memoryatlas.dev/frameworks/langmem) - Procedural memory — learns how to do tasks and rewrites the agent's own behavior/prompts.

20. [LangMem | Ry Walker Research](https://rywalker.com/research/langmem) - LangMem is an open-source Python SDK by LangChain that gives LangGraph agents long-term memory — sem...

21. [Long-term Memory: LangMem SDK Conceptual Guide](https://www.youtube.com/watch?v=snZI5ojuMRc) - This is the conceptual video for the LangMem SDK launch. For "How-to" guides on particular memory ty...

22. [LangGraph : LangMemによる記憶管理の基本 - Zenn](https://zenn.dev/hakoten/articles/5790e567da4b3a)

23. [LangMem](https://langchain-ai.github.io/langmem/) - Build language agents as graphs

24. [A-MEM: Agentic Memory for LLM Agents](https://arxiv.org/pdf/2502.12110.pdf) - While large language model (LLM) agents can effectively use external tools
for complex real-world ta...

25. [Nautilus Compass: Black-box Persona Drift Detection for Production LLM Agents](https://arxiv.org/abs/2605.09863) - Production LLM coding agents drift over long sessions: they forget user-specified constraints, slip ...

26. [AI-native Memory 2.0: Second Me](https://arxiv.org/pdf/2503.08102.pdf) - Human interaction with the external world fundamentally involves the exchange
of personal memory, wh...

27. [Storage Is Not Memory: A Retrieval-Centered Architecture for Agent ...](https://arxiv.org/html/2605.04897v1)

28. [Benchmark methodology review + complementary approach from ...](https://github.com/MemPalace/mempalace/discussions/747) - Hey, great work on mempalace. The core insight — raw verbatim text + good embeddings beats LLM extra...

29. [LangMem SDK for agent long-term memory](https://www.langchain.com/blog/langmem-sdk-launch) - Build smarter AI agents with LangMem SDK's long-term memory. Extract insights, optimize behavior, an...

30. [[PDF] Yaxiong Wu1 and Yongyue Zhang1 1Independent Researcher ...](https://d197for5662m48.cloudfront.net/documents/publicationstatus/301837/preprint_pdf/30c77607793c78fb0b5a9ef10908536f.pdf)

31. [Agent Skills from the Perspective of Procedural Memory](https://www.techrxiv.org/doi/pdf/10.36227/techrxiv.176857932.25697838/v1) - by Y Wu · 2026 · Cited by 10 — Anthropic Agent Skills provide a practical realization of procedural ...

32. [Herramienta de memoria - Claude Docs - Home - Anthropic](https://anthropic.mintlify.app/es/docs/agents-and-tools/tool-use/memory-tool) - La herramienta de memoria permite a Claude almacenar y recuperar información a través de conversacio...

33. [Anthropic's memory tool, explained · CognitiveX · iCog](https://cognitivx.io/blog/anthropic-memory-tool-explained) - What Anthropic's memory tool actually is, how Claude's memory tool works, and where a file-backed me...

34. [Memory tool (API) - Claude Master](https://claudemaster.net/features/api-memory-tool) - The memory tool is a beta API feature that lets Claude persistently store, retrieve, update, and del...

35. [Bagaimana Claude mengingat proyek Anda](https://code.claude.com/docs/id/memory)

36. [A Project Passport with AGENTS.md, CLAUDE.md, and memory](https://chenguangliang.com/en/posts/blog194_project-passport-agents-md-claude-md-memory/) - AGENTS.md is the de facto standard in 2026, CLAUDE.md is still Claude Code's richer format, and proj...

37. [AGENTS.md vs CLAUDE.md: Does Claude Code or Codex ...](https://agyn.io/blog/claude-md-agents-md-compatibility) - Claude Code reads CLAUDE.md, Codex reads AGENTS.md, and neither falls back to the other. Here's the ...

38. [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) - Anthropic is an AI safety and research company that's working to build reliable, interpretable, and ...

39. [Context Engineering: What Anthropic, LangChain, and the ...](https://www.tentrilliontriangles.com/blog/2026-07-01-context-engineering-vs-prompt-engineering/) - Anthropic, LangChain, and LlamaIndex shipped three different definitions of context engineering in 2...

40. [New on the Anthropic Engineering Blog: Most developers ... - LinkedIn](https://www.linkedin.com/posts/anthropicresearch_new-on-the-anthropic-engineering-blog-most-activity-7378864157699244033-Y9U6) - New on the Anthropic Engineering Blog: Most developers have heard of prompt engineering. But to get ...

41. [Context Engineering Explained: Why Prompt Engineering Is No Longer Enough (2026)](https://www.youtube.com/watch?v=sDkx_hz67ko) - Prompt engineering got us far — but it's no longer enough.

In 2026, the developers getting the best...

42. [agent-skills.md](https://agentswelcome.dev/glossary/agent-skills.md)

43. [CLAUDE.md and AGENTS.md, In Depth: From Basics to ...](https://redreamality.com/blog/claude-md-agents-md-deep-dive/) - From Anthropic's official guidance to Karpathy's program.md paradigm, from the two-strikes rule to D...

44. [AI Memory Benchmarks 2026: LoCoMo, LongMemEval & ...](https://mem0.ai/blog/ai-memory-benchmarks-in-2026) - LoCoMo 92.5%, LongMemEval 94.4%, BEAM 1M 62%: a breakdown of every major AI memory benchmark in 2026...

45. [Benchmarks for agent memory. - Zep](https://www.getzep.com/research/) - Benchmark results on LoCoMo and LongMemEval, two industry benchmarks for long-running agent memory.

46. [When AI Remembers Too Much – Persistent Behaviors in ...](https://unit42.paloaltonetworks.com/indirect-prompt-injection-poisons-ai-longterm-memory/) - Indirect prompt injection can poison long-term AI agent memory, allowing injected instructions to pe...

47. [AI Memory Poisoning: How Prompt Injection Attacks ... - ALM Corp](https://almcorp.com/blog/ai-memory-poisoning-prompt-injection-attacks/) - Microsoft researchers found 31 companies embedding hidden prompt injections in 'Summarize with AI' b...

48. [The Three Defenses](https://www.armalo.ai/labs/research/2026-05-10-memory-poisoning-persistent-context-attack-surface)

49. [SuperLocalMemory: Privacy-Preserving Multi-Agent Memory with Bayesian Trust Defense Against Memory Poisoning](https://arxiv.org/abs/2603.02240) - We present SuperLocalMemory, a local-first memory system for multi-agent AI that defends against OWA...

50. [When Can LLMs Actually Correct Their Own Mistakes? A Critical Survey of Self-Correction of LLMs](https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00713/125177/When-Can-LLMs-Actually-Correct-Their-Own-Mistakes) - Abstract. Self-correction is an approach to improving responses from large language models (LLMs) by...

51. [Can LLMs Correct Themselves? A Benchmark of Self ... - arXiv](https://arxiv.org/html/2510.16062v1)

52. [Build Self-Improving Agents: LangMem Procedural Memory Tutorial](https://www.youtube.com/watch?v=WW-v5mO2P7w) - Learn how to implement dynamic instruction learning in LLM agents using the LangMem SDK. This techni...

53. [Braintrust vs. Promptfoo: 2026 LLM evaluation comparison](https://www.braintrust.dev/articles/braintrust-vs-promptfoo) - Promptfoo is a CLI-first, open-source tool for LLM evaluation. Promptfoo requires teams to recreate ...

54. [Large Language Models Cannot Self-Correct Reasoning Yet](https://arxiv.org/pdf/2310.01798.pdf) - Large Language Models (LLMs) have emerged as a groundbreaking technology with
their unparalleled tex...

55. [[PDF] A Decomposition of Self-Correction Capability for LLMs](https://aclanthology.org/2025.acl-long.203.pdf)

56. [Toward Self-Improvement of LLMs via Imagination, Searching, and Criticizing](https://arxiv.org/abs/2404.12253) - Despite the impressive capabilities of Large Language Models (LLMs) on various tasks, they still str...

57. [Prompt Regression Testing | The Prompt Bench](https://thepromptbench.com/evals-and-testing/prompt-regression-testing/) - Preventing prompts from silently getting worse: golden sets as contracts, CI integration, prompt ver...

58. [Best Prompt Testing Frameworks 2026: 7 Compared](https://futureagi.com/blog/best-prompt-testing-frameworks-2026/) - Promptfoo, FutureAGI, Braintrust, LangSmith, Inspect AI, MLflow, OpenPipe for prompt testing in 2026...

59. [Best LLM Evaluation Tools (2026): Tested and Compared](https://aitoolsbakery.com/blog/best-llm-evaluation-tools/) - A practical guide to the leading LLM evaluation tools: what they measure, how they differ, and which...

60. [Prompt Testing & Evaluation Tools 2026: Promptfoo vs Braintrust vs ...](https://www.promptquorum.com/prompt-engineering/best-prompt-testing-evaluation-tools?lang=jp)

61. [Eval Frameworks Compared | The Prompt Bench](https://thepromptbench.com/evals-and-testing/eval-frameworks-compared/) - A working comparison of the main LLM eval frameworks: Inspect, Promptfoo, Braintrust, LangSmith, Dee...

62. [Memory Poisoning Plugin](https://www.promptfoo.dev/docs/red-team/plugins/memory-poisoning/) - The Memory Poisoning plugin tests whether stateful agents are vulnerable to memory poisoning attacks...

63. [Episode 06 02 — Memory poisoning the attack that persists across sessions](https://www.youtube.com/watch?v=HmBFWibzL-w) - Prompt injection is a hit-and-run. You read one poisoned page, the session ends, the attack is
gone....

64. [Agent Memory Poisoning: The Attack That Persists Across ...](https://tianpan.co/blog/2026-04-10-agent-memory-poisoning-persistent-compromise) - Memory poisoning lets attackers plant instructions into an agent's long-term memory that survive acr...

65. [Workslop: The Hidden Cost of AI-Generated Busywork](https://www.betterup.com/workslop) - Research from BetterUp Labs and Stanford Social Media Lab uncovers how AI-generated “slop” masquerad...

66. [Beware co-workers who produce AI-generated 'workslop'](https://techcrunch.com/2025/09/27/beware-coworkers-who-produce-ai-generated-workslop/) - BetterUp Labs researchers suggest that workslop could be one explanation for the 95% of organization...

67. [What is AI workslop? Research on costs and solutions](https://www.betterup.com/blog/hidden-costs-workslop) - AI “workslop” — unhelpful, low-quality AI-generated content — is quietly draining productivity and t...

