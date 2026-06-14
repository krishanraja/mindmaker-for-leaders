# Briefing Generation - Known Failure Modes & Fix History

> **Purpose.** Every "generate/refresh briefing hangs / silently fails /
> shows Generate CTA mid-flight" bug we've shipped has come back in a new
> disguise. This file is the running log so the next person (or session)
> can see the full shape of the problem before touching it again.
>
> **How to use.** If briefing generation, headline refresh, or audio
> synthesis is behaving oddly, read the "Failure modes" table first, then
> scan "Timeline" for the closest historical analogue. Every entry links to
> the commit and the Claude session that produced it.

---

## Architecture at a glance (as of 2026-04-12)

Client → `supabase.functions.invoke('generate-briefing')` → edge function
pipeline:

```
Phase 0  auth + userCtx load
Phase 1  news fetch           (Perplexity || Tavily || Brave, Promise.any)
Phase 1b INSERT partial briefing with raw headlines          [~7-15s]
Phase 2  curateHeadlines (GPT)                               [~3-5s]
Phase 2b UPDATE segments
Phase 3  loadTrainingForUser  (training_material)            [new in #83]
Phase 3b load user_briefing_directives                        [new in #83]
Phase 4  generateBriefingScript (GPT-4o-mini by default)     [~5-15s]
Phase 4b UPDATE script_text, training_material_version
Phase 5  client poll picks up row and stops spinning
```

Client side: `src/hooks/useBriefing.ts` - `generate()` races the invoke
against `GENERATE_TIMEOUT` (60s since `3abe1ce`; 30s before that), then
polls `briefings` table every 3s up to `MAX_POLLS * POLL_INTERVAL = 120s`.

Audio synthesis (`synthesize-briefing`) is a separate edge function,
triggered once `script_text` is populated.

---

## The recurring failure modes

| # | Symptom | Root cause shape | Canonical fix commit |
|---|---|---|---|
| F1 | Spinner never clears; CTA reappears mid-flight | Client timeout < server runtime; client aborts while function keeps running | `b716d99` (polling architecture), `3abe1ce` (60s bump) |
| F2 | "Generate" button flashes for a frame then briefing appears | `generating=false` set before `refetch()` completes | `0f16f85` |
| F3 | Headlines take 20–30s to show | DB insert happened after curation + script gen; nothing to poll for | `7ecbeb7`, `44c3e12` |
| F4 | App stuck on "Extracting facts & patterns…" | Stale closure in `useGuidedCapture.advance()`; functional updater missing | `9c84367` |
| F5 | Audio never arrives; "Retry later" is dead text | `synthesize-briefing` response discarded (fire-and-forget); poll < TTS duration | `0ee9cae` |
| F6 | First generate works; later refreshes return the same cached briefing | No `force` parameter; fallback curation ignored user context | `4006053` |
| F7 | AI Landscape headlines overwritten by generic news | Perplexity loop wrote into already-populated segment | `44c3e12` |
| F8 | Audio briefing blocks the whole pipeline (~30-90s) | `await synthesize-briefing` inside `generate-briefing` | `b900c66` (decouple + poll) |
| F9 | Headlines don't appear even though fetch succeeded | Sequential provider cascade; slow Perplexity blocks Tavily/Brave | `fe6aeeb` (`Promise.any` race) |
| F10 | Briefing fetch returns null after 30s timeout | Client only `refetch`'d on success; timeout path never rechecked DB | `3121000` |

---

## Timeline - every commit that touched this surface

Order: oldest → newest. Each entry: commit, one-line what-it-did,
what-went-wrong-before.

### 2025 (original implementation + early hangs)

- **78bbbd8** `feat: CTRL Briefing - personalised AI news podcast (Pro feature)`  - 
  initial implementation; GPT-4o + ElevenLabs TTS end-to-end inside one function.
- **7730992** `fix: integrate BriefingCard into actual Memory Web dashboards`  - 
  wired the card into desktop + mobile; revealed that mobile never had a
  Generate CTA.
- **185d96d** `fix: briefing UX improvements`.
- **3ce06e3** `fix: add missing Generate Briefing CTA on mobile dashboard`.
- **9c84367** `Fix app hanging on "Extracting facts & patterns..." screen`  - 
  **F4**: stale closure in `advance()`. Switched to functional state
  updater; added 30s auto-advance safety.

### Early hang saga - infinite spinner on CTRL Briefing

- **b900c66** `resolve CTRL Briefing infinite spinner and improve architecture`  - 
  **F8**: decoupled TTS. `generate-briefing` now returns after GPT-4o
  (~5-15s) instead of blocking on ElevenLabs (30-90s). Added 30s client
  timeout on generate + 60s audio poll.
- **0ee9cae** `Fix audio briefing: use synthesis response, extend polling, add retry`  - 
  **F5**. Moved synthesis trigger into `usePollAudio`. Poll 60s → 120s.
  Dead "Retry later" text became a real button.
- **91b857c** `Overhaul audio briefing: personalize headlines, ground script in user context`  - 
  personalization + user-context grounding. Added guard rails so the AI
  can't name the product or refer to the user in third person.

### Second hang saga - "Generate" CTA flashing during live run

- **6d2a8b8** `Fix verify button and improve briefing personalization`.
- **4958679** `Redesign news briefing: sharper curation, custom types, dedicated page`.
- **28eb96c** `Personalize news briefing pipeline + fix duration badge wrapping`.
- **69da09d** `Add news profile line for personalized search + shorten briefing title`.
- **e1cd253** `Fix home tab layout and overhaul news curation personalization`.
- **6a1b8dd** `Fix briefing cache blocking all updates + restructure card layout`  - 
  cache invalidation bug + layout.
- **b0d2f8c** `restructure BriefingCard so expanded headlines span full card width`.
- **1559dac** `Add importance-ranked memories and diverse search topics to briefing curation`.
- **337ba4f** `Resolve merge conflict in BriefingCard.tsx`.

### Third hang saga - timeout < pipeline

- **ff97283** `stabilize briefing panel height to prevent memory web layout shifts`.
- **3121000** `prevent infinite hang when briefing generation times out`  - 
  **F10**. `useAutoGenerateBriefing.refetch()` was inside the success path
  only. Moved to always run.
- **9e0477a** `replace timer-based bridge with three-state fallback`  - 
  `generating` banner auto-clears after 5s if briefing never arrives.
- **b716d99** `replace timeout-based briefing generation with polling architecture`  - 
  **F1** (canonical). Added `fetchWithTimeout` to every external call
  (Perplexity 15s, Tavily/Brave 8s, OpenAI curation 10s, script 20s).
  Split generation into two phases (headline-only insert → full update).
  Client now polls DB instead of racing a timeout. The commit message is
  explicit: "Previous fixes (6 in 9 days) patched UI state transitions but
  never addressed the timeout mismatch."
- **0f16f85** `refetch before setting generating=false to prevent CTA flash`  - 
  **F2**. Swapped the order of the two side-effects in the poll handler.
- **7ecbeb7** `insert headlines immediately after news fetch (before curation)`  - 
  **F3**. Moved the DB insert upstream so raw headlines land in ~7-15s.
- **4006053** `add briefing regeneration and fix mobile layout width`  - 
  **F6**. Added `force` parameter; fallback curation now receives user
  context.
- **44c3e12** `repair voice transcription and show headlines fast`  - 
  **F3**, **F7**. Preliminary insert + 3s DB poll. Also fixed AI Landscape
  segment being clobbered by Perplexity.
- **fe6aeeb** `briefing card z-index overlay and speed up generation`  - 
  **F9**. `Promise.any` race across news providers. `gpt-4o` →
  `gpt-4o-mini` default for script gen (2-3× speedup).

### Data-isolation PR (#83) - the most recent regression point

- **3253471** `harden data isolation, extraction guardrails, per-target exports, training file`  - 
  added two **serial DB reads** before the OpenAI call in
  `generate-briefing`: `loadTrainingForUser()` and
  `user_briefing_directives`. This tipped cold starts past the 30s client
  timeout again, reintroducing **F1**. Also introduced three new
  tables that had to exist before the function could succeed:
  - `training_material` (required; seeded via
    `scripts/seed-training-material.ts`)
  - `user_briefing_directives` (optional per-user override)
  - `fact_extraction_log` (observability only)

  The migration `20260412000000_data_isolation_and_training.sql` must be
  applied and a `version=1, scope=global, is_active=true` training row
  must exist or `loadTrainingForUser` silently falls back to the in-code
  skeleton (`FALLBACK` in `supabase/functions/_shared/training-loader.ts`).

- **3abe1ce** `raise briefing generation timeout from 30s to 60s`  - 
  patches **F1** for the post-#83 pipeline. Not a redesign - just reflects
  that the pipeline grew.

---

## Diagnosis checklist (use this before writing a new fix)

When a user reports "briefing hangs" or "headlines don't refresh":

1. **Check the client timeout vs pipeline length.** `GENERATE_TIMEOUT` in
   `src/hooks/useBriefing.ts` should comfortably exceed the slowest known
   cold-start path. Current: 60s. The pipeline's own external-call
   timeouts sum to ~50s worst-case if every provider is slow.

2. **Check whether the DB row exists.** If `briefings` has a row for
   today but `script_text IS NULL`, the function got past Phase 1b but
   died before Phase 4b. Look at `model_used` and `context_snapshot` in
   the row for clues.

3. **Check training material is seeded.**
   ```sql
   SELECT version, scope, is_active,
          jsonb_array_length(body_parsed->'evaluation_corpus') AS corpus_size
   FROM public.training_material WHERE scope='global' AND is_active=true;
   ```
   Expect: `version=1+, corpus_size=8`. If this returns zero rows the
   function still works (via `FALLBACK`) but the briefing voice quality
   regresses and typography filters are weaker.

4. **Check edge function logs for this sequence.** In order:
   - `After curation: N headlines`
   - `Loading training material...`
   - `Briefing produced with training_material_version=N`

   If you see step 1 and 2 but never step 3, the hang is in training-load
   or the OpenAI call for the script. If you never see step 2, the hang
   is upstream of the isolation PR.

5. **Check the service role key path.** If you see generic 401s in
   function logs, check that `SUPABASE_SERVICE_ROLE_KEY` in the function
   runtime matches the one the platform currently issues. You can't set
   this via the Management API (`SUPABASE_*` prefixed secrets are
   platform-managed), but verify with a quick PostgREST ping from inside
   the function if in doubt. *Historical note: one symptom that looks
   like this is the `ingest-training-material` function returning 401 to
   a locally-held service key - that's a local-key-stale problem, not a
   function-env problem, because function env is platform-injected.*

6. **Check client polling.** `MAX_POLLS=40, POLL_INTERVAL=3s → 120s cap`.
   If the function takes longer than 120s the UI gives up even if the
   row eventually lands. Bump `MAX_POLLS` before bumping the invoke
   timeout.

---

## Anti-patterns seen in this saga (do not repeat)

- **Adding another client-side timeout as a "safety net"** without
  aligning it to the server pipeline. Every previous attempt to do this
  failed and had to be reverted. The polling architecture (`b716d99`) is
  the correct pattern - fire-and-poll, don't race.
- **Inserting the final row only after every phase completes.** Always
  write a partial row early so the client has something to poll for.
- **Fire-and-forget the synthesis response.** It carries the audio URL
  (`0ee9cae`). If you must fire-and-forget for latency, still write the
  URL to the DB row so polling can find it.
- **Sequential provider cascades for news.** Use `Promise.any`  - 
  Perplexity alone can take 15s+.
- **New serial DB reads in the hot path** without raising the client
  timeout in the same commit. This was the proximate cause of the
  post-#83 regression.

---

## Related files

- `supabase/functions/generate-briefing/index.ts` - the pipeline
- `supabase/functions/_shared/training-loader.ts` - training material fetch + cache
- `supabase/functions/_shared/fact-guardrails.ts` - typography + banned-phrase post-processing
- `supabase/functions/synthesize-briefing/index.ts` - TTS
- `src/hooks/useBriefing.ts` - client `generate`, polling, `GENERATE_TIMEOUT`
- `src/components/briefing/BriefingCard.tsx` - three-state render
- `training/anchor.yaml` - seed source for `training_material`
- `scripts/seed-training-material.ts` - seeder

---

*Last updated: 2026-06-14. When adding an entry, keep the
F-code table current - future regressions almost always map back onto one
of these ten failure modes.*
