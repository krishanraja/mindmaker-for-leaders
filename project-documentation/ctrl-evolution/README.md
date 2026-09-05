# CTRL evolution discovery ledger

This is the canonical, resumable state for the CTRL product evolution. It prevents the work from degrading when a conversation is compacted or handed to another agent.

## Source-of-truth contract

- Canonical discovery state: private, append-only Supabase schema `ctrl_discovery`.
- Audit and recovery surface: this deterministic, redacted Git snapshot.
- Repository evidence baseline: `8174677125bc2799929e3196282e75cba215b443`.
- Working branch: `codex/discovery-ledger-2026-09-04`; `main` is unchanged.
- The Git snapshot is read-only evidence and never overrides Supabase.
- Private rationale, user excerpts, restricted risks, personal data, operational identifiers and private hashes are excluded.
- Credential-shaped values are rejected before insertion and never enter either artifact.

## Canonical delivery state

**STATE_ROUTE:** `project-documentation/ctrl-evolution/README.md`

**CURRENT_PHASE:** Founder alignment (Build Apps with Krish, Phase 2). Product implementation and material visual work are paused.

**SOURCE_LAYERS:**

- Durable doctrine: Krish's principles; Mindmake context; locked CTRL decisions; qualified judgement, memory and agentic-AI research; trust and lifecycle invariants.
- Project requirements: all 98 `/docs` artifacts; live Mindmake positioning; current application/deployment truth; adaptive interview design; the user-supplied 2026 Gold Standards.
- History: legacy briefs, build chronicles, superseded designs and dormant surfaces. History cannot override live truth.
- External evidence: primary provenance, memory, personalization, decision-quality, reliance and human-feedback research.
- Obsolete or quarantined: static assessment as default, value-after-data-extraction, answer vending, static persona as a sufficient brain, ownerless persistence, global personalized cache, silent self-rewrite and unearned diagnostic claims.

**PRODUCT_TRUTH (provisional pending G1):** CTRL helps a decision-owning leader see something materially sharper about one real consequential decision within five useful minutes, own the call, and let a portable, inspectable working model of their judgement grow as useful residue. It begins as the client engine inside Mindmake's thirty-day proof, not a third public offer.

**NON_GOALS:**

- No sentience or human pretence.
- No generic chatbot, productivity dashboard or exhaustive upfront interview.
- No answer vending, compulsory ranking or confidence theatre.
- No universal whole-person dossier by default.
- No silent memory mutation or autonomous durable self-improvement.
- No graph/vector complexity without a named retrieval need.
- No deep personal-memory collection before ownership, trust, lifecycle and erasure are sound.
- No material visual implementation before concept divergence, a rendered mock and explicit founder approval.

**SURFACE_DEPENDENCIES:**

1. Trust substrate — invisible subject identity, permission, provenance, scoped cache, correction and erasure.
2. Decide entry — guided help, something specific, or a quick exercise.
3. Five-minute contrast loop — provisional human view, smallest useful contrast, independent AI view, reconciliation and owned call.
4. Strategic receipt — immediate reflection, tension or preferred path, uncertainty and next move.
5. Brain — inspectable criteria, evidence, context, contradictions and corrections.
6. Return and outcome — revisit when a decision becomes live, an outcome lands or evidence conflicts.
7. Portable export — human-readable brain plus machine-readable provenance, versions and evaluation fixtures.

**VERTICAL_SLICE (provisional):** Live decision → minimum useful contrast → evidence-backed AI view → accept/resist/correct → user-owned call → transparent, authorised brain update → portable version.

**FIRST_SURFACE:** `Decide: first five-minute loop`. The Brain is the residue of useful work, not the first tax imposed on the user. Material visual work stays paused until founder direction is locked.

**AUTHORITY:** Read-only inspection and append-only/redacted documentation are authorised. Production containment, product implementation, material visual construction, deployment and public release are not yet authorised.

**NEXT_ACTION:** Krish replies with the production-containment gate and the three G1 product choices. Codex records exact selections and nuance before asking G2.

## Progress

| Milestone | State |
|---|---|
| Complete repository literature audit | Complete |
| Reconcile live Mindmake positioning | Complete |
| Audit and extend the theoretical foundation | Complete |
| Ingest and qualify 2026 Gold Standards | Complete |
| Create and verify durable Supabase ledger | Complete |
| Generate and verify redacted Git snapshot | Complete |
| Design adaptive founder interview | Complete |
| Design trust, erasure, cache and export architecture | Complete |
| Verify high-confidence trust findings against live bundles | Complete |
| Apply and verify production trust containment | Awaiting founder authorisation |
| Complete founder product interview | In progress |
| Produce decision-complete product corpus and architecture | Pending |
| Diverge, render and approve first material surface | Pending |
| Implement and independently verify vertical slice | Pending |

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

`ledger.snapshot.jsonl` is sorted by `record_key` using bytewise ordering and then by version. Every object is recursively key-sorted and encoded as UTF-8 with LF endings. It contains no export timestamp or other volatile field.

- Rows: 122
- SHA-256: `44dfe7e8d6aa14866d900715c4728030044f47405060289267d8da40e7f6f212`
- Sidecar: `ledger.snapshot.sha256`

Every answered interview batch is appended to Supabase as an idempotent version, read back with generated hashes, then regenerated here. Existing history is never rewritten.
