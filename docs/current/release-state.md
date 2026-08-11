# CTRL release state

Status: Current
Owner: Mindmaker
Last verified: 2026-08-10

## Production baseline

| Item | Verified state |
|---|---|
| Canonical host | `https://makeyourmindup.ai` |
| Source branch | `main` |
| Application baseline | `abd82b21639e9f0948477204f08c671930c2d8c7` |
| Vercel deployment | READY at the same source revision |
| Test suite at baseline | 859 tests in 52 files |
| Edge Function directories | 113 excluding `_shared` |
| Hook files | 78 |
| SQL migration files | 158 |

Repository inventory at this baseline is 113 Edge Function directories excluding `_shared`, 78 hook files, and 158 SQL migration files.

This file records the deployed application baseline that the current documentation was checked against. Documentation-only commits may advance Git without changing the application behavior described here.

## Shipped product state

- CTRL and Make Your Mind Up form one product on the canonical host.
- The public intake hands consented context into First Lens.
- Today retains premium category visuals and the one-pool ranking model.
- The briefing control, responsive player, talk-back, and Settings access are integrated.
- Segoe UI Variable Display/Text is the selected human-facing typography system.
- Decide, Blind Spot, Memory, context export, delivery, and Edge Pro billing paths are present.
- Lesson-kit routes redirect to the public demo.
- Vault-backed prewarm and delivery jobs are represented by the release migrations and runbook.

## Verification evidence

The baseline passed the repository CI jobs for standards, tests, typecheck, build, and changed-file lint where applicable. The exact-sha CI run reported 859 Vitest tests across 52 files.

Release acceptance requirements are maintained in the [replication and release guide](../../project-documentation/REPLICATION_GUIDE.md). Local fixtures and prototypes are evidence for layout behavior only; they do not prove authenticated persistence or production parity.

## Known technical debt

- The typecheck gate is baseline-based. It blocks new diagnostics but does not imply a debt-free TypeScript tree.
- Full-repository lint has historical debt; CI applies a strict changed-file gate.
- The application still reports a large main chunk and a mixed static/dynamic Supabase import warning during build.
- The legacy migration ledger differs from canonical production state, which is why production migrations require exact preflight and readback.
- Several historical product and delivery documents remain in the repository for provenance. They are outside the current authority path.

These are disclosed constraints, not release blockers for this baseline. A change that worsens one becomes a blocker.

## Release status vocabulary

- Built: local artifact exists and focused checks pass.
- Committed: a Git commit exists.
- Merged: the commit is on `main`.
- Deployed: the target platform reports a deployment for that revision.
- Live: the canonical host serves that revision.
- Verified: the real user and operating paths pass readback at that revision.

Never collapse these into “done.”

## Update trigger

Update this file after a production release, rollback, baseline test-count change, route contract change, or verified operating-state change. Do not paste a future action plan into the current release record.
