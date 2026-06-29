# Enrichment Convergence (Unit C)

**Status:** DESIGN + DECISION (2026-06-29). The two enrichment waterfalls are documented, the shared-core contract is specified, and a deliberate incremental migration path is defined. The blind big-bang collapse is intentionally NOT done - see "Why not a big-bang" below.

This is the canonical record for the last open hive-mind unit: collapsing the portfolio's two enrichment services toward one shared core WITHOUT vanilla-merging away what each one is for.

## The two services (what the structural map found)

The plan assumed `enrich-profile` (Make Your Mind Up) and `enrich-company` (Mindmaker) were near-identical duplicates. The full structural comparison showed they are **two different resolvers that happen to share four provider calls** - a real divergence, not an accident:

| Aspect | MYMU `enrich-profile` | Mindmaker `enrich-company` |
| --- | --- | --- |
| Subject | a **person** (email / LinkedIn) | a **company** (domain / email / name) |
| Input | `ResolverSeed` (email, domain, linkedin, name) | `{ domain?, email?, name?, depth: 'identity'\|'full' }` |
| Output | flat `ResolvedPerson` (16 fields) | nested `Dossier` (identity / understanding / **scale** / currency / synthesis / confidence / meta) |
| Extra providers | Apollo (work-email org), Apify (LinkedIn scrape, last resort) | Currency layer ("what they shipped": Perplexity -> Exa -> NewsAPI), depth modes |
| Synthesis | Claude, generic blurb + bullets | Gemini 2.5 Flash primary -> Claude Haiku fallback, one paragraph, **Krish's voice**, voice-linted |
| Privacy | implicit (`emailDeliverable`, `provenance` not surfaced) | **explicit `scale.*` = internal routing only, never recited** (the Diagnosis Room contract) |
| Infra | `safe()` wrapper, `http.ts` | structured `logger.ts`, `timeout.ts`, `retry.ts` (exponential backoff), in-memory cache + per-IP + global ceiling |
| Lines | ~1,512 across 20 files | ~2,858 across 14 files |

**Genuinely shared (the "body"):** the four pure provider calls - PDL, Brandfetch, BuiltWith, Tranco - plus the web/news providers (Exa, Perplexity, Brave, NewsAPI), the timeout/abort pattern, and the "missing key degrades, never fails" gating.

**Genuinely sovereign (the "personality" - must NOT be vanilla-merged):**
- Mindmaker's `scale.*` privacy-routing layer + `deriveRouting()` (ICP / recommendedMode) - load-bearing for the honest down-sell rubric and the "never recite the routing layer" contract.
- Mindmaker's voice synthesis (Krish's register, voice-linted) vs MYMU's generic compression.
- MYMU's person-resolution (Apollo + Apify) - Mindmaker has no person subject.
- The output shapes themselves: a flat person record vs a nested, privacy-tiered company dossier.

## The shared-core contract (the target)

One canonical `_shared/enrich-core/` module, **mirrored** across both repos (single source of truth, copy-identical - the same pattern already used for `MindmakerEndorsement` and `design-tokens.css`). It owns ONLY the body:

```
_shared/enrich-core/
  types.ts            # PartialEnrichment (neutral intermediate) + merge()/clean()
  providers/
    pdl.ts            # email/domain -> PartialEnrichment
    brandfetch.ts     # domain    -> identity (logo, colors, name)
    builtwith.ts      # domain    -> tech stack
    tranco.ts         # domain    -> rank
    web-signals.ts    # Exa / Perplexity / Brave / NewsAPI -> recent items
  net.ts              # fetchWithTimeout + retry (lift Mindmaker's timeout.ts/retry.ts)
  logger.ts           # structured log (lift Mindmaker's)
```

Each provider returns the **neutral `PartialEnrichment`** shape; the orchestrators stay in each app and MAP that neutral shape into their own output:
- MYMU's orchestrator maps `PartialEnrichment[]` -> `ResolvedPerson` and keeps Apollo + Apify (person-only) and its own synthesis.
- Mindmaker's orchestrator maps `PartialEnrichment[]` -> `Dossier`, derives the `scale` routing layer itself, runs its own voice synthesis, and keeps its cache/rate-limit shell.

This is "unify the body, never the personality" applied exactly: the providers are the shared body (one correct way to call PDL/Brandfetch/BuiltWith/Tranco), the orchestrator + output shape + synthesis voice + privacy routing are each room's personality.

## Why not a big-bang (the decision)

A single shared orchestrator returning one merged shape was rejected, on first principles:

1. **It would vanilla-merge the soul.** One output shape cannot be both a flat person record and a privacy-tiered company dossier without becoming a lowest-common-denominator blob - the exact homogenization the owner explicitly warned against ("don't lose the soul of any of them").
2. **Live conversion risk.** Both functions are load-bearing for revenue surfaces (the MYMU result email; the Diagnosis Room dossier that paints the co-brand and feeds the proposal). A blind rewrite of both at once, then deployed, is the highest-risk change in the whole portfolio effort.
3. **Unverifiable here.** The safety rule is "verify on a throwaway BEFORE any deploy touches the live surface." This sandbox cannot run the authed Diagnosis Room walk or the MYMU result-email end-to-end, so a full rewrite cannot be responsibly verified before it ships.
4. **The value is internal-only.** Unlike the other hive units (brand cohesion, the shared news pool, the consent handoff, the cohort-anxiety prior - all user-felt), enrichment convergence is pure code hygiene. It earns a careful incremental migration, not a risky big-bang.

## Migration path (safe, incremental, behavior-preserving)

Each step is independently shippable, verifiable by `deno check` + a live HTTP smoke test (POST a throwaway domain, assert the output shape is byte-identical to before), and reversible:

1. **Land the neutral core in Mindmaker** (the more mature infra): extract `providers/*` + `net.ts` + `logger.ts` into `_shared/enrich-core/`, rewire `enrich-company` to import them, assert the `Dossier` output is unchanged. Mindmaker's `timeout.ts`/`retry.ts`/`logger.ts` are the canonical infra.
2. **Mirror the core into MYMU** (copy-identical), rewire `enrich-profile`'s PDL/Brandfetch/BuiltWith/Tranco calls to the shared adapters via a thin `PartialEnrichment -> ResolvedPerson` mapper; keep Apollo + Apify + its synthesis untouched. Assert `ResolvedPerson` is unchanged.
3. **Converge the web-signals layer** (Exa/Perplexity/Brave/NewsAPI) into `web-signals.ts`; both apps consume it, each keeping its own cap/ordering.
4. Optionally adopt Mindmaker's cache + rate-limit shell in MYMU if its traffic warrants it.

Each step ships only after its smoke test is green. No step changes any user-facing output; the win is one place to fix a provider, not three.

## What stays sovereign forever

- Mindmaker's `scale.*` routing + the "never recited" privacy contract.
- Each app's synthesis voice and output shape.
- MYMU's person resolution (Apollo + Apify).

These are not duplication; they are the personality. The shared core is the body only.
