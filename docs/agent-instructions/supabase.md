# Supabase, data, and AI

Status: Current
Last verified: 2026-08-11

Read [`../current/architecture.md`](../current/architecture.md) and the [`REPLICATION_GUIDE`](../../project-documentation/REPLICATION_GUIDE.md) before changing this boundary.

## Data

- Migrations are append-only and additive by default.
- Production has historical migration-ledger drift. Never run a blanket production `supabase db push`.
- Preflight the exact schema and ledger, apply only the reviewed migration, read the objects and policies back, then record only the applied version.
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
