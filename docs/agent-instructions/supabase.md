# Supabase, data, and AI

Status: Current
Last verified: 2026-09-05 against live containment readback

Read [`../current/architecture.md`](../current/architecture.md) and the [`REPLICATION_GUIDE`](../../project-documentation/REPLICATION_GUIDE.md) before changing this boundary.

## The project is shared

Project `bkyuxvschuwngtcdhsyg` hosts CTRL alongside other Mindmaker surfaces. Production readback on 2026-09-05 found 183 live Edge Functions. The repository source tree contains 115 Edge Function directories excluding `_shared`, 51 hook files, and 167 SQL migrations. These counts describe different inventories and cannot be used to infer function ownership. Before you change anything server-side:

- Directory presence establishes only that this repository contains a source artifact. Establish ownership and the exact live name before changing, deploying, or rolling back a function; a dashboard function may belong to another product.
- Treat every repository function as production-significant. Cron, an external webhook, or an email link may invoke a function with no in-repository caller. Neither directory presence nor the absence of an import proves current deployment state.
- Scope migrations to objects CTRL owns. Other products have tables and cron jobs in the same database.

The current production containment lock covers a reviewed 44-route subset: 35 side-effect-free containment responses and nine in-place authorization repairs. Do not generalize that receipt to the other shared-project functions. The exact manifest is [`../../supabase/containment/manifest.json`](../../supabase/containment/manifest.json), and the production readback is [`../../supabase/containment/release-lock.production.json`](../../supabase/containment/release-lock.production.json).

## Data

- Migrations are append-only and additive by default.
- Production has historical migration-ledger drift, so `schema_migrations` cannot tell you what is applied. Confirm by reading the object a migration creates. Never run a blanket production `supabase db push`.
- Preflight the exact schema and ledger, apply only the reviewed migration, read the objects and policies back, then record only the applied version.
- The exact emergency containment migration is a recorded exception with complete preflight and post-readback evidence. Production ledger name `emergency_trust_containment_20260905`, version `20260905060515`, was independently verified at `PASS` with zero violations. See the [database containment record](../../supabase/containment/db/README.md).
- Every retryable public or scheduled write must converge on a stable key.
- Explicit facts, tentative inferences, and behavioral feedback remain separate data types.
- Use existing owner-scoped tables and the shared brain accessor. Do not create per-surface profile stores.

## Authentication

- `supabase/config.toml` is the function JWT contract.
- Preserve each function's current `verify_jwt` value unless the auth design itself is under review.
- A handler with JWT verification disabled must enforce its public validation, service-role, webhook-signature, or Vault-cron contract.
- User-scoped service-role reads and writes must independently prove ownership.

## Secrets

- Browser code receives publishable values only.
- Service-role, provider, payment, email, encryption, and cron values remain runtime secrets.
- Never copy credentials from chat, docs, logs, browser storage, or fixtures into commands or source.
- The Control Center bridge uses a publishable read-only RLS key but remains server-injected to preserve the boundary.
- Cron functions receive `X-CTRL-Cron-Secret` backed by Supabase Vault. Do not restore a database service-role setting.

## AI and providers

- Provider order is capability-specific. Inspect the called function and shared helper before documenting or changing it.
- Route external calls through the existing timeout and structured-logging helpers.
- Validate model output schemas and keep deterministic fallbacks honest.
- Do not turn a model fallback into a product-confidence claim.
- Log provider and usage metadata without private prompts, secrets, or unbounded outputs.

## Deployment proof

Bundle and deploy only changed functions, verify the target project, exercise anonymous rejection and authorised success, and read back the durable result. A successful CLI exit is not enough.
