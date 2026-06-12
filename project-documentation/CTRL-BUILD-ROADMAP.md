# CTRL - Build Roadmap

> The Corpus is the destination; this is the route. Sequenced by **value and proof**, not by feature list. Decision (D3): a clean-room **frontend rebuild on the existing Supabase backend**, learn-loop first. The moat and engines survive; the surfacing is reborn; the cut wires get closed.

**Two principles govern the sequence:**
1. **Ship the core promise before the new paint.** The thing that makes CTRL *CTRL* - "it finally learns from me" - lives in the backend and is independent of the UI rebuild. It goes first.
2. **Every phase ships a felt win with honest proof.** No phase is "plumbing we'll surface later." If a user couldn't feel it and we couldn't prove it, it isn't a phase.

**Parallelism:** Phase 0 (backend) and Phase 1 (frontend foundation) touch different layers and run *concurrently*. Phases 2→5 are largely sequential.

---

## Phase 0 - "It finally learns" *(backend · decoupled · ships first)*
**Goal:** make the single most important promise true and honest, on the live app, before anything else.
**Work (leverage-ordered, from `_INTELLIGENCE-LAYER.md`):**
- Fire `touch_memory_fact` on every fact injection (`getUserContext` / `buildMemoryContext`). *The single highest-leverage line in the codebase.*
- Schedule the two dormant engines on one per-user cron: `memory-lifecycle` → `memory-synthesize`. Temperature now tracks reliance; patterns populate.
- Fix the capture leak: route the live "Add memory" path back through the hygiene chain + encryption.
- Kill the vanity thermometers **until** they're backed; surface the receipts that already exist ("why am I seeing this": matched fact + score).
**Ships:** the memory web honestly thickens; the faked green tick dies; a returning user sees real change.
**Proof:** `reference_count` moves; `user_patterns` populates for real users; cold-vs-loaded gap is demonstrable.

## Phase 1 - The clean room *(frontend foundation · concurrent with Phase 0)*
**Goal:** one calm frame to build the experience into; the spaghetti gone.
**Work:** new shell + **one** nav config; the mobile (consume+capture) vs desktop (create) split; the Clarity-Loop design primitives (option-cards, sharp-scaffold patterns, adaptive density/warm tone); quarantine then delete the dead ~70%; collapse the parallel `leader_*` stack into one memory schema; one context-builder.
**Ships:** a coherent, zero-scroll mobile + desktop frame; the IA is one source of truth.
**Proof:** nav drift impossible (one config); dead code gone; both shells fit-to-viewport.

## Phase 2 - The Clarity Loop + unified Memory *(the spine you feel)*
**Goal:** the daily 5-minute loop and "it knows me," for real.
**Work:** the mobile morning - digest → one choice → bank (pre-rendered, no Generate button, data-realist); **one** Memory surface (capture/verify/edit/view unified) with the **web itself as the editable object**; **Identity** as a first-class object (Role/Voice/Standards/Never-rules; voice mined from pasted writing, `confident|guessing` flags).
**Ships:** the daily loop; the editable digital brain; the owned identity layer.
**Proof:** a leader takes one real step in <5 min one-handed; a memory is edited in exactly one place; identity drives outputs.

## Phase 3 - The engine surfaces *(sharper decisions · honest magic, on)*
**Goal:** turn the differentiated results on and surface their receipts.
**Work:** Decide closes its loop (writes verdict+breakpoint back to memory; consumes the user's own call; the **return-ask** spine) + progressive-disclosure verdict; **briefing v2 default-on** after burn-in with the matched-fact + score receipts surfaced; the amplify-vs-automate model unified on Edge; the Kit fork wired (graduation into CTRL, shared spine).
**Ships:** uniquely-relevant briefings with receipts; pressure-testing that thickens memory; the two-product fork live.
**Proof:** v2 on; every story carries its receipt; a Decide verdict provably updates the memory graph.

## Phase 4 - Self-correction *(the keystone moat)*
**Goal:** build the deck's keystone - corrections that compound into an inspectable rule library.
**Work:** `correction_log` + `correction_rules`; the forced footer (LOG root cause → PROPOSE class-killing rule → WRITE BACK on approval); the 4× recurrence guard; rules write back into identity never-rules, memory, and every export.
**Ships:** the rule library you watch grow; "the same mistake doesn't survive four occurrences."
**Proof:** a thumbs-down becomes a kept, class-killing rule with an audit trail; recurrence is caught.

## Phase 5 - Trust at scale *(calibration · honesty rails · consolidation tail)*
**Goal:** make it trustworthy and close the circle.
**Work:** the **ECE < 0.1** calibration gate on the verification engine (when it says 80%, it's right ~80%); spread the methodology beyond Decide (confidence bands + counter-case discipline on briefings/memos/exports); enforce the honesty rails (no UI implies learning that isn't happening; scope fence holds; corrections cost one tap); finish the dedup and retire the legacy stack.
**Ships:** the four moat pillars wired into one closed, honest, compounding loop.
**Proof:** calibration gate passes in CI; no unbacked "learning" UI remains anywhere.

---

## How a phase gets built
When we commit to a phase, the next step is **its file-level implementation spec** - and *that* is where parallelism earns its keep: agents scope the exact files/functions/migrations against the live repo, an adversarial pass verifies the plan, then implementation lands in an isolated worktree as reviewable PRs. Strategy is authored solo for coherence; construction is fanned out for thoroughness.

## Open §16 items, resolved inside the plan (not blocking)
- **Decision sub-scopes** within AI-adoption / org-re-architecture / strategic-bets - settled when Phase 2/3 designs the decision intake.
- **Voice timing** (per-user voice vs neutral chrome + user-voiced outputs) - settled in Phase 2 (Identity).
- **Commercial** (wedge, freemium vs cohort, pricing) - settled before Phase 3 ships the paywalled surfaces.
- **Team / agentic-org layer** - explicitly post-v1.
