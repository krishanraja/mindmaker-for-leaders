# CTRL project documentation

Status: Current index
Owner: Mindmaker
Last verified: 2026-08-11

The canonical current set lives in [`docs/current/`](../docs/current/README.md). This directory contains commercial context, operating references, compliance records, decisions, and history.

## Current authority path

1. [`docs/current/product.md`](../docs/current/product.md)
2. [`docs/current/commercial.md`](../docs/current/commercial.md)
3. [`docs/current/architecture.md`](../docs/current/architecture.md)
4. [`docs/current/features.md`](../docs/current/features.md)
5. [`docs/current/release-state.md`](../docs/current/release-state.md)
6. [`REPLICATION_GUIDE.md`](./REPLICATION_GUIDE.md)
7. [`DECISIONS_LOG.md`](./DECISIONS_LOG.md)

Measured in the current source tree on 2026-08-11: 113 Edge Function directories excluding `_shared`, 78 hook files, and 160 SQL migrations. `npm run docs:check` prevents these quoted counts from drifting silently.

## Commercial and brand context

| Document | Use |
|---|---|
| [`docs/current/commercial.md`](../docs/current/commercial.md) | Single human-readable buyer, offer, proof, messaging, objection, and claim authority |
| [`docs/agent-instructions/marketing-sales.md`](../docs/agent-instructions/marketing-sales.md) | Safe operating procedure and evaluation set for commercial agents |
| [`BRANDING.md`](./BRANDING.md) | Brand, voice, typography, and domain rules |
| [`public/.well-known/product.json`](../public/.well-known/product.json) | Machine-readable product, tier, and price truth |

## Operating references

| Document | Boundary |
|---|---|
| [`REPLICATION_GUIDE.md`](./REPLICATION_GUIDE.md) | Setup, deployment, verification, and rollback |
| [`docs/CURATION-SYSTEM-SPEC.md`](../docs/CURATION-SYSTEM-SPEC.md) | Detailed shared-pool and ranking implementation |
| [`docs/CTRL-SYSTEM-SPEC.md`](../docs/CTRL-SYSTEM-SPEC.md) | Historical product-system design record |
| [`docs/MAIN-APP-POLISH-SPEC.md`](../docs/MAIN-APP-POLISH-SPEC.md) | Historical interface design plan |
| [`COMMON_ISSUES.md`](./COMMON_ISSUES.md) | Historical incidents and troubleshooting clues |
| [`compliance/`](./compliance/README.md) | Policies, records, controls, and open legal work |

## Historical records

The following preserve chronology or prior implementation detail. They are not current product or architecture guidance:

- [`APP-DELIVERY-STATE.md`](./APP-DELIVERY-STATE.md)
- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`FEATURES.md`](./FEATURES.md)
- [`MASTER_INSTRUCTIONS.md`](./MASTER_INSTRUCTIONS.md)
- [`CTRL-CORPUS.md`](./CTRL-CORPUS.md)
- [`CTRL-BUILD-ROADMAP.md`](./CTRL-BUILD-ROADMAP.md)
- [`AGENT_BRIEFING.md`](./AGENT_BRIEFING.md)
- [`ICP.md`](./ICP.md)
- [`VALUE_PROP.md`](./VALUE_PROP.md)
- [`OUTCOMES.md`](./OUTCOMES.md)
- [`SALES_BRIEF.md`](./SALES_BRIEF.md)
- [`PURPOSE.md`](./PURPOSE.md)
- [`Master_Messaging_and_FAQ.md`](./Master_Messaging_and_FAQ.md)
- [`SPINE.md`](./SPINE.md)
- [`HISTORY.md`](./HISTORY.md)
- [`docs/KIT-REDESIGN-SPEC.md`](../docs/KIT-REDESIGN-SPEC.md)

Git history is the final source for removed prose and superseded overlays.

## Maintenance

Follow [`docs/current/documentation-standards.md`](../docs/current/documentation-standards.md). A release is incomplete when the current docs describe an intention instead of the deployed state.
