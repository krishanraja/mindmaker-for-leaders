# CTRL evolution discovery ledger

This directory prevents the product-discovery session from degrading when the conversation is compacted.

## Source-of-truth contract

- Canonical state: private, append-only Supabase schema `ctrl_discovery` in project `bkyuxvschuwngtcdhsyg`.
- Audit and recovery surface: this deterministic, redacted Git snapshot.
- Repository source pinned for the audit: `8174677125bc2799929e3196282e75cba215b443`.
- Working branch: `codex/discovery-ledger-2026-09-04`; `main` is unchanged.
- The public snapshot is not writable input and never overrides Supabase.

Private rationale, user excerpts, restricted risks, random identifiers, operational timestamps, and private hashes are excluded. Credential values are rejected before insertion and never enter either artifact.

## Progress

| Milestone | State |
|---|---|
| Complete repository literature audit | Complete |
| Reconcile live Mindmake positioning | Complete |
| Audit and extend the theoretical foundation | Complete |
| Create and verify durable Supabase ledger | Complete |
| Generate and verify redacted Git snapshot | Complete |
| Audit live trust and erasure lifecycle | In progress |
| Complete founder product interview | In progress |
| Produce decision-complete product plan | Pending |
| Implement product evolution | Pending |

## Locked product decisions

- `D-001` Decision-owning leaders are the primary v1 user.
- `D-002` CTRL is initially the engine for Mindmake's 30-day proof, not a third public offer.
- `D-003` Interview depth is earned adaptively.
- `D-004` Material discovery state must be durably classified and stored.
- `D-005` Supabase is canonical; Git is a deterministic redacted snapshot.
- `D-006` The seven-day proof is a materially sharper real decision.
- `D-007` Use working-model or judgement-map language until validation earns “diagnostic.”
- `D-008` Promise five useful minutes, then optional depth.
- `D-009` Help the leader reach and own the call; do not vend an answer.
- `D-010` CTRL reveals its view after the user's provisional view.
- `D-011` Begin with three human doors: guide me, something specific, or a quick exercise.
- `D-012` Mobile is tap-first, with voice immediately available and typing optional.

## Snapshot contract

`ledger.snapshot.jsonl` is sorted by `record_key` using bytewise ordering and then by version. Every object is recursively key-sorted and encoded as UTF-8 with LF endings. It contains no generation/export timestamp or other volatile field.

- Rows: 114
- SHA-256: `91af99954b0943640424e6ef35b69423ca78b4a5c2bebef58398223ec686d78e`
- Sidecar: `ledger.snapshot.sha256`

Every completed interview batch is appended to Supabase as an idempotent data migration, read back, then regenerated here. Existing history is never rewritten.
