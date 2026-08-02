# CTRL - Build Roadmap

> **RECONCILIATION BANNER (last reconciled 2026-08-02, first written 2026-06-21).** This roadmap is a dated build record (state as of 2026-06-17). Phases 0 to 4 shipped against the prior "clarity engine" positioning and the dark redesign. It predates the LOCKED AI-native positioning (2026-06-19) and the two halves that shipped after: the kit redesign (PRs #206-212) and the main-app polish (PRs #215-222). Read it as a historical route, not the current plan. The current product/build truth is `docs/MAIN-APP-POLISH-SPEC.md`, `docs/KIT-REDESIGN-SPEC.md`, and `CLAUDE.md`.
>
> **Also now historical (shipped since the 2026-06-21 pass, verified against code/git log 2026-08-02):** the unified onboarding -> decisions -> engagement loop (PR #298, 2026-06-29, which deleted the `VITE_COCKPIT_ENABLED` fork and the legacy Memory dashboards this roadmap's "Remaining" items implicitly assumed still existed); the Decisions tab rebuilt as a radial force spider (PRs #308-320); the evidence-corpus sharpening (PR #321, 2026-07-03) which closed two items this roadmap lists as outstanding - **the brain canvas Strengthen/Fix actions are now LIVE (were UI-disabled; see Decision 45/61 note below), and the context file / decision memo affordances shipped**; a Settings/design-system audit (2026-07-04); Edge Pro repriced to $49/month and repositioned as the decision tier (PRs #326-327, 2026-07-04); a founder-signed North Star flywheel metric (PR #330, 2026-07-04, `project-documentation/NORTH_STAR.md`); and a further Home rebuild (glance-only cards, tap-to-read sheets, trend "shift" cards, a `/download` capture page - PRs #322-324, #332-334). None of this changes the roadmap's shape; it further confirms Phase 5's "Remaining" tail is where live truth now lives. Canonical current sources for all of the above: `docs/CTRL-SYSTEM-SPEC.md` (sections 6-9), `project-documentation/NORTH_STAR.md`, `CHANGELOG.md`, and `CLAUDE.md`. TODO(founder): decide whether this roadmap is retired or rewritten to the AI-native build sequence.

> The Corpus is the destination; this is the route. Sequenced by **value and proof**, not by feature list. Decision (D3): a clean-room **frontend rebuild on the existing Supabase backend**, learn-loop first. The moat and engines survive; the surfacing is reborn; the cut wires get closed.

> **STATE AS OF 2026-06-17.** This was the route; here is what shipped against it. Phases 0-4 are substantially shipped and prod-verified; each is annotated inline with its merge PRs. The clean-room rebuild landed as the dark instrument redesign (PR #186, merge `1c01db5`, 2026-06-16). The engine surfaces and the kit program landed across #187-193. Self-correction landed via the brain engine (#153-164) and its `brain_adapt` migrations. The genuinely-outstanding items (the formal ECE < 0.1 calibration gate, full legacy-stack retirement, methodology-everywhere) are demoted to a short "Remaining" tail at the end. (updated 2026-06-17)

**Two principles govern the sequence:**
1. **Ship the core promise before the new paint.** The thing that makes CTRL *CTRL* - "it finally learns from me" - lives in the backend and is independent of the UI rebuild. It goes first.
2. **Every phase ships a felt win with honest proof.** No phase is "plumbing we'll surface later." If a user couldn't feel it and we couldn't prove it, it isn't a phase.

**Parallelism:** Phase 0 (backend) and Phase 1 (frontend foundation) touch different layers and run *concurrently*. Phases 2→5 are largely sequential.

---

## Phase 0 - "It finally learns" *(backend · decoupled · ships first)* - **SHIPPED** (brain engine, PRs #153-164)
**Goal:** make the single most important promise true and honest, on the live app, before anything else.
**Work (leverage-ordered, from `_INTELLIGENCE-LAYER.md`):**
- Fire `touch_memory_fact` on every fact injection (`getUserContext` / `buildMemoryContext`). *The single highest-leverage line in the codebase.*
- Schedule the two dormant engines on one per-user cron: `memory-lifecycle` → `memory-synthesize`. Temperature now tracks reliance; patterns populate.
- Fix the capture leak: route the live "Add memory" path back through the hygiene chain + encryption.
- Kill the vanity thermometers **until** they're backed; surface the receipts that already exist ("why am I seeing this": matched fact + score).
**Ships:** the memory web honestly thickens; the faked green tick dies; a returning user sees real change.
**Proof:** `reference_count` moves; `user_patterns` populates for real users; cold-vs-loaded gap is demonstrable.
**Shipped status:** the usage signal fires, the lifecycle and pattern engines run, and self-correction exists - landed in the brain engine (PRs #153-164). The faked green tick is dead because the thermometer only moves when the usage count moves.

## Phase 1 - The clean room *(frontend foundation · concurrent with Phase 0)* - **SHIPPED** (clean-room redesign, PR #186, merge `1c01db5`, 2026-06-16)
**Goal:** one calm frame to build the experience into; the spaghetti gone.
**Work:** new shell + **one** nav config; the mobile (consume+capture) vs desktop (create) split; the Clarity-Loop design primitives (option-cards, sharp-scaffold patterns, adaptive density/warm tone); quarantine then delete the dead ~70%; collapse the parallel `leader_*` stack into one memory schema; one context-builder.
**Ships:** a coherent, zero-scroll mobile + desktop frame; the IA is one source of truth.
**Proof:** nav drift impossible (one config); dead code gone; both shells fit-to-viewport.
**Shipped status:** the clean-room rebuild landed as the dark instrument redesign (PR #186) - ported the dark instrument palette, forced dark globally, replaced the old green Mindmaker logo with the emerald `ctrl.` wordmark everywhere, and rebuilt the mobile cockpit, decision spine, StoneRead, brain four-world rope canvas, capture, and onboarding. Prod-verified with screenshots. *Backstory: it had earlier been falsely claimed "live" while the app was still the old UI; #186 is the real ship.* *Remaining sliver: full legacy-stack retirement is on the Remaining tail; residual green persists in a few tokens/surfaces (see Remaining).*

## Phase 2 - The Clarity Loop + unified Memory *(the spine you feel)* - **SHIPPED** (clean-room redesign, PR #186)
**Goal:** the daily 5-minute loop and "it knows me," for real.
**Work:** the mobile morning - digest → one choice → bank (pre-rendered, no Generate button, data-realist); **one** Memory surface (capture/verify/edit/view unified) with the **web itself as the editable object**; **Identity** as a first-class object (Role/Voice/Standards/Never-rules; voice mined from pasted writing, `confident|guessing` flags).
**Ships:** the daily loop; the editable digital brain; the owned identity layer.
**Proof:** a leader takes one real step in <5 min one-handed; a memory is edited in exactly one place; identity drives outputs.
**Shipped status:** the mobile cockpit (digest → one choice → bank), the unified brain four-world rope canvas as the editable object, and the first-class Identity layer all landed in PR #186. *Residual: brain edges are derived, not stored. (The brain canvas Strengthen/Fix actions, listed here as UI-disabled at the 2026-06-17/21 state, went LIVE in PR #321, 2026-07-03 - see the reconciliation banner above.)*

## Phase 3 - The engine surfaces *(sharper decisions · honest magic, on)* - **SHIPPED** (limits phases #187-189; kit program #190-193)
**Goal:** turn the differentiated results on and surface their receipts.
**Work:** Decide closes its loop (writes verdict+breakpoint back to memory; consumes the user's own call; the **return-ask** spine) + progressive-disclosure verdict; **briefing v2 default-on** after burn-in with the matched-fact + score receipts surfaced; the amplify-vs-automate model unified on Edge; the Kit fork wired (graduation into CTRL, shared spine).
**Ships:** uniquely-relevant briefings with receipts; pressure-testing that thickens memory; the two-product fork live.
**Proof:** v2 on; every story carries its receipt; a Decide verdict provably updates the memory graph.
**Shipped status:** the engine surfaces landed in the "limits" phases #187-189 (fact-to-fact edge graph, Strengthen/Fix RPCs, reliable reaction numbers, evidence tiers, track-record depth; migrations `20260615*_brain_*`, `20260616120000_memory_edges`). The Kit fork shipped in earnest as the kit program: the Agentic Org Chart kit (#190/#191) and a parity retrofit of all three existing kits to fork + pick-cascade + a live picks-board (#192). PR #193 (merge `090dda2`, 2026-06-17) fixed a major latent intake bug - the forked-kit cascade had silently dropped its back half for every kit since launch, so guardrails/grind/involves/maturity were never captured - and added an honesty floor on the composed org chart so a box touching a flagged guardrail can never be left agent-led. *Residual: number-heroes fall back to words-led where current data is thin; pre-#193 `kit_builds.intake` rows are truncated and untrustworthy.*

## Phase 4 - Self-correction *(the keystone moat)* - **SHIPPED** (brain engine #153-164; `brain_adapt` migrations)
**Goal:** build the deck's keystone - corrections that compound into an inspectable rule library.
**Work:** `correction_log` + `correction_rules`; the forced footer (LOG root cause → PROPOSE class-killing rule → WRITE BACK on approval); the 4× recurrence guard; rules write back into identity never-rules, memory, and every export.
**Ships:** the rule library you watch grow; "the same mistake doesn't survive four occurrences."
**Proof:** a thumbs-down becomes a kept, class-killing rule with an audit trail; recurrence is caught.
**Shipped status:** the self-correction primitive landed in the brain engine (#153-164) with its `brain_adapt` migrations - the deck's keystone now exists, governed by Law 1. The brain canvas Strengthen/Fix actions surfacing this loop, listed here as UI-disabled at the 2026-06-17/21 state, went LIVE in PR #321 (2026-07-03), and corrections now log to `memory_events` as real user-corrected/rejected/disputed signals that the extractor respects (`_shared/correction-guard.ts`).

## Phase 5 - Trust at scale *(calibration · honesty rails · consolidation tail)* - **PARTLY SHIPPED**
**Goal:** make it trustworthy and close the circle.
**Work:** the **ECE < 0.1** calibration gate on the verification engine (when it says 80%, it's right ~80%); spread the methodology beyond Decide (confidence bands + counter-case discipline on briefings/memos/exports); enforce the honesty rails (no UI implies learning that isn't happening; scope fence holds; corrections cost one tap); finish the dedup and retire the legacy stack.
**Ships:** the four moat pillars wired into one closed, honest, compounding loop.
**Proof:** calibration gate passes in CI; no unbacked "learning" UI remains anywhere.
**Shipped status:** the honesty rails are enforced (no UI implies learning that isn't happening; the thermometer moves only when usage moves; the #193 honesty floor extends the rail to the org chart), and the methodology spread well beyond Decide via the kit program (#190-193). The four moat pillars are wired into one closed loop (#153-164, #187-189). *Outstanding items demoted to the Remaining tail below.*

---

## Remaining *(genuinely outstanding, demoted from the phases above)*
The destination is substantially built. These are the honest open items:
- **The formal ECE < 0.1 calibration gate** is not yet enforced in CI - the verification engine carries confidence, but the hard "when it says 80%, it's right ~80%" gate is not yet a passing CI check.
- **Full legacy-stack retirement** - the clean-room rebuild collapsed the surfacing and most of the duplication, but final retirement of the old stack is not yet complete.
- **Methodology-everywhere** - confidence-band + counter-case discipline reaches the major surfaces; spreading it to *every* surface is ongoing.
- **Brain edges are derived, not stored** - the fact-to-fact graph is computed rather than persisted. (Brain canvas Strengthen/Fix actions, previously listed here as UI-disabled, went LIVE in PR #321, 2026-07-03; removed from this list.)
- **Number-heroes fall back to words-led** for thin current data (honest degradation, not a defect).
- **Residual green** remains in `index.html` OG/theme-color meta, the `tokens.css` `--mint` alias, and `EdgeOnboarding`/`SampleResultsDialog` - the forced-dark emerald brand is global, but these specific tokens/surfaces still carry the old green.
- **Pre-#193 `kit_builds.intake` data is truncated** and should not be trusted (the cascade bug dropped the back half of every build before #193).

---

## How a phase gets built
When we commit to a phase, the next step is **its file-level implementation spec** - and *that* is where parallelism earns its keep: agents scope the exact files/functions/migrations against the live repo, an adversarial pass verifies the plan, then implementation lands in an isolated worktree as reviewable PRs. Strategy is authored solo for coherence; construction is fanned out for thoroughness.

## §16 items - now resolved
- **Decision sub-scopes** within AI-adoption / org-re-architecture / strategic-bets - settled as the decision intake was built into the redesigned decision spine (#186).
- **Voice timing** (per-user voice vs neutral chrome + user-voiced outputs) - settled with the first-class Identity layer (#186): voice mined from real writing with `confident|guessing` flags.
- **Commercial** (wedge, freemium vs cohort, pricing) - the kit program (#190-193) is the cohort-facing wedge in practice; final pricing/freemium split remains a live commercial decision.
- **Team / agentic-org layer** - shipped as the Agentic Org Chart kit (#190/#191), with the #193 honesty floor on the composed chart.
