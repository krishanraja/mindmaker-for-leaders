# Phase 0 · ITEM 2 — Schedule the Dormant Engines (implementation spec)

> Scope: schedule `memory-lifecycle` (temperature promote/demote/archive + budget) and
> `memory-synthesize` (facts → `user_patterns`), which are **built but never scheduled and
> never called**. Companion to ITEM 1 (fire `touch_memory_fact`), on which lifecycle is
> partly dependent. This is an IMPLEMENTATION SPEC ONLY — no files in `C:/Users/krish/mm-ctrl`
> were modified. Authoritative context: `_INTELLIGENCE-LAYER.md` Part 1 (Pillar 1) + Part 5;
> `intel-data-lifecycle.md` §5 + §15; `CTRL-BUILD-ROADMAP.md` Phase 0.
> Project: `bkyuxvschuwngtcdhsyg` · prod `ctrl.themindmaker.ai`.

---

## 0. The finding in one paragraph (read this first)

The two engines are **per-user, JWT-authed, single-`user.id`** functions. Each reads its
target user from the caller's JWT (`supabase.auth.getUser()`), builds a client with the
**anon key** + the request's `Authorization` header, and operates on exactly that one user
under RLS. They take **no `user_id` argument** and have **no way to iterate users**. That is
why a global pg_cron (the `send-daily-briefing` pattern) cannot drive them as-is: a cron
fires one HTTP POST with a service-role bearer and an empty body — there is no per-user JWT
to mint, and the functions would either 401 (no user in a service token) or operate on
nobody. **Therefore the work is not merely "add a cron"; it is "add a service-role sweep
entrypoint to each engine, then schedule one nightly sweep that runs lifecycle THEN
synthesize over active users."** The sweep wrapper is the load-bearing change; the cron is a
six-line migration once the wrapper exists. Prior art for exactly this service-role sweep
shape already lives in the repo: `decision-watch`, `batch-compute-drift`, `send-daily-briefing`.

---

## 1. Ground truth — what the engines are today (verified against live code)

### 1a. `memory-lifecycle` — `supabase/functions/memory-lifecycle/index.ts` (207 lines)
- **Auth model (lines 14-27):** `const authHeader = req.headers.get("Authorization")!;` then
  `createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global:{ headers:{ Authorization: authHeader }}})`,
  then `supabase.auth.getUser()` → **401 if no user**. Operates on `user.id` only (line 29).
- **What it does (per-user):** five steps over `user_memory` filtered `user_id = userId`,
  `is_current = true`, `archived_at IS NULL`:
  1. promote `warm→hot` where `reference_count >= 3 AND last_referenced_at >= now()-7d` (lines 42-59)
  2. demote `hot→warm` where `last_referenced_at < now()-14d` (lines 62-78)
  3. demote `warm→cold` where `last_referenced_at < now()-30d` (lines 81-97)
  4. archive `cold` where `last_referenced_at < now()-90d` → sets `archived_at` (lines 100-116)
  5. recompute `user_memory_budget` (`hot_token_count`/`warm_token_count` = `ceil(len/4)`,
     `total_facts`, `last_cleanup_at`), upsert on `user_id` (lines 119-154); then force-demote
     the 5 lowest-`reference_count` hot facts if `hot_tokens > hot_max_tokens` (default 4000) (lines 156-182).
- **No external API calls.** Pure DB. Cheap and fast per user (a handful of indexed
  filtered updates + one upsert). **Idempotent by construction** — rerunning the same day is a
  near-noop (the temperature thresholds are absolute against `now()`).
- **Cost:** ~0 dollars; ~6-9 small queries per user.
- **`config.toml`:** memory-lifecycle has **no entry** → inherits the dashboard default
  `verify_jwt = true`. (Functions absent from config.toml default to JWT-required.)

### 1b. `memory-synthesize` — `supabase/functions/memory-synthesize/index.ts` (202 lines)
- **Auth model (lines 15-28):** identical anon-key + JWT + `getUser()` → 401 if no user;
  operates on `user.id` (line 30).
- **What it does (per-user):** loads hot+warm `user_memory` (line 33-40); **early-returns if
  `< 5 facts`** (lines 42-57); builds a facts summary; calls **OpenAI `gpt-4o`**, JSON mode,
  `max_tokens: 1500`, `temperature 0.3`, via `fetchWithTimeout(..., timeoutMs: 12000, retry)`
  (lines 73-107); parses up to 10 patterns; fuzzy-merges into `user_patterns` (bump
  `evidence_count`, raise `confidence`, flip `emerging→confirmed` at conf>0.8 AND evidence>3)
  or inserts new `emerging` rows (lines 128-178).
- **Cost:** **one gpt-4o call per user per run** (~1.5-3K tokens in, ≤1.5K out). This is the
  cost driver and the reason synthesize must NOT run per-user-daily blindly.
- **Hard dependency:** `OPENAI_API_KEY` secret. **NOTE (live-ops):** the CTRL OpenAI billing
  has been exhausted recently (memory: "app rides Gemini for skill/plan until top-up"). gpt-4o
  here has **no fallback** — if billing is dry, synthesize throws `OpenAI API error: 429`.
  See §7 Risk R4.
- **`config.toml`:** memory-synthesize has **no entry** → inherits default `verify_jwt = true`.

### 1c. Confirmed dormant (grep, both directions)
- **No client caller:** `Grep "memory-lifecycle|memory-synthesize"` over `C:/Users/krish/mm-ctrl/src`
  → **0 matches.** Neither is `functions.invoke()`-d anywhere in the frontend.
- **No cron:** no `cron.schedule` in `supabase/migrations/` references either function
  (the only two `cron.schedule` calls are `daily-briefing-email` and `kit-nudges-email`).
- Corroborated by `intel-data-lifecycle.md` §5 items 2 & 3.

### 1d. The ITEM 1 dependency (why lifecycle is half-starved until ITEM 1 lands)
`reference_count` and `last_referenced_at` are **never written today** — `touch_memory_fact`
(defined in `20260306000000_memory_web_temperature.sql:26`) is never invoked from
`getUserContext`/`buildMemoryContext` (ITEM 1's job). Consequence for lifecycle:
- `last_referenced_at` defaults to `now()` at fact creation and never moves, so **demotion
  rules 2-4 effectively never fire** until a fact ages 14/30/90 days past *creation* — they
  decay on age, not on reliance. Not wrong, just not yet "tracks reliance."
- `reference_count` stays 0, so **promotion rule 1 never fires** (`>= 3` is unreachable).
- **This does not block scheduling.** Lifecycle is still worth running now: budget recompute
  (step 5) is correct and useful immediately, age-based archival (rule 4) is correct, and the
  engine becomes *fully* meaningful the day ITEM 1 ships — no second deploy needed. Schedule
  it now; it lights up on its own when reliance data starts flowing.

---

## 2. How scheduling actually works in this repo (the mechanism, discovered)

**Mechanism = Supabase `pg_cron` + `pg_net`, defined in a migration, POSTing to the edge
function with the service-role key.** Not Vercel cron (the only `vercel.json` has rewrites
only, no `crons` key), not a GitHub Action, not a Supabase "scheduled function" UI object.

Canonical example — `supabase/migrations/20260605000000_daily_briefing_trigger.sql`:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('daily-briefing-email')
where exists (select 1 from cron.job where jobname = 'daily-briefing-email');

select cron.schedule(
  'daily-briefing-email',
  '0 12 * * *',
  $CRON$
  select net.http_post(
    url := 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/send-daily-briefing',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $CRON$
);
```

Three established facts this gives us:
1. **The cron passes a service-role bearer**, read from the Postgres GUC
   `app.supabase_service_role_key` via `current_setting(..., true)`. The key is never
   hardcoded. (Same GUC used by `kit-nudges-email`.) **Pre-req to verify at deploy time:** the
   GUC must be set on the prod DB (`ALTER DATABASE postgres SET app.supabase_service_role_key = '...'`);
   the daily-briefing + kit-nudge crons already rely on it, so it is set — confirm before relying on it.
2. **The target function must be `verify_jwt = false`** so the platform gateway lets the POST
   through; the function then enforces its own service-role check internally. `send-daily-briefing`
   and `send-kit-nudges` are both `verify_jwt = false` in `config.toml`.
3. **The schedule string is a standard 5-field cron in UTC.** Existing slots taken:
   `0 12 * * *` (daily-briefing), `0 14 * * *` (kit-nudges).

**The service-role-internally-enforced sweep template** (what our wrapper must imitate) —
`supabase/functions/decision-watch/index.ts`:
- `roleFromJwt(bearer) !== "service_role"` → `403` (lines 27-45): decodes the JWT payload,
  checks `role === "service_role"`, rejects anything else. This is how a `verify_jwt=false`
  function stays locked to cron-only.
- `createClient(url, serviceKey, { auth:{ persistSession:false }})` (line 49): service-role
  client, bypasses RLS, can read across all users.
- Iterates a **capped batch** of rows (`MAX_CASES=2`, `MAX_CLAIMS=6`) with a staleness cursor
  (`last_verified_at`), updates a per-row `last_verified_at` watermark so the next hourly run
  picks up where this left off. **This is the exact pattern our memory sweep should copy.**
- `batch-compute-drift` is a second precedent: a `verify_jwt=false` service-role function that
  iterates *all* users for a weekly cron.

---

## 3. The decision: ONE nightly service-role SWEEP, not per-user cron (justified)

**Recommendation: build a single service-role sweep entrypoint into each engine, then schedule
ONE nightly pg_cron that runs lifecycle THEN synthesize over active users. Reject per-user cron.**

### Why not per-user cron
- **No infrastructure for it.** pg_cron schedules are global rows in `cron.job`; there is no
  per-user cron in this stack and creating one cron row per user (thousands) is an
  anti-pattern Supabase explicitly warns against. The existing daily-briefing/kit-nudge crons
  are deliberately one-global-pass for this reason (see the comment in
  `20260605000000_daily_briefing_trigger.sql:18` — "Per-user timezone-aware scheduling is a
  later refinement; v1 sends one global pass").
- **A cron cannot mint a per-user JWT.** `net.http_post` can only attach the service-role
  bearer. The engines' current anon-key+JWT mode is structurally un-cron-able. Something must
  iterate users with a service-role client regardless — that something is the sweep.
- **Cost would be unbounded and dumb.** Per-user-daily synthesize = one gpt-4o call per user
  every night forever, including users who added zero facts. The sweep lets us gate synthesize
  on "has new/changed facts since last synthesis," which per-user cron cannot express.

### Why the single nightly sweep wins
- **Cost control (the synthesize lever).** The sweep iterates only **active users** and only
  calls gpt-4o for users whose memory actually changed — turning an O(all-users) nightly spend
  into O(users-who-added-facts). Lifecycle (free) can run for every active user; synthesize
  (paid) runs only where there's something new to learn.
- **Idempotency.** Lifecycle is idempotent by construction (absolute time thresholds).
  Synthesize is made idempotent by a per-user `last_synthesized_at` watermark + a "facts
  changed since" gate, so a re-run the same night is a no-op. A crash mid-sweep is safe: the
  next run resumes from the watermark, exactly like `decision-watch`'s `last_verified_at`.
- **Edge-runtime budget.** One function invocation must finish inside the Supabase wall clock
  (~150s for a scheduled/background function; external calls already capped at 12s each via
  `with-timeout.ts`). A **capped batch per run** (e.g. 25 lifecycle + up to 15 synthesize per
  invocation) keeps every run bounded; the watermark drains any backlog across nights. Mirrors
  `decision-watch`'s `MAX_CASES`/`MAX_CLAIMS` discipline.
- **Single source of truth + one ordering guarantee.** Lifecycle must run **before**
  synthesize so synthesize reads freshly re-temperatured hot+warm facts. A single sweep
  guarantees that order in-process. Two independent crons would race.

### The invocation order (load-bearing)
For each active user in the batch: **`lifecycle(user)` → then `synthesize(user)`**, in that
order, in the same sweep pass. Rationale: lifecycle re-tiers facts (sets which are hot/warm)
and synthesize reads exactly `temperature IN ('hot','warm')` (memory-synthesize line 39). Run
synthesize first and it reads yesterday's tiering. Order is enforced by the sweep loop body,
not by two crons.

---

## 4. The build — exact changes

There are two viable shapes for "add a service-role sweep." **Recommended: Option A** (one new
orchestrator function + a tiny `user_id`-mode addition to each engine). It is the smallest
diff, keeps each engine independently testable, and reuses the engines' existing logic verbatim.

### 4a. Add a service-role `user_id` mode to BOTH engines (small, surgical)

Today each engine derives `userId` only from the JWT. Add: if the caller is service-role AND a
`user_id` is supplied in the body, use that `user_id` with a service-role client. Keep the
existing JWT path 100% intact (the engines remain individually callable by an authed user,
which is useful for a future "re-learn now" button and for QA).

**`memory-lifecycle/index.ts` — replace the auth block (current lines 13-29):**

```ts
// new: accept either an authed user (JWT) OR a service-role sweep call with { user_id }
const authHeader = req.headers.get("Authorization") ?? "";
const bearer = authHeader.replace("Bearer ", "");
const isServiceRole = roleFromJwt(bearer) === "service_role"; // helper copied from decision-watch

let userId: string;
let supabase;

if (isServiceRole) {
  // sweep mode: service-role client, target user from body
  let bodyUserId: string | null = null;
  try { const b = await req.json(); if (b && typeof b.user_id === "string") bodyUserId = b.user_id; } catch { /* ignore */ }
  if (!bodyUserId) {
    return json({ error: "service-role call requires user_id" }, 400);
  }
  userId = bodyUserId;
  supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
} else {
  // existing per-user JWT mode (unchanged)
  supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);
  userId = user.id;
}
```

Add the `roleFromJwt` helper (verbatim from `decision-watch/index.ts:27-36`) and a `json()`
helper to both files. **Everything below the auth block in each engine stays byte-for-byte the
same** — both already operate purely on the `userId` variable and the `supabase` client.
(`user_memory_budget` + `user_patterns` already carry "Service role full access" RLS policies —
`20260306000001_memory_budget.sql:31` and `20260306000003_user_patterns.sql:23` — so the
service-role client writes cleanly. `user_memory` likewise has a service-role FOR ALL policy per
`intel-data-lifecycle.md` §0.)

**`memory-synthesize/index.ts` — same auth-block swap (current lines 14-30).** Body below
unchanged.

**`config.toml` — add two entries** so the platform gateway lets the sweep's service-role POST
through to each engine (the function then enforces `service_role` itself for sweep calls; JWT
callers still authenticate inside):

```toml
# Called by the nightly memory-sweep cron with the service role key (sweep mode),
# OR by an authed user with their JWT (re-learn-now / QA). Function enforces both.
[functions.memory-lifecycle]
verify_jwt = false

[functions.memory-synthesize]
verify_jwt = false
```

> **Security note:** flipping these to `verify_jwt=false` is safe ONLY because the new auth block
> rejects (a) service-role calls without a `user_id` (400) and (b) — for the JWT path — still
> runs `getUser()` and 401s on no user. An anon/no-auth POST hits the JWT branch, `getUser()`
> returns no user → 401. There is no unauthenticated path to another user's data. This mirrors
> exactly how `send-daily-briefing` and `decision-watch` are safe at `verify_jwt=false`.

### 4b. New orchestrator function: `memory-sweep`

`supabase/functions/memory-sweep/index.ts` — service-role-only, iterates active users in a
capped batch, calls lifecycle then synthesize per user via internal `fetch` to the two engines
(or, to avoid HTTP hops, by importing their core logic; HTTP is simpler and matches how the
engines already deploy). Pattern lifted from `decision-watch` + `batch-compute-drift`.

Behaviour:
1. `roleFromJwt(bearer) !== "service_role"` → `403` (cron-only).
2. Service-role client.
3. **Select active-user batch.** "Active" = users with at least one non-archived current fact
   touched recently. The cheapest correct signal available today:
   ```sql
   -- distinct users with current, non-archived memory, most-stale-synthesis first
   select um.user_id,
          max(um.updated_at)            as last_fact_change,
          b.last_synthesized_at         as last_synth   -- new column, see 4c
   from user_memory um
   left join user_memory_budget b on b.user_id = um.user_id
   where um.is_current = true and um.archived_at is null
   group by um.user_id, b.last_synthesized_at
   order by b.last_synthesized_at asc nulls first
   limit :BATCH;     -- BATCH = 25
   ```
   (Implemented as a Postgres RPC `get_memory_sweep_batch(p_limit int)` — see 4c — to keep the
   edge function simple and the query indexed. Falls back to a plain `.from('user_memory')`
   select if you prefer no RPC.)
4. For each user in the batch, **in order**:
   a. POST `…/functions/v1/memory-lifecycle` with `{ user_id }` + service-role bearer. (free, always)
   b. **Gate synthesize:** only if `last_fact_change > last_synth` (or `last_synth IS NULL`) AND
      the user has `>= 5` hot/warm facts — i.e. only when there is genuinely something new to
      learn. Then POST `…/functions/v1/memory-synthesize` with `{ user_id }`. (paid; gated)
   c. On synthesize success, stamp `user_memory_budget.last_synthesized_at = now()` for that user.
5. Hard caps per invocation: `LIFECYCLE_MAX = 25`, `SYNTH_MAX = 15` (gate above usually keeps
   real synth count well under this). Stop early if either cap hit; the watermark resumes next
   night. Wrap each per-user call so one user's failure never aborts the sweep (try/catch,
   count + log, continue) — same defensive posture as `send-daily-briefing`'s recipient loop.
6. Return `{ users_processed, lifecycle_ok, synth_ok, synth_skipped, errors }` and `log.info`.

Service-role bearer for the internal POSTs: read `SUPABASE_SERVICE_ROLE_KEY` from env and send
`Authorization: Bearer ${serviceKey}` — the engines' new `roleFromJwt` check then sees
`service_role` and takes sweep mode. (The service-role *key* is itself a signed JWT whose
payload `role` is `service_role`, so `roleFromJwt` decodes it correctly — same as decision-watch
trusting the cron's bearer.)

**`config.toml` — add:**
```toml
# Nightly memory learning sweep. Cron-only (enforces service_role internally).
[functions.memory-sweep]
verify_jwt = false
```

### 4c. Migration — schema (watermark column + batch RPC) + the cron

`supabase/migrations/20260612000000_memory_sweep_cron.sql` (new). Idempotent. Pattern mirrors
`20260605000000_daily_briefing_trigger.sql` exactly.

```sql
-- Phase 0 / ITEM 2: schedule the dormant memory learning engines.
-- Adds a per-user synthesis watermark + a batch RPC, then schedules ONE nightly
-- sweep that runs memory-lifecycle THEN memory-synthesize over active users via
-- pg_cron + pg_net (same pattern as daily-briefing / kit-nudges). Idempotent.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Per-user "last successful synthesis" watermark. Lives on the existing budget
-- row (1:1 with user). NULL = never synthesized = first in line.
alter table if exists user_memory_budget
  add column if not exists last_synthesized_at timestamptz;

-- Indexes that make the sweep batch query cheap.
-- (idx_user_memory_temperature already covers user_id+temperature WHERE current/non-archived,
--  per 20260306000000; this one supports the "active users by stale synthesis" scan.)
create index if not exists idx_user_memory_active_by_user
  on user_memory (user_id)
  where is_current = true and archived_at is null;

-- Batch selector: distinct active users, most-stale-synthesis first.
create or replace function get_memory_sweep_batch(p_limit int default 25)
returns table (user_id uuid, last_fact_change timestamptz, last_synth timestamptz)
language sql
security definer
set search_path = public
as $FN$
  select um.user_id,
         max(um.updated_at)    as last_fact_change,
         b.last_synthesized_at as last_synth
  from user_memory um
  left join user_memory_budget b on b.user_id = um.user_id
  where um.is_current = true and um.archived_at is null
  group by um.user_id, b.last_synthesized_at
  order by b.last_synthesized_at asc nulls first
  limit p_limit;
$FN$;

-- Re-schedule cleanly for idempotency.
select cron.unschedule('memory-sweep-nightly')
where exists (select 1 from cron.job where jobname = 'memory-sweep-nightly');

-- 03:00 UTC daily — a quiet window, off the 12:00 briefing / 14:00 kit-nudge slots,
-- and (critically) BEFORE the 12:00 briefing build so the briefing reads freshly
-- re-temperatured facts + newly-synthesized patterns the same morning.
-- send-daily-briefing has verify_jwt=false; memory-sweep likewise; the service-role
-- key comes from the same app.supabase_service_role_key GUC the other crons use.
select cron.schedule(
  'memory-sweep-nightly',
  '0 3 * * *',
  $CRON$
  select net.http_post(
    url := 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/memory-sweep',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $CRON$
);
```

> **Backlog note:** with `BATCH=25` and one run/night, a base larger than 25 active users drains
> over several nights (most-stale-first). If the active base is bigger, either raise `BATCH`
> (lifecycle is cheap) or move the cron to `*/30 * * * *` for a few nights to drain, then back to
> daily. The watermark makes any cadence safe and idempotent. For the current small user base,
> `BATCH=25` clears everyone in a single nightly run.

### 4d. Deploy steps (per repo CLAUDE.md conventions — agent does these, not the user)
1. `supabase functions deploy memory-lifecycle` (auth-block change)
2. `supabase functions deploy memory-synthesize` (auth-block change)
3. `supabase functions deploy memory-sweep` (new)
4. Apply `config.toml` (committed; takes effect on the deploys above — confirm the three
   functions show `verify_jwt=false` in the dashboard).
5. Apply the migration SQL via the Management API (per CLAUDE.md — local migration history is
   out of sync; do NOT `supabase db push`). Use the `Invoke-RestMethod` block in CLAUDE.md
   against `…/projects/bkyuxvschuwngtcdhsyg/database/query`. `$CRON$` dollar-quoting avoids the
   `$$`-interpolation gotcha; the cron body has no `$$` PL/pgSQL block.
6. **Verify the GUC exists:** `select current_setting('app.supabase_service_role_key', true) is not null;`
   (it powers daily-briefing already, so it should be set — confirm).

---

## 5. Verification / proof (Phase 0 success criteria for ITEM 2)
- **Cron registered:** `select jobname, schedule, active from cron.job where jobname='memory-sweep-nightly';`
  → one active row, `0 3 * * *`.
- **Manual first run (don't wait for 03:00 UTC):** invoke `memory-sweep` once with a service-role
  bearer; assert the JSON shows `users_processed > 0`, `lifecycle_ok > 0`.
- **`user_patterns` populates for real users:** after a run on a user with ≥5 facts,
  `select count(*) from user_patterns where user_id = :u and status != 'deprecated';` moves from 0.
  (This is the headline Phase-0 proof: "`user_patterns` populates for real users.")
- **Budget recompute fires:** `user_memory_budget.last_cleanup_at` and `last_synthesized_at`
  advance for swept users.
- **Idempotency:** run the sweep twice back-to-back; the second run reports `synth_skipped`
  high / `synth_ok` ~0 (watermark gate held) and temperatures unchanged.
- **Once ITEM 1 lands:** `reference_count`/`last_referenced_at` start moving → re-run sweep →
  promotions/demotions begin firing on reliance, not just age. (Full proof of the loop is the
  joint ITEM 1 + ITEM 2 outcome.)

---

## 6. Why this is decoupled from the frontend rebuild
Zero frontend files touched. All changes are in `supabase/functions/**` + one migration +
`config.toml`. The engines' existing JWT path is preserved untouched, so any future "re-learn
now" button (Phase 2/3) calls the same functions with a user JWT and gets the same behaviour.
Nothing here depends on the new shell, nav, or design primitives.

---

## 7. Risks / watch-items
- **R1 — synthesize cost runaway.** Mitigated by the active-user batch + the
  `last_fact_change > last_synth` gate + `SYNTH_MAX`. Without the gate, this is O(all-users)
  gpt-4o nightly. The gate is not optional; it is the cost control.
- **R2 — OpenAI billing exhausted (live ops reality).** `memory-synthesize` has NO fallback
  (unlike the skill/plan pipeline which now rides Gemini). If billing is dry, every synthesize
  POST throws 429; lifecycle still runs fine (no API). **Recommendation:** wrap the synth call
  so a 429/insufficient_quota is caught, counted as `synth_skipped`, logged, and does NOT stamp
  `last_synthesized_at` (so it retries next night) — never aborts the sweep. Optional follow-up:
  port `memory-synthesize` onto `_shared/llm-fallback.ts` (Gemini fallback) to match the rest of
  the app. Out of scope for "schedule it"; noted because it will bite on first prod run otherwise.
- **R3 — `verify_jwt` flip.** Changing memory-lifecycle/synthesize to `verify_jwt=false` is only
  safe with the new auth block in place. Deploy the function code change and the config change
  together; do not flip config before the code lands, or an unauthenticated POST could reach the
  engine before the internal guard exists.
- **R4 — GUC missing.** If `app.supabase_service_role_key` is unset on prod, the cron POST sends
  `Authorization: Bearer ` (empty) and `memory-sweep` 403s every night silently. Verify in §4d
  step 6. (Daily-briefing already depends on it, so it is almost certainly set.)
- **R5 — lifecycle starved pre-ITEM-1.** As §1d: until `touch_memory_fact` fires, promotion
  never triggers and demotion is age-based. Schedule anyway (budget + archival are useful now;
  the rest lights up automatically when ITEM 1 ships). Do NOT gate ITEM 2 on ITEM 1 — they are
  independent deploys; ITEM 2 is correct and safe to ship first.
- **R6 — backlog if active base > BATCH.** Handled by most-stale-first ordering + watermark; see
  the backlog note in 4c. Tune `BATCH` or temporarily tighten the cron cadence to drain.

---

## 8. File-touch summary (for the eventual PR — NOT done in this spec)
| Path | Change |
|---|---|
| `supabase/functions/memory-lifecycle/index.ts` | add service-role `{user_id}` sweep mode (auth block + `roleFromJwt`/`json` helpers); body unchanged |
| `supabase/functions/memory-synthesize/index.ts` | same auth-block swap; wrap gpt-4o call to catch 429 → `synth_skipped` (R2) |
| `supabase/functions/memory-sweep/index.ts` | **NEW** — service-role nightly orchestrator: batch active users, lifecycle→synthesize per user, gated + capped + watermarked |
| `supabase/config.toml` | add `[functions.memory-lifecycle]`, `[functions.memory-synthesize]`, `[functions.memory-sweep]` all `verify_jwt = false` |
| `supabase/migrations/20260612000000_memory_sweep_cron.sql` | **NEW** — `last_synthesized_at` column + `idx_user_memory_active_by_user` + `get_memory_sweep_batch()` RPC + `cron.schedule('memory-sweep-nightly','0 3 * * *', …)` |
