# CTRL release state

Status: Current
Owner: Mindmaker
Last verified: 2026-08-20 against production readback through the Supabase management API

## Production baseline

| Item | Verified state |
|---|---|
| Canonical host | `https://makeyourmindup.ai` |
| Source branch | `main` |
| Application baseline | `b5770194b4646302f47e36655e389f7ec2eb43f8` |
| Vercel deployment | `dpl_8pxe81bUS2A6dYsjkb9jyrNAdkJ8`, READY at the same source revision |
| Test suite | 891 tests in 55 files |
| Edge Function directories | 114 excluding `_shared`, of 177 deployed on the shared project |
| Hook files | 51 |
| SQL migration files | 163 in the source tree |

Current source inventory is 114 Edge Function directories excluding `_shared`, 51 hook files, and 163 SQL migration files.

## Applied migration state, and why the ledger is not the answer

Do not use `supabase_migrations.schema_migrations` to decide what is applied. Read back on 2026-08-20 it holds 85 rows, 79 of which have no corresponding file in this repository, while 157 repository files do not appear in it at all. The project predates this repository's migration history and has been changed through more than one path, so the ledger records neither side faithfully.

Object readback is the reliable check. Query for the specific function, table, policy, or cron job a migration creates, and treat its presence as the evidence.

Verified this way on 2026-08-20:

| Object | Owning migration | Present in production |
|---|---|---|
| `confirm_blind_spot_candidate_v2` | `20260811144054_blind_spot_trusted_advisor.sql` | Yes |
| `cleanup_expired_memories` | `20260125000001_memory_encryption.sql` | Yes |
| `burn_blind_spot_pattern` | `20260820130000_blind_spot_burn.sql` | **No** |
| `retention-cleanup` cron job | `20260820120000_retention_cleanup_cron.sql` | **No** |

The last two are the open production gate for this change. Everything else this repository depends on was confirmed present by object readback rather than inferred from the ledger.

`20260820090000_revoke_anon_definer_reads.sql` was applied on 2026-08-20 and verified by live grant readback and an unauthenticated REST call returning 401.

## Scheduled work actually running

Eleven cron jobs are active on the production database. This is the real schedule contract; a `cron.schedule` call in a migration file is only a claim until it appears here.

| Job | Schedule (UTC) |
|---|---|
| `brain-adapt-nightly` | `30 3 * * *` |
| `briefing-aggregate-feedback-nightly` | `7 3 * * *` |
| `capture-week` | `0 20 * * 0` |
| `daily-briefing-email` | `0 12 * * *` |
| `decision-watch-hourly` | `17 * * * *` |
| `detect-trends-weekly` | `0 11 * * 1` |
| `google-sheets-sync-processor` | `*/5 * * * *` |
| `live-headlines-prewarm` | `30 10 * * *` |
| `memory-sweep-nightly` | `0 3 * * *` |
| `north-star-daily-snapshot` | `0 6 * * *` |
| `reactivation-nudge` | `0 13 * * *` |

`retention-cleanup` is absent and will appear here once its migration is applied.

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

## Onboarding company-recognition production release

The onboarding company-recognition release was merged through PR #369 and is live from `main` at `b5770194b4646302f47e36655e389f7ec2eb43f8`. It includes a 72px animated segmented loading instrument; work-email or LinkedIn resolution; a server-sanitised company dossier with fresh linked signals; one-click confirmation or correction; confirmed company and role handoff into Memory; and company-first no-login result and daily briefings. It uses the existing PDL, Brandfetch, Tavily, and Brave providers and introduces no second curation store.

Release verification: 876 Vitest tests pass across 55 files; the four public-onboarding Playwright journeys pass on `makeyourmindup.ai` at 390x844, 320x568, desktop, and reduced motion; typecheck introduces zero diagnostics against the 221-diagnostic baseline; targeted lint, standards, documentation checks, the 2,791-module production build, and 3/3 prerender routes pass. The production browser suite includes correction recovery, LinkedIn URL normalisation, linked evidence, briefing consent, handoff navigation, 44px targets, and horizontal-overflow checks.

Production readback confirms remote migration `20260812020209_onboarding_company_dossier_handoff`; all ten additive columns at their expected PostgreSQL types; and ACTIVE Edge Function versions `enrich-profile` 33, `generate-result` 36, `track-fork` 34, `send-result-email` 35, `send-daily-briefing` 24, and `resolve-handoff` 11. The public functions retain their bounded input and rate-limit contracts; `resolve-handoff` retains JWT verification. Required PDL, Brandfetch, Tavily, and Brave secret names are configured. The previous production deployment `dpl_Cmyhi9xwWi5ydGgsjmRzjYKFhxvU` remains the frontend rollback candidate; the additive database fields remain backward compatible.

## Verification evidence

The baseline passed the repository CI jobs for standards, documentation, tests, typecheck, build, and changed-file lint. GitHub Actions run 31555421382 and the Vercel check are green for the reviewed head; the production deployment is READY at the squash-merge revision above.

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
