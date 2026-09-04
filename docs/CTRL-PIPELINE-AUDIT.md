# CTRL - Data & AI Pipeline Audit (pre-wiring readiness)

> **HISTORICAL - 2026-06-13 pre-limits-phase snapshot (updated 2026-06-17).** This is a point-in-time, read-only readiness audit taken BEFORE the brain "limits" phases shipped. The headline gaps it names below (reaction numbers, multi-source clustering, evidence tiers, track-record depth, decision-watch scheduling) were the build queue at the time, NOT the current state. See "WHAT SHIPPED SINCE (PRs #187-189)" at the foot of the doc for what actually landed. Do not treat the gaps below as still-open without checking that section.

**2026-06-13, autonomous run.** Read-only audit of `mm-ctrl` across 5 dimensions, against `CTRL-MARKET-READ-SPEC.md` + the numerical-first reframe. Source: 5-agent workflow `wf_e7fc2f6f-5a3`.

## Headline
**The engine is in good shape - far better than the surfaces were.** The decision-engine already retrieves, scores, verifies (4-state verdict), calibrates confidence, and runs in the background. The numerical-first turn and the market-read spec are mostly a **display layer + a few new modules**, not new intelligence. The decision lifecycle is **~70% pre-wired**. The two biggest gaps are the **multi-source clustering primitive** and the **track-record lifecycle columns**.

---

## 1. Reaction-number (the numerical-first NUMBER) - LOW RISK, display-layer
- **State:** the engine computes quantified signals (relevance_score, confidence, verdicts) but renders them as **prose** ("30% cost reduction" lives inside a sentence). `BriefingSegment` has no reaction field; `SegmentCard.tsx` shows headline+analysis only.
- **Build:** new `_shared/reaction-extraction.ts` post-curation stage -> re-prompt gpt-4o-mini to emit `{reaction_number, descriptor, why_matters}` per segment; extend `BriefingSegment` + `briefings.schema_version=3` (optional cols, backward-compatible). **Honesty gate (critical):** the number must appear in the retrieved `Evidence.excerpt` - reject inventions, fall back to a phrase ("matched", "signal"). 2-8 char budget.
- **Effort M / Risk LOW.** Opt-in post-processing; if it fails, prose still renders. ~$0.01-0.02 extra per briefing.

## 2. Market-read spec BUILD-NEW readiness
| Item | Exists | Build | Effort/Risk |
|---|---|---|---|
| **Clustering / corroboration primitive** | 0% (both pipelines are single-item) | NEW `_shared/market-read-synthesis.ts`: group by (category, stance), require >=2 independent sources (>=1 Tier<=2) | **M / M** - the biggest new build; grouping heuristics need calibration |
| **Source-tier classifier** | ~40% (`SOURCE_AUTHORITY` map, dedupe tie-break only) | extend to 5-tier function + Tier-0 band + vendor-marketing-vs-primary-issuer detector | M / M |
| **Category tagging (8 cats)** | partial (`hot_signal_taxonomy` thresholds) | tag each evidence item; persist on row | S-M / L |
| **URL persistence (briefing path)** | decision-engine keeps `source_url`; briefing DROPS it | thread source_url through CandidateHeadline -> news_sources -> BriefingSegment | S / L |
| **Click-out provenance** | data exists in decision-engine Evidence | a popover component + wire to SegmentCard | S / L |
| **Freshness/decay** | none (stale = env-var calibration only) | category-aware decay + Stale badge | S / M |

## 3. Cost / cadence  -> ANSWERS the "reads cost/cadence" pre-wiring decision
- **Per decision:** ~$0.15-0.20 free, $0.25-0.35 Pro. User-facing latency ~200-300ms (returns 202, runs in background via `EdgeRuntime.waitUntil`, frontend polls). Free capped 3/month.
- **Briefing:** ~2-4 min end-to-end, on-demand.
- **THE KEY FINDING:** `decision-watch` (the hourly re-verify WATCH loop) **EXISTS but is NOT SCHEDULED** (no pg_cron job). ~$0.06-0.10/run, 5-10s, batch-capped (2 cases x 6 claims).
- **RECOMMENDATION (cadence model):** schedule `decision-watch` so reads are **precomputed** on a cadence -> the cockpit hero + reads render INSTANT from stored `decision_cases`/`decision_evidence`/`decision_alerts`, never a live spinner. Reaction-number extraction runs in that same precompute pass. On-demand only for a fresh Pressure-test. This is the answer: **precompute via decision-watch; surface reads from the store.**

## 4. Decision lifecycle / track-record  -> ANSWERS the "track-record in v1" pre-wiring decision
- **Lifecycle ~70% pre-wired (live):** `decision_cases` (status `active|decided|stale|archived`, stage, decision_kind, confidence, last_verified_at) + `decision_claims` (verdict, is_load_bearing, confidence) + `decision_evidence` (stance, relevance_score, retriever) + `decision_tensions` + `decision_alerts` (kind, status) + `decision_events` (audit log) + `decision_user_calls` (claim-level stance).
- **Track-record (Feature A) = 0% wired. Gaps:**
  - **GAP** case-level STANCE (only claim-level exists today) <- the leader's Agree/Disagree/Not sure on the bet
  - **MISSING** OUTCOME recording (case outcome + date)
  - **CUT WIRE** verdict EVOLUTION history (only watch-alerts today, no versioned trail)
  - **MISSING** process-vs-luck scoring
  - **BLOCKED** feedback-to-memory + recurring-mistake guard (Phase 4 territory)
- **RECOMMENDATION (matches the pre-wiring lean):** do **Phase A migration NOW** (3 small migrations: case-level stance + outcome recording + verdict-history) even if the track-record UI ships later - it is the prerequisite, and retrofitting a lifecycle is the expensive path. **HOLD** Phase B scoring until real outcomes exist in prod (premature scoring = vanity). Track-record UI gated on Phase C self-correction being defined (else it is just a history log).

## 5. Edge cases / failure modes (the data-realist states)
- **Quiet / no-signal:** briefing has a sparse-profile state + calm placeholder; decision-engine returns `unverified` + "insufficient evidence to recommend". **GAP:** no "quiet day" empty-candidate state - if the scored pool is empty post-curation the briefing renders BLANK. Build a low-effort empty-candidate gate ("No news matched your profile today").
- **Thin / unproven (honesty governor):** SOLID - `verify.ts` caps unverified confidence <=0.35, verdict renders muted "Unverified" (never bright green), relevance floor 0.30 drops weak candidates. The numerical-first thin-state (dimmed/"?" instead of a confident number) maps onto this.
- **Provider failure:** handled defensively (`Promise.allSettled`, per-retriever timeouts, one failure never cascades) + static fallback. OK.
- **Stale:** exists only as env-var calibration, NOT user-facing decay. **GAP** (= the freshness build in #2).
- **Only-you / cold-start:** cardinal rule enforced in Decide but not uniformly in briefing; cold-start handled by sparse-profile path.

---

## Build order implied (for the wiring phase)
1. **Schedule `decision-watch`** (precompute cadence) - tiny, unblocks instant reads. + the track-record **Phase A migration** (lifecycle cols) - do up front.
2. **Reaction-number extraction** (`reaction-extraction.ts`, contract-gated) - the numerical-first surface needs it.
3. **Clustering / corroboration primitive** (`market-read-synthesis.ts`) - the one real new-intelligence build.
4. **Source-tier classifier** + **category tagging** + **URL persistence** + **freshness** (the spec's smaller extensions) + **click-out popover**.
5. **Empty-candidate "quiet day" gate** + user-facing stale decay (the honest data-realist states).
The honesty machinery (verdict capping, relevance floor, defensive retrievers) is already sound - build ON it, do not rebuild.

---

## WHAT SHIPPED SINCE (PRs #187-189) - added 2026-06-17
The brain "limits" phases (PRs #187-189, plus the earlier brain engine PRs #153-164) and the redesign ship (PR #186, merge 1c01db5, 2026-06-16) landed after this snapshot. Mapping this audit's headline gaps to what is now true:

- **Reaction-number (the numerical-first NUMBER) - SHIPPED, partial.** Reliable reaction numbers landed in the limits phases. HONEST RESIDUAL: number-heroes still fall back to words-led when the current data is thin, exactly the contract-gated fallback this audit specified (#1). So the surface exists, but a thin-data stone renders words-led, not a number.
- **Multi-source clustering / corroboration primitive - PARTIAL.** Evidence tiers and a fact-to-fact edge graph landed (PRs #187-189; migrations `20260615*_brain_*` + `20260616120000_memory_edges`), which is the substrate the synthesis act needs. HONEST RESIDUAL: brain edges are DERIVED-not-stored, so the independent-corroboration "cluster = the read" primitive this audit called the single biggest new build is not yet a persisted, first-class clustering pass. Re-verify before claiming the synthesis act itself is done.
- **Evidence tiers / source-tier classifier - SHIPPED (evidence tiers).** The limits phases added evidence tiers. The vendor-marketing-vs-primary-issuer detector and the full 5-tier gating function should be re-verified against the spec table (this audit's #2) before assuming complete.
- **Track-record depth - SHIPPED (depth), partial UI.** Track-record depth landed in the limits phases alongside the Strengthen/Fix RPC surface area. HONEST RESIDUAL: the brain canvas Strengthen/Fix actions are UI-DISABLED (no backend RPC wired), so the lifecycle-write affordance the audit flagged (case-level stance / outcome / verdict-history) is not fully user-operable yet.
- **Decision-watch scheduling (the precompute cadence) - RE-VERIFY.** This audit's KEY FINDING was that `decision-watch` existed but was NOT scheduled (no pg_cron). The limits phases focused on the brain graph and reaction numbers, not explicitly on the cron schedule, so do NOT assume the precompute cadence is wired. Treat "is decision-watch scheduled in prod?" as open until checked against pg_cron.

Bottom line: the display layer and the evidence/track-record substrate largely landed; the genuine new-intelligence build (persisted independent-corroboration clustering) and the precompute cadence remain the honest open edges. The honesty machinery this audit praised is intact and was built ON, not rebuilt.
