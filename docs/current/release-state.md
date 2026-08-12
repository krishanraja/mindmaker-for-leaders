# CTRL release state

Status: Current
Owner: Mindmaker
Last verified: 2026-08-11

## Production baseline

| Item | Verified state |
|---|---|
| Canonical host | `https://makeyourmindup.ai` |
| Source branch | `main` |
| Application baseline | `0f20baf2437667c3719c94f1c16d04bb08b42023` |
| Vercel deployment | `dpl_7QrzFfEBYCLgFRn9icCERQSzp2XD`, READY at the same source revision |
| Test suite at baseline | 870 tests in 53 files |
| Edge Function directories | 113 excluding `_shared` |
| Hook files | 78 |
| SQL migration files | 160 in the source tree; 159 at the deployed application baseline |

Current source inventory is 113 Edge Function directories excluding `_shared`, 78 hook files, and 160 SQL migration files. The additional migration belongs to the onboarding company-recognition release candidate described below.

## Blind Spot production release

The Blind Spot trusted-advisor redesign was merged through PR #366 and released from `main` at `0f20baf2437667c3719c94f1c16d04bb08b42023` after explicit prototype, preview, implementation, and production approval on 2026-08-11.

Production readback:

- 870 Vitest tests pass across 53 files, including 16 focused Blind Spot logic and component tests.
- All 37 Blind Spot Playwright checks pass on `https://makeyourmindup.ai` across 1440x900, 1280x720, 390x844, and 320x568, including every fixture state and advisor failure recovery.
- Typecheck reports zero new diagnostics against the 221-diagnostic baseline.
- Standards, documentation checks, changed-file lint, the 2,789-module production build, and 3/3 prerender routes pass.
- The public fixture is `/preview?surface=blind-spot` with pattern, tension, loading, error, accepted, rejected, conversation, stale-evidence, and long-content states.
- Supabase migration `blind_spot_trusted_advisor` is recorded remotely as version `20260811165337`; the repository source is `supabase/migrations/20260811144054_blind_spot_trusted_advisor.sql`.
- The `blind-spot` Edge Function is ACTIVE at version 3 with JWT verification enabled. An unauthenticated production request returns HTTP 401.
- All three Blind Spot tables have RLS enabled and no anonymous table grants. Both mutation RPCs are executable only by `service_role`, not `anon` or `authenticated`.
- Vercel reports no runtime errors in the release window. The previous production deployment `dpl_36aick6kiVE3Z85QoAgzkugC7ChM` remains the rollback candidate.

The Supabase management connector permits metadata and read-only SQL but rejects transactional fixture inserts, and local pgTAP remains unavailable while Docker Desktop is stopped. The pgTAP contract is committed and its setup syntax was corrected before merge; production verification therefore uses migration, schema, RLS, ACL, JWT, function-version, HTTP, and rendered-flow readbacks without persistent synthetic rows.

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

## Onboarding company-recognition release candidate

The source tree includes the next additive onboarding release: a 72px animated segmented loading instrument; work-email or LinkedIn resolution; a server-sanitised company dossier with fresh linked signals; one-click confirmation or correction; confirmed company and role handoff into Memory; and company-first no-login result and daily briefings. It uses the existing PDL, Brandfetch, Tavily, and Brave providers and introduces no second curation store.

Release-candidate verification: 876 Vitest tests pass across 55 files; the four public-onboarding Playwright journeys pass at 390x844, 320x568, desktop, and reduced motion; typecheck introduces zero diagnostics against the 221-diagnostic baseline; targeted lint, standards, documentation checks, the 2,791-module production build, and 3/3 prerender routes pass. The browser suite includes correction recovery, linked evidence, briefing consent, handoff navigation, 44px targets, and horizontal-overflow checks.

This section describes the reviewed release candidate only. It becomes part of the production baseline after the exact merged Git revision, Vercel deployment, Supabase migration, and six changed Edge Functions have separate deployed readback.

## Verification evidence

The baseline passed the repository CI jobs for standards, documentation, tests, typecheck, build, and changed-file lint. GitHub Actions run 31515642377 and the Vercel check are green for the reviewed head; the production deployment is READY at the squash-merge revision above.

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
