# CTRL current documentation

Status: Current
Owner: Mindmaker
Last verified: 2026-08-10 against `abd82b21639e9f0948477204f08c671930c2d8c7`

This directory is the shortest reliable path from product intent to safe operation. It describes CTRL as it exists now. Git history and the dated project records explain how it arrived here.

## Read by job

| Job | Start here | Then read |
|---|---|---|
| Understand the product | [Product](./product.md) | [Features](./features.md) |
| Change the interface | [Product](./product.md) | [Architecture](./architecture.md), [frontend instructions](../agent-instructions/frontend.md) |
| Resume material interface work | [Design delivery state](./design-state.md) | [Product](./product.md), [Architecture](./architecture.md) |
| Change data or AI behavior | [Architecture](./architecture.md) | [Supabase instructions](../agent-instructions/supabase.md), [release guide](../../project-documentation/REPLICATION_GUIDE.md) |
| Operate or release CTRL | [Release state](./release-state.md) | [Release guide](../../project-documentation/REPLICATION_GUIDE.md) |
| Maintain documentation | [Documentation standards](./documentation-standards.md) | `npm run docs:check` |
| Work as a coding agent | [`CLAUDE.md`](../../CLAUDE.md) | [Agent instructions](../agent-instructions/README.md) |

## Authority order

When two sources disagree, use this order:

1. Executable code, database readback, deployment readback, and `src/router.tsx`.
2. `public/.well-known/product.json` for machine-readable product and pricing truth.
3. This `docs/current/` set.
4. [`project-documentation/DECISIONS_LOG.md`](../../project-documentation/DECISIONS_LOG.md) for accepted decisions.
5. Subsystem references, compliance records, and runbooks.
6. Dated delivery notes, prototypes, roadmaps, and Git history.

Code wins when prose drifts. Correct the prose in the same change.

## Current documents

- [Product](./product.md): user, promise, value loop, experience laws, and non-goals.
- [Architecture](./architecture.md): system boundaries, data flows, trust boundaries, providers, and deployment shape.
- [Features](./features.md): live, supporting, nested, and retired capabilities.
- [Release state](./release-state.md): exact production baseline, verification evidence, and known debt.
- [Documentation standards](./documentation-standards.md): ownership, freshness, history, and automated drift rules.
- [Design delivery state](./design-state.md): the current material surface, approval gate, artifact revision, and exactly one next action.

## Reference, not competing truth

- [`docs/CURATION-SYSTEM-SPEC.md`](../CURATION-SYSTEM-SPEC.md) is the detailed curation implementation reference.
- [`project-documentation/REPLICATION_GUIDE.md`](../../project-documentation/REPLICATION_GUIDE.md) is the release and recovery runbook.
- [`project-documentation/compliance/`](../../project-documentation/compliance/README.md) contains legal and control records. Their status labels are authoritative for compliance claims.
- [`project-documentation/HISTORY.md`](../../project-documentation/HISTORY.md) and [`APP-DELIVERY-STATE.md`](../../project-documentation/APP-DELIVERY-STATE.md) are historical records, not current instructions.

## Freshness rule

Update a current document when its product contract, route, data boundary, provider path, release baseline, or operating command changes. `npm run docs:check` blocks broken links, stale repository counts, duplicate decision IDs, oversized root agent instructions, and known contradictory claims.
