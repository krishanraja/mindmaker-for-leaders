# Phase 0 — Item 3: The Capture Leak (Implementation Spec)

> **Scope:** the LIVE "Add memory" / manual-create path bypasses the encryption (and hygiene) that the app advertises. Route manual creates through encryption + guardrails WITHOUT breaking verify/edit/delete or the optimistic UI. Spec only — no files in `C:/Users/krish/mm-ctrl` are modified by this document.
> **Grounded against:** `b656f09` on `main` (`C:/Users/krish/mm-ctrl`). Authoritative context: `_INTELLIGENCE-LAYER.md` §3.1, §3.6.7; `CTRL-BUILD-ROADMAP.md` Phase 0.
> **Status of claim in the brief:** CONFIRMED against real code, with two material corrections to the brief (see §2.4 and §2.5).

---

## 1. The leak, confirmed in code

### 1.1 The live path
- **UI:** `src/components/memory/AddMemorySheet.tsx` (the only "Add Memory" surface, opened from `src/pages/MemoryCenter.tsx:126`). It imports `useCreateMemory` (`AddMemorySheet.tsx:17,62`) and calls `createMemory.mutateAsync(...)` in two places:
  - `autoSaveVoiceMemory` — `AddMemorySheet.tsx:73` (`source_type: 'voice'`, `confidence_score: 1.0`)
  - `handleSubmit` (text) — `AddMemorySheet.tsx:211` (`source_type: mode === 'voice' ? 'voice' : 'manual'`, `confidence_score: 1.0`)
- **Hook:** `useCreateMemory` — `src/hooks/useMemoryQueries.ts:324-395`. Its `mutationFn` (lines 328-352) does a **direct table write**:
  ```ts
  supabase.from('user_memory').insert({
    user_id: user.id, fact_key, fact_category, fact_label, fact_value, fact_context,
    source_type: input.source_type || 'manual',
    confidence_score: input.confidence_score || 1.0,   // lands at 1.0
    is_high_stakes: input.is_high_stakes || false,
    verification_status: 'verified',                    // hard-coded 'verified'
    is_current: true,
  })
  ```
  No `encrypted_content`, no `encryption_version`, no guardrails, no dedup, no contradiction-detect. `confidence_score` defaults to `1.0` and `verification_status` is hard-coded `'verified'` (the optimistic row at line 372 mirrors this).

### 1.2 The bypassed encrypted path (memory-crud)
- `supabase/functions/memory-crud/index.ts` `case 'create'` (lines 195-266) is the *intended* writer. It:
  - checks `user_memory_settings.store_memory_enabled` (privacy gate, lines 214-225),
  - **encrypts** `{fact_value, fact_context}` via Web Crypto **AES-256-GCM** (`encrypt()`, lines 83-98; key from `MEMORY_ENCRYPTION_KEY`, lines 69-81),
  - inserts `encrypted_content` + `encryption_version: 1` + sets `verification_status: source_type === 'manual' ? 'verified' : 'inferred'` (lines 231-249).
- **It is dead/shadowed.** The HTTP wrapper functions in `useMemoryQueries.ts` that would call it — `fetchMemoryList` (70), `createMemory` (111), `updateMemory` (123), `deleteMemory` (136), `bulkDeleteMemory` (146), `exportMemory` (158), `importMemory` (187) — are **module-private and referenced nowhere** (grep across `src/`: zero call sites). Every exported hook does direct `supabase.from('user_memory')` instead. The doc comment at `useMemoryQueries.ts:5` ("Uses the memory-crud and memory-settings edge functions") is stale for everything except settings.

### 1.3 Net effect
Manual/voice facts land **unencrypted**, at **confidence 1.0 / verified**, with **no guardrails**, while `useComplianceStatus` (`src/hooks/useComplianceStatus.ts:76`) hard-codes `encryptionEnabled: true` ("// AES-256-GCM via memory-crud edge function") and `Compliance.tsx` renders it as a green control. This is the exact "faked green tick" the corpus forbids (Felix scar / Law 7).

---

## 2. Findings the brief under-states (read before choosing the fix)

### 2.1 The whole table is unencrypted, not just manual creates
`extract-user-context/index.ts` — the "most careful code in the app" — **also never writes `encrypted_content`.** Its insert (`factsToInsert`, lines 533-549) and its update (lines 576-580) write plaintext only; grep for `encrypted_content` across `supabase/functions/` returns only `memory-crud` and `sync-to-google-sheets`. So **today, in production, ZERO `user_memory` rows are encrypted** (memory-crud create is never invoked by the client; extract-user-context never encrypts). `encryptionEnabled: true` is false for 100% of rows, not just manual ones. **Implication:** fixing only `useCreateMemory` makes manual facts encrypted while AI-extracted facts stay plaintext — encryption coverage stays partial and the compliance claim stays partly false. The honest options are in §4.

### 2.2 `encrypted_content` is redundant-at-rest by design
Even in `memory-crud`, `fact_value` and `fact_context` are inserted **as plaintext** alongside the ciphertext ("// Keep plaintext for display/search", `memory-crud/index.ts:238`). The encryption is **defense-in-depth metadata, not at-rest protection** — the plaintext is right there in the same row. This is a real honesty problem for any SOC2/"encrypted" claim and must be acknowledged in the compliance copy regardless of which fix ships. (Out of scope to fix the plaintext-shadow here; in scope to stop *claiming* more than is true.)

### 2.3 RLS allows the direct write (no RLS error to fix)
`user_memory` RLS (migration `20260114000000_create_user_memory.sql:76-91`): `INSERT WITH CHECK (auth.uid() = user_id)`, `UPDATE USING (auth.uid() = user_id)`, plus a `FOR ALL USING(true)` service-role policy. The direct client insert succeeds because the client is authenticated and sets `user_id = user.id`. **There is no RLS bug blocking the leak** — RLS is exactly why the bypass "works." Routing through the edge function does not require any RLS change (the edge fn uses the service-role key, lines 188-191).

### 2.4 Data-shape mismatch: confidence default
- Brief says manual facts write "confidence 1.0." Confirmed. But note the schema default is `0.5` (`20260114000000...:45`) and the validated `CreateMemorySchema` default is `1.0` (`memory-crud/index.ts:28`). Both the live hook (line 342) and memory-crud agree on `1.0` for explicit user asserts, so **confidence is NOT a divergence to fix** — preserve `1.0` for manual (user-asserted) as intended.

### 2.5 Data-shape mismatch: verification_status for voice
- The live hook hard-codes `verification_status: 'verified'` for **all** creates including `source_type: 'voice'` (`useMemoryQueries.ts:344`; voice auto-save at `AddMemorySheet.tsx:73`).
- `memory-crud` would instead set voice → `'inferred'` (`memory-crud/index.ts:244`, `source_type === 'manual' ? 'verified' : 'inferred'`).
- This is a **real behavioral divergence**: routing voice through memory-crud silently demotes voice memories from `verified` to `inferred`, which would make them appear in the verification queue and change temperature/health math (`useMemoryWeb.ts:33,122` count `verified|corrected`). **Decision required (see §5):** the AddMemorySheet voice flow is "one-tap-to-save a thing the user said out loud" — that is a user-asserted fact and SHOULD stay `verified`. The cleanest reconciliation is to treat both AddMemorySheet paths as `manual`-intent for verification purposes (keep `verified`) and only let the AI extractor own `inferred`.

### 2.6 memory-crud HTTP routing is fragile (don't naively reuse the wrappers)
The dead wrappers invoke sub-paths via `supabase.functions.invoke('memory-crud/create', { body })` etc. (`useMemoryQueries.ts:112`). The edge fn routes on `url.pathname.split('/')` (`memory-crud/index.ts:144-146`), expecting `create`/`update/:id`/`delete/:id`. `functions.invoke` with a slashed name does pass the suffix through, so `'memory-crud/create'` resolves to `action='create'`. This works, but `fetchMemoryList` (lines 80-90) is visibly broken (double-invoke, GET-with-null-body) — evidence these wrappers were abandoned mid-refactor and never used. **Recommendation:** do NOT revive the GET/list/export wrappers; only the `create` path matters for this fix, and even that is better solved by encrypting client-side-adjacent (see §4, Option B) than by depending on this routing. `verify_jwt` for `memory-crud` is the Supabase default `true` (no `[functions.memory-crud]` block in `config.toml`), and the fn re-derives the user from the JWT (`index.ts:154-170`), so auth is sound either way.

---

## 3. Constraints the fix must not break

| Flow | Where | Must stay true |
|---|---|---|
| Optimistic create | `useCreateMemory` `onMutate` (`useMemoryQueries.ts:353-385`) | The optimistic row (lines 361-376) must still render instantly; `onError` rollback (386-390) and `onSettled` invalidate (391-393) must still fire. A network round-trip to an edge fn is acceptable (it already is for settings). |
| Edit | `useUpdateMemory` (`useMemoryQueries.ts:400-441`) + `MemoryDetailSheet.handleSave` (`MemoryDetailSheet.tsx:67-86`, sends `verification_status: inferred→corrected`) | Edits must persist and re-encrypt if `fact_value` changed; the `inferred→corrected` promotion must survive. |
| Delete (soft) | `useDeleteMemory` (`useMemoryQueries.ts:446-487`) sets `is_current=false` | Unchanged. |
| Verify | `useMemoryWeb.verifyFact` (`useMemoryWeb.ts:183-194`) + RPC `verify_memory_fact` (`20260114000000...:176-217`) | Unchanged; RPC already SECURITY DEFINER + ownership-checked. |
| Import | `useImportMemory` (`useMemoryQueries.ts:579-641`) | Currently also unencrypted direct insert — same leak class; fix in the same pass for consistency (it mirrors memory-crud's `import` case). |
| Voice auto-save | `AddMemorySheet.autoSaveVoiceMemory` (`AddMemorySheet.tsx:68-94`) | One-tap-to-save must stay one-tap; toast + `onSuccess` + close behavior unchanged. |

---

## 4. The fix — two options, recommendation below

The leak is "writes bypass encryption + guardrails." Two viable routes. **Recommended: Option A** (route through `memory-crud`) for least new code and a single encryption owner; Option B is the fallback if edge round-trip latency on optimistic create is unacceptable.

### Option A (RECOMMENDED) — Route `useCreateMemory` / `useUpdateMemory` / `useImportMemory` through `memory-crud`

**A1. Add guardrails to `memory-crud` `create` (and `import`) so the hygiene chain is honored.**
- In `memory-crud/index.ts` `case 'create'` (after Zod parse, before encrypt, ~line 226), call the shared guardrail:
  ```ts
  import { runGuardrails } from '../_shared/fact-guardrails.ts';
  // ...
  const { kept } = await runGuardrails(
    [{ fact_key, fact_category, fact_label, fact_value, fact_context: fact_context ?? '',
       confidence_score, is_high_stakes }],
    userId, null, supabase
  );
  if (kept.length === 0) {
    return json(422, { error: 'rejected_by_guardrails',
      message: 'This looks like a style rule, a negation, or transient state — not a durable fact.' });
  }
  const guarded = kept[0]; // carries fact_subtype; use guarded.* for the insert
  ```
  - `IncomingFact` shape (`_shared/guardrails-core.ts:16-24`) requires `fact_context: string` (non-null) — coerce `fact_context ?? ''`.
  - `runGuardrails` (`_shared/fact-guardrails.ts:34-60`) loads training, runs `runGuardrailsPure`, logs rejections to `fact_extraction_log`, returns `{ kept, rejected, training_version }`. Stamp `training_material_version: training_version` on the insert to match `extract-user-context` (column exists; written at `extract-user-context/index.ts:548`).
  - **Note:** manual facts are user-asserted at `confidence 1.0`. Guardrails reject style-rules/negations/transient/third-party-identity regardless of confidence — this is the desired hygiene (a user typing "always be concise" should be rejected as a style-rule-as-fact, exactly as the corpus wants). The `MIN_CONFIDENCE` 0.55 gate (`guardrails-core.ts:36`) won't fire for 1.0.

**A2. Encryption already lives in `create`/`update`/`import` cases — preserve it.** No change needed beyond A1; the cases already encrypt (lines 229, 396-398, 627).

**A3. Preserve verified-intent for manual + voice (the §2.5 reconciliation).**
- Change `memory-crud` create's status rule (line 244) from
  `verification_status: source_type === 'manual' ? 'verified' : 'inferred'`
  to treat **both `manual` and `voice`** (the two AddMemorySheet sources) as user-asserted:
  `verification_status: (source_type === 'manual' || source_type === 'voice') ? 'verified' : 'inferred'`.
  This keeps the live behavior identical (no silent demotion of voice memories; no surprise verification-queue entries; no health/temperature math regression in `useMemoryWeb`).

**A4. Rewire the three hooks to call the edge function (revive only the needed wrappers).**
- `useCreateMemory` `mutationFn` (`useMemoryQueries.ts:328-352`): replace the direct `.insert(...)` with
  ```ts
  const { data, error } = await supabase.functions.invoke('memory-crud/create', { body: input });
  if (error) throw new Error(error.message || 'Failed to create memory');
  return (data as { memory: UserMemoryFact }).memory;
  ```
  Keep `onMutate`/`onError`/`onSettled` (lines 353-393) **exactly as-is** — the optimistic row still renders; only the server write changes. (The existing private `createMemory` wrapper at line 111 already does this; either inline it or call it.)
- `useUpdateMemory` `mutationFn` (lines 404-417): swap to `supabase.functions.invoke('memory-crud/update/' + id, { body: input, method: 'PUT' })` so edits re-encrypt (`memory-crud/index.ts:393-399`). Optimistic update (419-427) unchanged. **Verify the edit→`corrected` promotion still flows:** `MemoryDetailSheet` sends `verification_status: 'corrected'` (`MemoryDetailSheet.tsx:78`); `UpdateMemorySchema` accepts `corrected` (`memory-crud/index.ts:36`) and stamps `verified_at` (lines 402-407). ✓
- `useImportMemory` `mutationFn` (lines 583-635): swap the per-row direct inserts for one `supabase.functions.invoke('memory-crud/import', { body: { memories } })` (the edge `import` case already encrypts + dedupes, lines 581-657). Return `{ imported, skipped }` from `data`.
- **Leave `useDeleteMemory` and `useMemoryWeb.{editFact,deleteFact,verifyFact}` and `useUpdateMemorySettings` AS-IS** — delete is a soft `is_current=false` (no content, nothing to encrypt); verify uses the SECURITY-DEFINER RPC; settings already use their edge fn. (Optional consistency follow-up: route `useMemoryWeb.editFact` (`useMemoryWeb.ts:165-172`) through `memory-crud/update` too, since it also edits `fact_value` without re-encrypting — same leak class, lower traffic. Flag, don't block.)

**A5. Privacy gate alignment.** `memory-crud` create returns 403 if `store_memory_enabled` is false (lines 220-225). The direct hook never honored this. After rewire, the UI must surface that 403 gracefully (the existing `handleSubmit` catch at `AddMemorySheet.tsx:228-233` already toasts `err.message`; ensure the thrown message is human-readable, e.g. map 403 → "Memory storage is off in your privacy settings").

### Option B (FALLBACK) — Encrypt + guardrail in a single new edge fn the hook already round-trips
If the team wants to avoid reviving `memory-crud`'s path-routing entirely, add a focused `memory-write` edge function (POST only) that does `runGuardrails` → encrypt → insert, and point `useCreateMemory` at it. This is more code than Option A and duplicates `memory-crud`'s encrypt helpers; only choose it if `memory-crud`'s slashed-path routing is deemed too fragile to depend on (see §2.6). Not recommended given Option A is a near-drop-in.

### Either option — fix the compliance honesty (REQUIRED, §1.3 + §2.1 + §2.2)
`encryptionEnabled` must not assert more than is true.
- **Minimum:** in `useComplianceStatus.ts:76`, stop hard-coding `true`. Two honest choices:
  1. If only manual/voice get encrypted post-fix (Option A as specced) and AI-extracted facts stay plaintext → `encryptionEnabled` should be reported as **partial/false**, or the compliance copy reworded to "application-layer AES-256-GCM on user-entered facts" with the plaintext-shadow caveat (§2.2). Do NOT render a green "encryption at rest" tick.
  2. **Better (closes §2.1):** also add encryption to `extract-user-context`'s insert/update (lines 533-549, 576-580) by reusing the same `encrypt()` helper (extract it into `_shared/` so both functions share one implementation), so the whole table is encrypted and the claim becomes true. This is the only path that makes `encryptionEnabled: true` honest. Scope it as the §2.1 follow-up if Phase 0 timebox is tight, but the compliance claim must be downgraded until it lands.

---

## 5. Decisions required before build

1. **Voice verification status (§2.5/§A3):** confirm AddMemorySheet voice → stays `verified` (recommended). If product wants voice → `inferred` (extractor-style), that's a UX change (adds verification-queue entries) and must be explicit.
2. **Encryption scope (§2.1/§4):** Phase 0 minimal (manual/voice only, downgrade the compliance claim) vs. full (also encrypt `extract-user-context`, keep the claim true). Recommendation: do the full version — it's a shared `encrypt()` extraction plus two write sites, and it's the only way `encryptionEnabled` stops being a faked tick.
3. **Plaintext shadow (§2.2):** acknowledge that `fact_value`/`fact_context` are stored in plaintext alongside ciphertext; decide whether the "encrypted" compliance language is acceptable as-is (it is application-layer obfuscation, not at-rest encryption). At minimum, reword the compliance copy.

---

## 6. Exact change-list (Option A, recommended)

| # | File | Change |
|---|---|---|
| 1 | `supabase/functions/memory-crud/index.ts` (~226) | Add `runGuardrails` call in `case 'create'`; 422 on empty `kept`; stamp `training_material_version`. Mirror in `case 'import'` (already dedupes; add guardrails for parity). |
| 2 | `supabase/functions/memory-crud/index.ts:244` | Status rule → `(source_type === 'manual' || source_type === 'voice') ? 'verified' : 'inferred'`. |
| 3 | `src/hooks/useMemoryQueries.ts` `useCreateMemory.mutationFn` (328-352) | Replace direct `.insert` with `supabase.functions.invoke('memory-crud/create', { body: input })`; keep `onMutate/onError/onSettled` unchanged. |
| 4 | `src/hooks/useMemoryQueries.ts` `useUpdateMemory.mutationFn` (404-417) | Route through `memory-crud/update/:id` (PUT) so edits re-encrypt; optimistic block unchanged. |
| 5 | `src/hooks/useMemoryQueries.ts` `useImportMemory.mutationFn` (583-635) | Route through `memory-crud/import`; remove per-row direct inserts. |
| 6 | `src/hooks/useComplianceStatus.ts:76` | Stop hard-coding `encryptionEnabled: true`; report honestly per §4 (or make it true via #8). |
| 7 | `src/components/memory/AddMemorySheet.tsx:228-233` | Ensure the 403 (privacy-off) / 422 (guardrail-reject) messages surface as readable toasts (catch already exists). |
| 8 | *(decision-gated, §2.1)* `supabase/functions/extract-user-context/index.ts` (533-549, 576-580) + new `_shared/memory-crypto.ts` | Extract `encrypt()` from `memory-crud` into `_shared/`; encrypt at the extractor's insert/update so the whole table is encrypted and `encryptionEnabled: true` is honest. |

**Deploy notes (per repo CLAUDE.md):** edge fns deploy via `supabase functions deploy memory-crud` (+ `extract-user-context` if #8); confirm `MEMORY_ENCRYPTION_KEY` is set in prod secrets (currently falls back to `'default-dev-key-change-in-prod-32ch'`, `memory-crud/index.ts:70` — if that fallback is live in prod, the "encryption" is keyed on a public constant: a third honesty hole to verify). No migration required (no schema/RLS change). `config.toml` needs no change (memory-crud already defaults `verify_jwt = true`).

**Regression checks before merge:** (a) add a manual fact → row has non-null `encrypted_content`, `verification_status='verified'`, `confidence_score=1.0`; (b) add a voice memory → still `verified`, encrypted; (c) type a style-rule ("always be concise") → guardrail 422, friendly toast, nothing inserted; (d) edit a fact's value in MemoryDetailSheet → `verification_status` becomes `corrected`, `encrypted_content` re-written; (e) optimistic row still appears instantly and rolls back on forced error; (f) delete still soft-deletes; (g) verify flow (RPC) unchanged; (h) `useMemoryWeb` health/temperature counts unchanged for the same inputs.
