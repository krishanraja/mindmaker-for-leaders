# CTRL - Market-Read Architecture (source tiers + categories + scoring rubric + provenance)

> **STATUS - HISTORICAL SPEC, locked 2026-06-13, status-checked 2026-06-17.** This is the design spec as locked; it predates the brain "limits" phases (PRs #187-189) and the redesign ship (PR #186, 2026-06-16). The BUILD-NEW table in section 6 has been annotated with shipped / partial / outstanding status against those phases. CAVEAT: file paths cited throughout (the `_shared/*.ts`, `decision-engine/*.ts`, component paths) were verified present at lock time but the redesign reorganised the app, so any path here may have MOVED - re-verify before relying on it (flagged as needs_human).

**Locked 2026-06-13 (Krish).** The spec for how a decision stone's "Read from the market" is produced: a SYNTHESIS of the most important, fresh, relevant, business-impacting AI news - never one item from one site - prioritising reputable/original sources, with click-out to read them.

Derived from a parallel audit of the existing machinery (briefing pipeline, decision-engine verify, this corpus, Pulse). **Headline finding: ~85% of this already exists in mm-ctrl.** The one genuinely missing primitive is multi-source CLUSTERING / independent-corroboration (the "synthesis" act itself). Files cited below are verified present.

---

## The 4 founder requirements (the bar)
1. Prioritise well-known / reputable / **original (primary)** sources.
2. Let the user click **out** to read sources (external popup).
3. A "read from the market" is a **synthesis** of the best of the market - never one bit of news from one site.
4. A **fixed category taxonomy + scoring rubric** for mapping the market - refining what exists, not reinventing.

---

## 1. Source-reputability tiers (extends the existing `SOURCE_AUTHORITY` map)
The live app already has `SOURCE_AUTHORITY` in `_shared/briefing-scoring.ts` (Bloomberg/FT/WSJ/Reuters=5 ... Web=1), used today only as a dedupe tie-break. We promote it to a first-class 5-tier scoring + gating dimension, adding a **Tier 0 (Original/Primary)** band on top.

| Tier | What it is | Weight | Examples |
|---|---|---|---|
| **0 - Primary / Original** | The entity that first produced the fact; what every secondary cites. Reuse decision-engine's Exa "neural-primary" retriever as the Tier-0 fetcher (already returns `source_url`). | 5 (authority). Can carry a "Holds" verdict alone for facts it is the primary issuer of (a lab announcing its own release); for interpretive/market claims it still needs corroboration. | Lab release notes/papers (OpenAI, Anthropic, Google DeepMind, Meta, xAI, Mistral), arXiv, EU AI Act / NIST text, SEC filings, earnings transcripts, Artificial Analysis benchmark board. |
| **1 - Reputable Secondary** | Record press with editorial standards + correction policies. = the existing top band. | 4-5. **Two independent Tier-1 agreeing clears the synthesis gate** for a "supported" read. | Bloomberg, FT, WSJ, Reuters (5); NYT, HBR, MIT Tech Review (4). |
| **2 - Reputable Trade / Tech** | Credible specialist/business press; faster, thinner verification. = existing middle band. | 2-3. Corroborates; needs a Tier-0/1 partner or 3+ independent Tier-2 for high-stakes "supported". | CNBC, Forbes, Axios, TechCrunch, The Verge, Wired (3); VentureBeat (2). |
| **3 - Community / Self-Reported** | Vendor blogs **as marketing**, company self-reported interpretive claims, Reddit/HN/X, Substack, GitHub-stars. A vendor's "we're 3x faster" is Tier 3 even on the primary domain. | 1. Colour / early-signal only; auto-attracts the **Vendor haircut** badge; can never lift a read above Contested/Thin alone. = current Web=1. | Vendor marketing pages, self-reported metrics, forum threads, personal blogs. |
| **4 - Low / Unsourced** | Rumour, "sources say" with no outlet, content farms, undated aggregators. | 0. Excluded pre-synthesis, or hard-capped to "Unverified" and never counted toward the independent-source tally. | Unattributed rumour, AI-spun reblogs, link farms. |

> The split that matters: **Tier 0 (a vendor's factual release) vs Tier 3 (the same vendor's marketing claim)** can live on the same domain - so a source-tier classifier (primary-issuer vs vendor-marketing detector) is part of the build.
> Distinct from all five: the **"Only you" / "Nobody yet"** internal source-class (corpus cardinal rule). When a stone's claim is internal-only or forecast-only, the engine is FORBIDDEN to emit a market verdict - it renders the internal-input lock. (In the drawer mock this is the `Yours` row.)

## 2. Fixed category taxonomy (refines `hot_signal_taxonomy` in `training/anchor.yaml`)
Every evidence item is tagged to exactly one. Deterministic thresholds first (keep existing bars), LLM residual.

1. **Model & Capability** - frontier/notable releases, capability jumps, benchmark moves (>5pt on a standard eval; named-lab release).
2. **Pricing & Economics** - cost/price changes, inference-cost curves, TCO-moving shifts (>15% threshold). -> corpus Dimension 1 (TCO).
3. **Funding & M&A** - capital/ownership signalling capability/runway/consolidation (>$100M; sub-$20M dropped).
4. **Competitive & Talent Moves** - watchlist-company launches/partnerships + C-level/researcher moves (C-level-only filter). -> Dimension 7.
5. **Regulation & Policy** - ENACTED law / FINALIZED rules / binding standards only (not proposed bills). -> Dimension 6.
6. **Adoption & Production Evidence** - real deployment outcomes, wins AND failures, at scale. NEW; operationalises the survivorship-bias / ~80-95% base-rate machinery (deliberately seeks failure/null evidence).
7. **Risk, Safety & Reliability** - security incidents, reliability/hallucination findings, data-sovereignty, systemic risk. -> Dimensions 6 + 11.
8. **Maturity & Timing** - where the tech sits on the adoption curve (hype-peak vs production-ready); drives the Hype-peak haircut. -> Dimension 8.

**+ Noise (DROP)** - explicit anti-category, filtered pre-synthesis: sub-C-suite moves, <$20M rounds, unsourced speculation, AGI/celebrity punditry, proposed-but-unenacted policy, governance fluff, generic workforce surveys.

## 3. Scoring rubric (6 dimensions; upgrades the briefing's single relevance number)
| Dimension | What | Scale | Reuse |
|---|---|---|---|
| **Importance** | Clears the category's materiality bar? Deterministic-first (the taxonomy thresholds), LLM residual. | 0-3 (0=drop, 3=category-defining) | `hot_signal_taxonomy` thresholds |
| **Freshness** | Recency vs a **category-aware** decay window (market 3mo / TCO 6mo / enacted-regulation ~never). NEW - briefing has none today. | 0-1, linear decay; below threshold auto-attaches Stale badge | corpus Stale-haircut math + NewsAPI dates |
| **Relevance-to-this-leader** | Semantic fit to THIS stone's claim + the leader's Importance Lens. | 0-1 (existing `relevance_score`); <0.30 dropped | `briefing-scoring.ts` cos_sim x lens_weight verbatim |
| **Business-impact** | Would it move the verdict on the bound stone? | 0-3 (3 = touches the breakpoint assumption / would flip the call) | corpus `load_bearing_score` |
| **Source-reputability** | Tier of the contributing source(s). Now a scoring + GATING input, not just a tie-break. | 0-5 (the 5 tiers) | extend `SOURCE_AUTHORITY` |
| **Confidence (read-level)** | Calibrated trust in the SYNTHESISED read after clustering + adjudication; rises with independent-source count, falls with badges. NEVER shown as a raw number - projects into the verdict word + provenance thickness + point-vs-range. | 0-5 level -> verdict vocab (5/4=Holds, 3=Contested, 2=Thin, 1=Assumption, 0=Unknowable) | `verify.ts` calibrated confidence + corpus 5-level rubric |

## 4. The synthesis model (the read = 7 steps; fuses briefing + decision-engine)
1. **Scope** to ONE stone's load-bearing claim/category (not a generic feed). Reuse `briefing-lens.ts` buildImportanceLens + per-type weight tables.
2. **Plan queries** - 4-6 targeted, industry-scoped, category-tagged. Reuse `planQueries`.
3. **Fan-out, URL-PRESERVING** - route Tier-0 first (Exa neural-primary), then Tier-1/2 breadth (Perplexity grounded+citations, Brave), recency (NewsAPI), entity-typed (PDL/BuiltWith/Tranco). Reuse `decision-engine/retrievers.ts` (emits `Evidence{source_url, source_title, excerpt, retriever, stance}`) **instead of** briefing's URL-dropping fan-out. 12s cap via `with-timeout.ts`.
4. **Rank + dedupe** - batched `text-embedding-3-small`; drop excludes (cos >=0.80), dedupe (>=0.87, keep higher tier), relevance floor 0.30; then the full 6-dim composite. Reuse `dedupeAndScore`.
5. **CLUSTER into the read (NEW - the missing primitive).** Group survivors by category + claim-stance (supports / refutes / complicates). **A cluster needs >=2 INDEPENDENT sources (distinct domains, >=1 at Tier <=2) to become a "read"; a lone item is a weak signal, never the read.** This is the "3 stories together imply X shift" computation neither pipeline does today.
6. **Adjudicate** each cluster with `verify.ts` (supported|contested|unverified|unverifiable + calibrated confidence over the retrieved excerpts). Apply the corpus haircut badges; the heaviest hard-caps the verdict. Honor the Only-you/Nobody-yet cardinal rule.
7. **Write ONE read + retain provenance.** One synthesised paragraph per category cluster ("Three independent reports, two Tier-1, now put the inference-cost gap at real money"), carrying the verdict word, confidence-projected provenance thickness, <=1 surfaced haircut badge, and the contributing sources with `source_url` + tier + date. Store as extended `decision_evidence` rows. **The read is the synthesis; the click-out list is the receipts.**

## 5. Provenance click-out UX (prioritising reputable/original)
- Each read renders a **"Sources (N)"** affordance - never a single link, always the cluster.
- Per source: publication + **Tier badge** ("Primary" for Tier 0, "Reputable" for Tier 1), original `source_title`, date, <=1 haircut badge. (All this data already exists in decision-engine `Evidence`; the only gap is surfacing it.)
- **Ordering: by tier first (Tier 0 at top), then freshness** - the eye lands on the most reputable/original first.
- Click-out: `source_url` opens in a new tab (`_blank rel="noopener noreferrer"`); mobile = in-app browser overlay so the leader never loses the stone.
- Header reuses the already-stored `matched_profile_fact` + `relevance_score`: "Because your stone rests on [claim] - matched [watchlist:Anthropic] - 0.71", with "Show full trace" wired to the existing `briefing-diagnose` endpoint.
- **One component, two call sites:** wire the same popover to decision-stone reads AND `BriefingSegment` (extend its type with `source_url[]` + tier).

## 6. Reuse vs build-new
**REUSE (do NOT rebuild):** `briefing-lens.ts` (scope/plan + per-type weights + feedback deltas + industry guardrail); `decision-engine/retrievers.ts` (URL-preserving, source-routed fan-out - closes briefing's #1 gap); `briefing-scoring.ts` `dedupeAndScore` (embedding dedupe + thresholds + authority tie-break); `verify.ts` (4-state verdict + calibrated confidence); `DECISIONING CORPUS.md` Parts 2/3.2/4.2 (source-reliability map, 12 failure-modes -> 8 haircut badges, 5-level confidence, ~80-95% prior); `CTRL-DECISIONING-FRAMEWORK.md` (COMPONENT object, `load_bearing_score`, 3-7 gate, Only-you/Nobody-yet rule); `anchor.yaml` `hot_signal_taxonomy` + `test:training` harness; `briefing-curation.ts` (pick-N + diversity/coverage); `briefing-diagnose` + `decision_evidence` (provenance store); `with-timeout.ts`.

**BUILD NEW (small)** - status flipped against the limits phases (PRs #187-189) on 2026-06-17. Statuses below; the per-item design intent that follows each status is the original spec text, retained for context.
1. **Clustering / independent-corroboration primitive** (Step 5) - **OUTSTANDING.** The limits phases delivered a fact-to-fact edge graph + evidence tiers (the substrate), but those brain edges are DERIVED-not-stored, so a persisted "cluster = the read" pass does not yet exist as a first-class primitive. Still the single biggest missing piece. Original intent: `_shared/market-read-synthesis.ts`; both pipelines were single-item, neither computed "these 3 together imply X."
2. **Source-tier classifier** - **PARTIAL.** Evidence tiers shipped in the limits phases. The primary-issuer vs vendor-marketing detector and the full 5-tier gating function still need re-verification against the section 1 table. Original intent: extend `SOURCE_AUTHORITY` into the 5-tier function + a primary-issuer vs vendor-marketing detector.
3. **Category tagging** of every evidence item to the fixed 8-category taxonomy - **OUTSTANDING / RE-VERIFY.** Not named in the limits-phase scope; confirm whether tagging is persisted on the row before assuming done. Original intent: tag every evidence item to the 8-category taxonomy; persist on the row.
4. **Click-out provenance popover** (React), wired to stone reads AND `BriefingSegment` - **RE-VERIFY (path moved).** The redesign rebuilt the surfaces (mobile cockpit, decision spine, StoneRead, capture); whether the click-out popover landed and where it now lives needs checking in the post-redesign tree. Original intent: one popover component, two call sites.
5. **Persist URLs in the briefing path** (`CandidateHeadline -> news_sources -> BriefingSegment` dropped `source_url`; decision-engine kept it) - **RE-VERIFY.** Not explicitly in the limits-phase scope; confirm against the current briefing path.
6. **Freshness dimension** - capture `published_date` + category-aware decay windows - **OUTSTANDING / RE-VERIFY.** Not named in the limits-phase scope; confirm before assuming done.

## 7. Refinements to existing
- Promote `SOURCE_AUTHORITY` from dedupe-tie-break to a scoring + GATING dimension (+ Tier 0 band + vendor split).
- Formalise `hot_signal_taxonomy` prose into the explicit 8-category taxonomy with per-category materiality thresholds AND staleness windows (keep every existing threshold).
- Upgrade the single relevance number into the 6-dim composite (keep cos_sim x lens_weight as the relevance dim).
- Swap briefing's URL-dropping fan-out for the decision-engine retrievers on any market read (click-out by construction).
- Add cross-story synthesis to curation: one read per category cluster with verdict + corroboration count + sorted sources, not 3-5 standalone paragraphs.
- Render confidence honestly (verdict vocab + provenance thickness + point-vs-range; <=1 haircut badge), wiring the honesty layer that is computed today but stays dark in the UI.
- Enforce Only-you/Nobody-yet on market reads in Briefing too (today only Decide honors it).

---
**Verified files (real, not inferred):** `_shared/briefing-scoring.ts` (SOURCE_AUTHORITY), `decision-engine/{retrievers,verify,crossexamine,decompose,advise,index}.ts`, `briefing-diagnose/index.ts`.
**Pulse cross-check - CLOSED (Krish 2026-06-13):** Pulse is a Fractionl product (Fractional Work Index), NOT Mindmaker/CTRL; its data, categories, and outputs are fractional-labour-market signals, irrelevant to AI-news mapping. The repo is not on this machine anyway (only `fractionl-circle` is, a different product). No cross-check pursued; this spec stands on CTRL's own verified machinery (briefing pipeline + decision-engine + corpus).
