# CTRL Curation System Spec

**Status:** IMPLEMENTED + LIVE (PRs #287, #293-296; 2026-06-28). The single source of truth for how CTRL decides what a leader reads and hears: the Home news deck, the Tune controls, the role/business scoring, the loading experience, and the audio Briefing. Sits under `docs/CTRL-SYSTEM-SPEC.md` (the system-level rule) and is the deep-dive for the Home area.

---

## 0. The one rule: ONE brain, ONE pool, three surfaces (no silos)

There is exactly **one** curation system, not three. The Home cards, the Tune controls, and the spoken Briefing are three FACETS of the same pipeline. They must never diverge:

- **One brain.** Every personalization signal a leader has - identity (role), business (industry), goals, decisions, watchlist, the news tuning, and the briefing interests - is read through ONE accessor, `supabase/functions/_shared/brain-profile.ts` `loadBrainProfile`. Both the Home feed (`live-headlines`) and the Briefing (`generate-briefing`) score against this same brain. If a signal changes, every surface changes.
- **One pool.** The day's AI-native stories are gathered, clustered, scored and cached ONCE in `live_headlines_cache` (the shared pool). The Home cards read it directly; the Briefing merges it into its own fan-out so the spoken briefing covers the SAME stories the cards show.
- **Three surfaces, different shapes.** Home = browsable cards you re-rank by tuning. Briefing = a spoken script over the same pool. Tune = the controls that bend both. Same content, three presentations.

This is the meaning of "there is only one system": you cannot tune one surface and have another disagree.

---

## 1. Purpose, objectives, outcomes (the Home / daily-read area)

**Purpose.** Keep a time-poor senior operator current on the AI shift that changes how they build, orchestrate, productize and go-to-market the AI-native version of their business - without them doing the reading. Only what is AI-native and matters reaches them; general business news never does.

**Objectives.**
1. Surface only AI-native stories, cross-verified across free sources (trust = corroboration, not a fancier vendor).
2. Personalize to the leader on three layers that compound: their **brain** (role/business/goals), their explicit **tuning** (the lanes they lift + how they scan), and their **role-fit** (what their job actually cares about).
3. Make tuning **honest and visible**: a chosen lane dominates the feed, the scan bias visibly reorders, and the change lands instantly.
4. **Never empty, never thin:** any chosen lane always shows at least 3 on-topic cards.
5. One spoken **Briefing** that covers the same stories, in the leader's voice and priorities.

**Outcomes.**
- In one glance (cards) or one listen (briefing), the leader knows the few moves worth acting on this week.
- Tuning to "Economics, funding & GTM" produces a feed that is economics/GTM-led, ordered by their role.
- The briefing and the cards agree - no "why is the audio about different news than my screen?"
- A brand-new leader still gets a sensible, non-empty AI-native read on day one.

---

## 2. Methodology (the principles the pipeline obeys)

1. **Cross-verification over vendor quality.** A story earns trust by being reported across independent free sources, not by coming from one premium feed. Corroboration count is the core signal.
2. **AI-native only, then categorized.** Every story is filtered to AI-native and tagged to exactly one of the **nine categories** (`src/types/newsCategory.ts`): model, economics, tools, orchestration, product, governance, security, org, proof.
3. **Shared pool, personalized at the edges.** Gather once per day for everyone (cost + speed); personalize per-leader by re-scoring that pool, never by re-gathering.
4. **Tuning dominates, it does not nudge.** When a leader narrows to a lane, that lane LEADS the feed (up to supply) - not a gentle lift buried under "variety". The leader's explicit choice outranks generic world-importance.
5. **A guaranteed floor, on-topic.** A narrowed feed is never below 3 cards, and the top-up is always in the chosen lane (evergreen reserve), never off-topic filler.
6. **Infer the person, never re-ask.** Role and business are read from facts already captured; they sharpen ordering. No new questions, no LLM call on the hot path.
7. **The loading moment adds value.** While the feed warms, the globe teaches (AI-fluency lines + durable trends + last-loaded real headlines), it does not stall.
8. **Honesty about supply.** Some days the AI-native world produces few stories in a lane; the feed shows what is real first and tops up with clearly-evergreen reserve cards, never faked "today" scoops.

---

## 3. Architecture (end-to-end data flow)

```
                       ┌──────────────────────── ONE BRAIN ─────────────────────────┐
                       │  _shared/brain-profile.ts  loadBrainProfile(user)           │
                       │  identity(role) · business(industry) · goals · decisions ·  │
                       │  watchlist · news tuning(boosted/bias) · briefing interests │
                       └───────────────┬──────────────────────────────┬─────────────┘
                                       │                              │
        ┌──────────────────────────────▼─────────┐      ┌────────────▼─────────────────────────┐
        │  live-headlines (edge)                  │      │  generate-briefing (edge, v2)         │
        │  TIER 1 shared pool (once/day):         │      │  lens → planQueries(+tune) → fan-out   │
        │   gatherAll (6 free sources)            │      │   MERGED with shared pool candidates   │
        │   → AI-native filter → cluster → score  │      │   (loadSharedPoolCandidates)           │
        │   → selectBalanced(9 cats) → synthesize │      │   → dedupe+score → curate → script     │
        │   → AA enrich → live_headlines_cache    │      │   → audio (ElevenLabs)                 │
        │  TIER 2 per-user: scorePoolForUser      │      │  flags: BRIEFING_V2_ENABLED_DEFAULT,   │
        │   (personalization-core) → personal_…   │      │   BRIEFING_USE_BRAIN_PROFILE,          │
        │   returns POOL(20): {score,sourceCount, │      │   BRIEFING_SOURCE_SHARED_POOL (all on) │
        │   category,benchmark,...} + personalized│      └────────────────────────────────────────┘
        └───────────────┬─────────────────────────┘
                        │ POOL + personalized flag
        ┌───────────────▼──────────────────────────────────────────────┐
        │  CLIENT  useCockpit (src/hooks/useCockpit.ts)                  │
        │  1. cache headlines → loadingLines (next load's globe)         │
        │  2. roleFit = roleFitByCategory(role, sector)   [roleArchetype]│
        │  3. rank: serverPersonalized ? rankPersonalized : rankBy…      │
        │        (lane DOMINATES · scan bias · role-fit)   [newsPriority]│
        │  4. filter-forward + FLOOR OF 3: if chosen lane < 3, top up    │
        │        on-topic from laneReserve (role-fit ordered)           │
        │  → deck (≤8)  →  NewsHeadlineCard / HomeFeed                   │
        └───────────────────────────────────────────────────────────────┘
```

### 3.1 The shared pool (server) - `supabase/functions/live-headlines/index.ts`
Gather in parallel from SIX free sources (`_shared/news-sources.ts` `gatherAll`: GDELT, Hacker News Algolia, a curated RSS allowlist, Brave, NewsAPI, Exa) → keep AI-native only (`_shared/news-ai-native.ts` `isAiNative` + `classifyCategory`) → cluster near-duplicates across sources (`_shared/news-cluster.ts`, title-token Jaccard) → score `corroboration × reputation-tier × freshness × HN-engagement` → `selectBalanced` across the nine categories (`POOL_PER_CATEGORY`, `POOL_SIZE` 20) → one grounded "why it matters" line per story (`_shared/news-synthesis.ts`) → validate against Artificial Analysis (`matchAaModel`, a benchmark trust chip, never its own card). Cached daily in `live_headlines_cache`, pre-warmed by the `live-headlines-prewarm` pg_cron job. **Tier 2** (per-user, default on via `HOME_PERSONALIZATION_ENABLED`): `personalization-core.ts` `scorePoolForUser` re-scores the pool against the brain and caches in `personal_pool_cache` keyed on the brain signature. Returns 20 cards, each carrying `score` (the importance used for client re-rank), `sourceCount`, `category`, optional `benchmark`, and a `personalized` flag.

### 3.2 The client re-rank (tuning) - `src/lib/newsPriority.ts`
The pool is re-ranked into THIS leader's order. Two entry points:
- `rankByPreferences` - spine is the server **importance score** (generic pool).
- `rankPersonalized` - spine is the server **position** (an already-personalized feed; using the score would re-introduce generic math and undo the engine). Untuned = exact identity.

Both compose the same terms (highest wins):
- `BOOST_BLOCK` (1e6) when the card is in a **boosted lane** → a chosen lane DOMINATES, uncapped.
- `biasLift` - the **scan bias**: `practical` floats actionable lanes (tools/orchestration/proof/product); `big` floats multi-source (widely-reported) stories. Visible on its own.
- `fitLift` - **role/business fit** (section 3.4), a small within-group sharpener.
- the spine (score or position), with original index as a stable tiebreak.

### 3.3 Tune controls - `NewsPreferencesPanel` (one door) + `useNewsPreferences` + `news_preferences`
Four real-world **priority groups** (`PRIORITY_GROUPS`, each → one or more of the nine categories) + three **scan bias** options. Stored in the owner-scoped `news_preferences` table (`boosted_categories text[]`, `bias`). `useNewsPreferences` is a **module-level shared store** (`useSyncExternalStore`): a save propagates to `useCockpit` instantly, so the cards re-rank the moment a pick is made. Every pick **applies live** (no Save button - it sat below the fold; the footer is a pinned, SOLID "Done" dismiss via `SheetFooterBar`).

**One door (2026-07-04).** The picker body is `src/components/cockpit/NewsPreferencesPanel.tsx`; `NewsPreferencesSheet` is just the Home "Tune feed" drawer shell around it, and Settings → Interests ("Tune your feed") renders the **same** panel (desktop Briefing tab + mobile section). There is no longer a separate Settings tuner - the old `BriefingInterestsTab` was retired. The panel also carries a **watchlist** (people/companies to watch + never-show excludes) backed by `useBriefingInterests`/`briefing_interests`, so the named-entity + exclude inputs the nine lanes cannot express still reach the server briefing lens (§3.7 / `briefing-lens.ts loadInterests`). A tune made anywhere shows everywhere - the two surfaces are one control over one set of tables.

### 3.4 Role + business fit - `src/lib/roleArchetype.ts`
Inferred from facts already held (no new questions, no LLM): the leader's **role/title** (identity facts) resolves to an **archetype** (founder, engineering, data/AI, product, marketing, sales, finance, operations, people, legal/risk; generalist default) with a considered per-category affinity for what that job actually watches; the **sector/industry** (business facts) adds a light secondary lift. `roleFitByCategory(role, industry)` returns a 0..1 suitability per category. `useCockpit` reads role/sector from `user_memory` and passes the fit into the ranker - so within a chosen lane a CFO's economics leads product, a CTO's tools lead model.

### 3.5 The floor of 3 - `src/components/cockpit/laneReserve.ts`
A curated, per-category **evergreen reserve** (≥3 for the only single-category group, ≥2 elsewhere; same voice as `coldDeck.ts`, no dated scoops). When a chosen lane has fewer than 3 real cards that day, `useCockpit` tops it up from this ON-TOPIC reserve (ordered by role-fit, deduped against what is already shown) so the lane always reaches 3. Real, fresh headlines always lead; the reserve only fills the gap.

### 3.6 The loading experience - `loadingLines.ts` + `GlobeLoader.tsx`
While the feed warms, the globe rotates `buildLoadingLines()`: evergreen **AI-fluency one-liners** + a few **durable trend lines** + the leader's **last-loaded real headlines** (cached by `useCockpit` via `cacheHeadlines`). Cross-faded; a single static line under reduced-motion. The loading moment teaches instead of stalling.

### 3.7 The Briefing, on the same pool - `supabase/functions/generate-briefing/index.ts`
The v2 pipeline (lens → query planner → provider fan-out → dedupe+score → curate → script → audio) is bound to the same brain and pool:
- `brain-profile.ts` `toLensSource` carries the news tuning (`boosted`/`bias`) into the lens; `briefing-lens.ts` `planQueries` leans queries toward the boosted lanes + scan bias.
- `loadSharedPoolCandidates` reads today's `live_headlines_cache` and merges those candidates into the provider fan-out (the shared pool is the floor, leader-specific queries the ceiling), so the spoken briefing covers the same stories as the cards.
- Flags (all ON in Supabase secrets): `BRIEFING_V2_ENABLED_DEFAULT`, `BRIEFING_USE_BRAIN_PROFILE`, `BRIEFING_SOURCE_SHARED_POOL`. The v2 path keeps its v1 safety-net fallback; the shared-pool read is best-effort with the full fallback ladder intact.

---

## 4. The tuning model, precisely

| Leader state | What the feed does |
|---|---|
| **Untuned** (no lane, balanced) | Exact server order. On a personalized feed that order is already role-aware; we do not fight it. |
| **A lane chosen** | That lane DOMINATES the top of the deck, uncapped, ordered by role-fit within the lane. Guaranteed ≥3 (on-topic reserve top-up if the live pool is thin). |
| **A scan bias chosen** | Visibly reorders: `big` → multi-source stories lead; `practical` → actionable lanes lead. Works alone or stacked on a lane. |
| **Lane is empty that day** | Show 3 on-topic evergreen reserve cards for the lane, not the generic feed. |

---

## 5. Honest limits (do not oversell)

- **Supply is real.** Some days the daily pool holds only a few fresh stories in a lane (e.g. ~4 economics+product of 20). A narrowed feed then shows those real cards first and tops up with clearly-evergreen reserve cards to reach 3 - not 3 fresh scoops, and never faked. The lever for richer real supply is widening the per-lane **gather** in `live-headlines`, not the client.
- **Role-fit is a considered map, not a model.** The archetype affinities are hand-built; they sharpen ordering, they do not "understand" a novel title. Unknown roles fall to a sensible generalist.
- **Personalized feeds already include role.** When the server personalized the pool, role is already in the order; the client role-fit mainly orders WITHIN a chosen lane and the reserve backfill.

---

## 6. File index

| Concern | File(s) |
|---|---|
| One brain | `supabase/functions/_shared/brain-profile.ts` |
| Shared pool (gather/cluster/score/cache) | `supabase/functions/live-headlines/index.ts`, `_shared/news-{sources,ai-native,cluster,synthesis}.ts`, `_shared/personalization-core.ts` |
| Client orchestration | `src/hooks/useCockpit.ts` |
| Tune store + UI (one door) | `src/hooks/useNewsPreferences.ts`, `src/components/cockpit/NewsPreferencesPanel.tsx` (body, reused by Home `NewsPreferencesSheet` + Settings → Interests), `news_preferences` table; watchlist via `useBriefingInterests`/`briefing_interests` |
| Ranker (lane/bias/fit) | `src/lib/newsPriority.ts` |
| Role + business fit | `src/lib/roleArchetype.ts` |
| Floor of 3 (reserve) | `src/components/cockpit/laneReserve.ts` |
| Cold-start fallback | `src/components/cockpit/coldDeck.ts` |
| Loading lines | `src/components/system/loadingLines.ts`, `src/components/system/GlobeLoader.tsx` |
| Briefing alignment | `supabase/functions/generate-briefing/index.ts`, `_shared/briefing-lens.ts` |
| Categories (source of truth) | `src/types/newsCategory.ts` |

---

## 7. Verification

- **Unit (pure, vitest):** `src/__tests__/newsPriority.test.ts` (lane domination, within-lane server order preserved, bias visible alone, role-fit ordering, neutral identity), `src/__tests__/roleArchetype.test.ts` (archetype resolution, role/industry fit, reserve floor + fit order).
- **Live (real authed surface, the locked rule):** open Tune, pick one lane + a scan bias, close → cards are lane-led, ≥3, reorder by the bias, instantly (no reload). Generate a briefing → its segment headlines overlap the Home cards for the same day. Confirm the loading globe rotates value lines and previews last-load headlines.
- **Data sanity (ops):** the per-category distribution of `live_headlines_cache` for `current_date` shows whether a lane is genuinely thin that day (explains an evergreen-topped lane).
