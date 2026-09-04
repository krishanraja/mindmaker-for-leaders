# Phase 0 · Item 1 — THE USAGE SIGNAL (`touch_memory_fact`)

> **Implementation spec only. No file in `C:/Users/krish/mm-ctrl` is modified by this document.**
> Authoritative context: `_INTELLIGENCE-LAYER.md` Part 3.5 + Part 5.1; `CTRL-BUILD-ROADMAP.md` Phase 0.
> Grounded against the live repo at HEAD on 2026-06-12. Every path / line number / signature below was read, not guessed.

---

## 0 · The one-line thesis

`touch_memory_fact(p_fact_id UUID)` exists in prod (migration `20260306000000_memory_web_temperature.sql`), increments `reference_count` + stamps `last_referenced_at = now()`, and **is never called from anywhere** (`grep -rn touch_memory_fact` over the whole repo returns only the migration that defines it + two doc files). Every reader (`getUserContext`, `buildMemoryContext`, plus six export callers) READS facts and injects them into prompts/exports but never signals reliance. Result: `reference_count` is frozen at `0`, `last_referenced_at` is frozen at row-create time, the temperature engine (`memory-lifecycle`) is starved of its only input, and the "X hot / getting smarter" UI is a performed signal. **This is the single highest-leverage write in the codebase: the smallest change that makes the largest model honest.**

The fix has three parts: (1) a **DB change** to add a batched, RLS-safe `touch_memory_facts(uuid[])` RPC and grant it; (2) **edge-function edits** to fire that batched touch fire-and-forget at every true "relied upon" injection; (3) a hard rule that **read-only diagnostics do NOT touch.**

---

## 1 · The RPC as it exists today (exact)

**File:** `supabase/migrations/20260306000000_memory_web_temperature.sql`, lines 26-38.

```sql
CREATE OR REPLACE FUNCTION touch_memory_fact(p_fact_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_memory
  SET reference_count = reference_count + 1,
      last_referenced_at = now()
  WHERE id = p_fact_id
    AND is_current = true;
END;
$$;
```

| Property | Value | Consequence |
|---|---|---|
| **Name / signature** | `touch_memory_fact(p_fact_id UUID) RETURNS void` | Single-id only — N injected facts = N round-trips. |
| **Security** | `SECURITY DEFINER` | Runs as function owner; **bypasses RLS**. |
| **What it writes** | `reference_count += 1`, `last_referenced_at = now()` on the one current row | Exactly the two columns `memory-lifecycle` reads (promote warm→hot at `reference_count ≥ 3` + used in 7d). |
| **Ownership guard** | **NONE** — no `auth.uid()` check, no `user_id` predicate | **Cross-tenant write hole if exposed to a user JWT** (see §4). |
| **GRANT** | **NONE** — no `GRANT EXECUTE … TO authenticated` anywhere (grep confirms only `get_user_memory_context` / `get_pending_verifications` / `verify_memory_fact` are granted) | A user-JWT client calling it today would get `permission denied for function`. Service-role bypasses grants, so service-role callers work. |

**Why the single-id signature is a problem:** the readers inject 15-40 facts per call. Firing `touch_memory_fact` once per fact = 15-40 separate PostgREST RPC round-trips per briefing/decision/export. That is the write-amplification + latency hazard the task calls out. **Do not loop the single-id RPC.** Add a batched variant.

---

## 2 · Where facts are TRULY "relied upon" (the injection sites)

A fact is "relied upon" when its `fact_value` is rendered into a prompt sent to a model, or into an artefact handed to the user/another tool. Two reader functions produce every such injection; below is the exhaustive caller map with the verdict on whether each should touch.

### Reader A — `getUserContext(supabase, userId)`
**File:** `supabase/functions/_shared/user-context.ts`, lines 63-263.
Loads `user_memory` facts (lines 88-95: `identity|business|objective|blocker|preference`, limit 40) + the `watching_company` rows (lines 155-160) and projects them into a `UserContext`.

> **BLOCKER in the reader itself:** the primary `user_memory` select (line 90) is
> `.select("fact_key, fact_value, fact_category")` — **it does not select `id`**. The watchlist select (line 156) selects only `fact_value`. So the fact IDs needed to touch are not currently in hand. The edit MUST add `id` to both selects and collect the IDs. (Contrast: `buildMemoryContext` already selects `id` — see Reader B.)

| Caller | File:line | Client passed | Real injection? | Touch? |
|---|---|---|---|---|
| `generate-briefing` | `generate-briefing/index.ts:1713` | **service role** (`supabase`, built l.1550 w/ `SERVICE_ROLE_KEY`) | YES — `userCtx` feeds the Perplexity prompt (`buildPerplexityPrompt`, l.62+), the importance lens, and curation. | **YES** |
| `decision-engine` | `decision-engine/index.ts:60` | **service role** (`admin`, l.57) | YES — `ctx` is injected into `decompose.ts` (l.27-35 `contextBlock`), `advise.ts` (l.21-26), `crossexamine.ts` (l.40-44). The crown-jewel prompt path. | **YES** |
| `briefing-diagnose` | `briefing-diagnose/index.ts:67` | service role (`supabase`, l.57) | NO — read-only "reproduce the inputs" diagnostic. Touching here would inflate `reference_count` every time a user opens "why am I seeing this?", corrupting the reliance signal. | **NO — explicitly excluded** |

### Reader B — `buildMemoryContext(supabase, userId, options)`
**File:** `supabase/functions/_shared/memory-context-builder.ts`, lines 498-606.
Fetches hot facts (l.511-518) + warm facts (l.522-531) — **already selects `id`** (l.513, l.525) — and renders them into per-target artefacts.

| Caller | File:line | Client passed | Real injection? | Touch? |
|---|---|---|---|---|
| `edge-generate` | `edge-generate/index.ts:219` | **user-JWT** (`supabase`, anon key + `Authorization` header, l.141-145) | YES — memory rendered into the Edge artefact + the generation prompt. | **YES** |
| `generate-skill-export` | `generate-skill-export/index.ts:129` | **user-JWT** (`supabase`, l.61-63) | YES — context becomes the exported skill. | **YES** |
| `generate-custom-export` | `generate-custom-export/index.ts:65` | **user-JWT** (`supabase`, l.21-23) | YES | **YES** |
| `generate-team-instructions` | `generate-team-instructions/index.ts:42` | **user-JWT** (`supabase`, l.17-19) | YES | **YES** |
| `memory-export` | `memory-export/index.ts:33` | **user-JWT** (`supabase`, l.16-18) | YES — the portable "one brain behind every tool" export. | **YES** |
| `synthesize-edge-profile` | `synthesize-edge-profile/index.ts:83` | **user-JWT** (`supabase`, l.46-48; a `serviceClient` also exists l.77-79) | YES — context drives the strength/weakness synthesis. | **YES** |
| `kit-compose` | `kit-compose/index.ts:284` | **service role** (`serviceClient`, l.90-92) | YES — context renders into the kit. | **YES** |

**Net:** 2 sites under Reader A touch (1 explicitly excluded), 7 sites under Reader B touch. The export callers are the bulk, and most pass a **user-JWT client** — which is exactly why the batched RPC must be RLS-safe and granted to `authenticated` (§4). `briefing-diagnose` is the one read-only path that must stay silent.

---

## 3 · Write-amplification, latency & the chosen pattern

**The constraint:** a briefing injects up to 40 facts; an export injects all hot+warm facts (can be 50+). Touching each via the single-id RPC = 40-50 sequential PostgREST calls on the **user-blocking request path** (`edge-generate`, `memory-export`, `decision-engine` all run before/while the response is built). That is unacceptable latency and needless DB load.

**Decision — the right pattern, layered:**

1. **Batched single RPC over an array (primary lever).** Add `touch_memory_facts(p_fact_ids uuid[])` that does **one** `UPDATE … WHERE id = ANY(p_fact_ids)`. N facts collapse to **one** round-trip and **one** `UPDATE`. This is the dominant win and removes the amplification entirely.
2. **Fire-and-forget (do not await on the user path).** Call the batched RPC **without `await`** and attach a `.catch()` that logs and swallows. The touch is a learning side-effect, never load-bearing for the response; a failed or slow touch must never delay or fail a briefing/export/decision. Pattern:
   ```ts
   // fire-and-forget: reliance signal, never blocks the user path
   void supabase.rpc("touch_memory_facts", { p_fact_ids: ids })
     .then(({ error }) => { if (error) console.warn("touch_memory_facts failed:", error.message); });
   ```
   (`decision-engine` already runs its whole pipeline under `EdgeRuntime.waitUntil` — there the touch can ride inside the background pipeline; it is off the response path by construction.)
3. **De-dupe before firing.** Collect the injected IDs into a `Set`, drop falsy values, skip the RPC entirely if the set is empty. One call per reader invocation, never per fact.
4. **No debounce needed at this layer.** Each reader call already corresponds to one real reliance event (a briefing, a decision, an export). Debouncing belongs at the lifecycle-cron layer (Item 2), not here. The natural cadence (≈1 briefing/day, a handful of exports) keeps write volume trivial once batched.

**Idempotency note:** `touch_memory_facts` is intentionally NOT idempotent — each genuine injection SHOULD bump the count. The dedupe is *within a single call* (don't double-count the same fact twice in one briefing), not *across* calls.

---

## 4 · RLS / auth — the cross-tenant hole that must be closed

`touch_memory_fact` is `SECURITY DEFINER` with **no ownership guard and no grant**. Two facts drive the design:

- **Service-role callers** (`generate-briefing`, `decision-engine`, `kit-compose`) bypass RLS and grants — they can call the function today. But the function trusts whatever IDs it's handed, so the **caller** must only pass IDs it loaded for that `userId` (it does — every select is `.eq("user_id", userId)`).
- **User-JWT callers** (the 6 export/edge functions under Reader B, plus `edge-generate`) currently **cannot** call it (no grant → `permission denied`). If we naively `GRANT EXECUTE … TO authenticated`, a malicious user could call `touch_memory_facts(['<any-uuid>'])` and inflate **another tenant's** `reference_count`/`last_referenced_at` — a cross-tenant write, the exact RLS class the fleet has been hardening (see MEMORY: compliance breach 2026-06-02).

**Therefore the batched RPC MUST self-scope to `auth.uid()`** — exactly the pattern `verify_memory_fact` uses (migration `20260114000000_create_user_memory.sql:176-222`: it `SELECT user_id … ` and bails when `v_user_id != auth.uid()`). For a set-based UPDATE, scope it in the `WHERE`:

```sql
WHERE id = ANY(p_fact_ids)
  AND is_current = true
  AND (user_id = auth.uid() OR auth.uid() IS NULL)
```

`auth.uid()` is `NULL` under the service role, so `(user_id = auth.uid() OR auth.uid() IS NULL)` evaluates `TRUE` for service-role callers (preserving their current ability to touch any user they're legitimately processing) and clamps user-JWT callers to their own rows. This single predicate makes the function **safe to grant to `authenticated`** while keeping service-role behaviour intact. Keep `SECURITY DEFINER` (needed so the DEFINER's `UPDATE` privilege applies); the `auth.uid()` predicate is what supplies the tenant fence.

---

## 5 · THE EXACT CHANGES

### 5.1 · DB — new migration `20260612000000_batch_touch_memory_fact.sql`

```sql
-- Batched, RLS-safe touch for the memory-reliance signal.
-- One UPDATE over an array of fact ids; self-scopes to auth.uid() so it is
-- safe to expose to the authenticated role (export/edge functions run on a
-- user JWT). Service role (auth.uid() IS NULL) retains touch-any ability for
-- the facts it legitimately loaded for the user it is processing.

CREATE OR REPLACE FUNCTION touch_memory_facts(p_fact_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_touched integer;
BEGIN
  IF p_fact_ids IS NULL OR array_length(p_fact_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.user_memory
  SET reference_count   = reference_count + 1,
      last_referenced_at = now()
  WHERE id = ANY(p_fact_ids)
    AND is_current = true
    AND (user_id = auth.uid() OR auth.uid() IS NULL);

  GET DIAGNOSTICS v_touched = ROW_COUNT;
  RETURN v_touched;
END;
$$;

-- Also retro-fit the single-id function with the same tenant fence, so the
-- pre-existing definition is no longer an open cross-tenant write if ever granted.
CREATE OR REPLACE FUNCTION touch_memory_fact(p_fact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_memory
  SET reference_count    = reference_count + 1,
      last_referenced_at = now()
  WHERE id = p_fact_id
    AND is_current = true
    AND (user_id = auth.uid() OR auth.uid() IS NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION touch_memory_facts(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION touch_memory_facts(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION touch_memory_fact(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION touch_memory_fact(uuid)  TO service_role;
```

**Apply via the Management API** (per `mm-ctrl/CLAUDE.md`: local migration history is out of sync, do NOT `supabase db push`; POST the SQL to `https://api.supabase.com/v1/projects/bkyuxvschuwngtcdhsyg/database/query`). Idempotent: `CREATE OR REPLACE` + `GRANT` re-run harmlessly. **Avoid `DO $$` inline-SQL blocks** (the `$$` interpolates in PowerShell) — these are top-level `CREATE OR REPLACE FUNCTION` statements, which carry their own `$$` body; send them as a single query string, not wrapped in a `DO` block.

### 5.2 · `supabase/functions/_shared/user-context.ts` (Reader A)

**Change 1 — select the IDs** (currently dropped). At line 90, change:
```ts
// BEFORE
.select("fact_key, fact_value, fact_category")
// AFTER
.select("id, fact_key, fact_value, fact_category")
```
At line 156 (watchlist), change:
```ts
// BEFORE
.select("fact_value")
// AFTER
.select("id, fact_value")
```

**Change 2 — collect injected IDs.** Add a `touchedFactIds: string[]` accumulator inside `getUserContext`; in the loop at lines 98-107 push `f.id` for every fact actually mapped into `ctx`; in the watchlist map (l.162-164) push each `w.id`.

**Change 3 — return the IDs without changing the existing contract.** Two viable shapes; pick (a):
- **(a) preferred:** add an optional out-param. Change the signature to
  `getUserContext(supabase, userId, opts?: { collectTouchIds?: string[] })` and, when `opts.collectTouchIds` is provided, push the IDs into it. Callers that want to touch pass an array and fire after. Read-only callers (`briefing-diagnose`) pass nothing → zero behaviour change, no touch. This keeps the `UserContext` return type untouched (used widely) and makes "do not touch in diagnose" the *default*.
- (b) alternative: return `{ ...ctx, _touchedFactIds }` — rejected: pollutes the widely-typed `UserContext` and risks the diagnostic touching by accident.

**Why the out-param over touching inside `getUserContext`:** the function is shared by a read-only diagnostic. Touching inside it would force `briefing-diagnose` to touch too. Keeping the touch in the *caller* (opt-in via the collector) is the clean fence.

### 5.3 · Caller edits (fire-and-forget the batched touch)

For each TOUCH=YES caller, after the reader returns, fire the batched RPC on the **same client that did the read** (so service-role stays service-role, user-JWT stays user-JWT and is correctly fenced by `auth.uid()`).

**Reader A callers:**
- `generate-briefing/index.ts` (after l.1713): pass a collector to `getUserContext`, then
  ```ts
  const touchIds: string[] = [];
  const userCtx = await getUserContext(supabase, user.id, { collectTouchIds: touchIds });
  if (touchIds.length) void supabase.rpc("touch_memory_facts", { p_fact_ids: [...new Set(touchIds)] })
    .then(({ error }) => { if (error) console.warn("touch failed:", error.message); });
  ```
- `decision-engine/index.ts` (l.60): same collector; fire the touch **inside `runPipeline`'s `waitUntil` scope** (or immediately after l.60 — both are off the response path since the handler returns `202` at l.110). The `admin` client is service-role → fence passes via `auth.uid() IS NULL`.
- `briefing-diagnose/index.ts` (l.67): **NO CHANGE.** Call `getUserContext(supabase, user.id)` with no collector. Add a one-line comment: `// read-only diagnostic: do NOT touch reference_count`.

**Reader B callers** — `buildMemoryContext` already returns `factCount` but not the IDs. Add an optional `touchedFactIds: string[]` to `MemoryContextResult` (it already returns a struct, so this is additive and breaks nothing), populated from the hot+warm facts that survived filtering (the `filtered.facts` set, which already carries `id`). Then in each caller:
```ts
const memoryResult = await buildMemoryContext(supabase, user.id, { ... });
const ids = memoryResult.touchedFactIds ?? [];
if (ids.length) void supabase.rpc("touch_memory_facts", { p_fact_ids: ids })
  .then(({ error }) => { if (error) console.warn("touch failed:", error.message); });
```
Apply to: `edge-generate:219`, `generate-skill-export:129`, `generate-custom-export:65`, `generate-team-instructions:42`, `memory-export:33`, `synthesize-edge-profile:83`, `kit-compose:284`.

> **Populate `touchedFactIds` inside `buildMemoryContext`** (not in each caller) so the "which facts were actually rendered after token-budget trimming" logic lives in one place. Source it from the final `filtered.facts` (post token-trim, l.561-576) so we only touch facts that genuinely made it into the artefact — touching trimmed-out warm facts would be a (mild) lie. Each fact in `filtered.facts` already has `.id` (selected at l.513/525).

> **`kit-compose`** wraps its work in `EdgeRuntime.waitUntil`; fire the touch inside that scope — already off the response path.

---

## 6 · Deploy & verify

1. Apply `20260612000000_batch_touch_memory_fact.sql` via Management API (§5.1).
2. Deploy the touched edge functions (per `mm-ctrl/CLAUDE.md`: `supabase functions deploy <name>`):
   `generate-briefing`, `decision-engine`, `edge-generate`, `generate-skill-export`, `generate-custom-export`, `generate-team-instructions`, `memory-export`, `synthesize-edge-profile`, `kit-compose`.
   (`briefing-diagnose` unchanged but redeploy if `user-context.ts` signature changed — it imports the shared file; verify it still compiles with the new optional param.)
3. **Proof the wire is live** (the roadmap's Phase 0 proof bar — "`reference_count` moves"):
   ```sql
   -- before: snapshot
   SELECT id, reference_count, last_referenced_at FROM user_memory
   WHERE user_id = '<test-user>' AND is_current = true ORDER BY last_referenced_at DESC LIMIT 10;
   -- trigger a briefing / decision / export for that user, then re-run.
   -- PASS = reference_count incremented and last_referenced_at advanced on the injected rows.
   ```
4. **Cross-tenant check** (the RLS fence): from a user-JWT context for user A, call
   `rpc('touch_memory_facts', { p_fact_ids: ['<a-fact-id-belonging-to-user-B>'] })` →
   must return `0` (zero rows touched) and leave B's row untouched. Service-role call with B's id → touches (returns `1`), which is correct (service role is trusted, only ever handed its own user's ids).

---

## 7 · Risks & guardrails carried forward

- **Honesty rail (Corpus Law 1/7):** this write is the *precondition* for the temperature UI to be honest, but on its own it does nothing visible until **Item 2** schedules `memory-lifecycle` → `memory-synthesize`. Ship Item 1 + Item 2 together (or keep the thermometers killed) so the UI never implies movement the engine hasn't earned. Item 1 makes the signal real; Item 2 makes it move.
- **Do not loop the single-id RPC** — the batched array RPC is the whole point. (Single-id retained only for back-compat + retro-fenced.)
- **Do not touch in `briefing-diagnose`** — it is read-only; touching there double-counts reliance and corrupts the lifecycle input.
- **Touch only post-trim facts** in `buildMemoryContext` — touching token-budget-trimmed facts overstates reliance.
- **Never await the touch on the response path** — it is a side-effect; a slow/failed touch must not delay or fail a user-facing generation.
- **`getUserContext` currently drops `id`** — the select-list edit (§5.2 Change 1) is mandatory; without it there are no IDs to touch and the whole Reader-A wire is inert.
```
