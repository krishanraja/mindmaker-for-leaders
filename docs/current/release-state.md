# CTRL release state

Status: Current
Owner: Mindmaker
Last verified: 2026-09-05 against production function, database, and deployment readback

## Production baseline

| Item | Verified state |
|---|---|
| Canonical host | `https://makeyourmindup.ai` |
| Frontend source | `main`; containment recovery copy is branch-only |
| Frontend production baseline | `19d80f36ecda990bce4c3e1e6d18c97387d9ed33` |
| Vercel production | `dpl_24XfsypkNsxciZJ2Q1Arx3n8XNci`, READY at `19d80f36`; does not contain the recovery-copy repair |
| Frontend baseline test suite | 891 tests in 55 files |
| Edge Function source inventory | 115 directories excluding `_shared` |
| Shared-project Edge Functions | 183 live |
| Hook files | 51 |
| SQL migration files | 167 in the source tree |

Current source inventory is 115 Edge Function directories excluding `_shared`, 51 hook files, and 167 SQL migration files. The 183-function shared-project total is deployment inventory, not repository ownership.

## Emergency trust containment, 2026-09-05

- A 44-route containment manifest is live. Thirty-five routes now return side-effect-free containment responses: 10 retired, 15 unavailable, one retryable unavailable, five forbidden, one neutral handoff, one accepted no-op, and two read-only empty responses. Nine routes were repaired in place: seven exact-service credential paths, `synthesize-briefing` with exact-service or authenticated-owner access, and `infer-briefing-interests` bound to the signed-in user.
- Management readback found 44/44 ACTIVE with expected `verify_jwt` settings and matching runtime source. No-authorisation probes passed 44/44, and invalid service-claim probes were rejected 8/8. A positive real scheduled-service execution remains pending its next observed run.
- Migration `supabase/migrations/20260905063000_emergency_trust_containment.sql` is recorded in production as `emergency_trust_containment_20260905` at version `20260905060515`. Fresh independent post-readback returned PASS with zero violations, all 23 policy fingerprints unchanged, service-role preservation fingerprint `57dd0937d6b2439f800c5deccb8868fa`, and no `kit-nudges-email` cron job.
- Containment intentionally pauses public onboarding enrichment, server result generation, result email, and new no-login briefing subscription. The browser still produces its deterministic local result and can continue to ordinary signup; `track-fork` returns no handoff token. Honest morning-brief failure copy is committed on `codex/trust-containment-2026-09-05`, but production will not show that repair until the owner merges it and Vercel deploys it.

Exact route names, versions, hashes, JWT flags, and database evidence live in [`supabase/containment/manifest.json`](../../supabase/containment/manifest.json), [`release-lock.production.json`](../../supabase/containment/release-lock.production.json), and [`db/evidence/`](../../supabase/containment/db/evidence/).

## Applied migration state, and why the ledger is not the answer

Do not use `supabase_migrations.schema_migrations` to decide what is applied. Read back on 2026-08-20 it holds 85 rows, 79 of which have no corresponding file in this repository, while 157 repository files do not appear in it at all. The project predates this repository's migration history and has been changed through more than one path, so the ledger records neither side faithfully.

Object readback is the reliable check. Query for the specific function, table, policy, or cron job a migration creates, and treat its presence as the evidence.

Verified this way on 2026-08-20:

| Object | Owning migration | Present in production |
|---|---|---|
| `confirm_blind_spot_candidate_v2` | `20260811144054_blind_spot_trusted_advisor.sql` | Yes |
| `cleanup_expired_memories` | `20260125000001_memory_encryption.sql` | Yes |
| `user_memory.retention_expires_at` | `20260820140000_repair_memory_retention_column.sql` | Yes, applied 2026-08-20 |
| `set_memory_retention_trigger` | `20260820140000_repair_memory_retention_column.sql` | Yes, applied 2026-08-20 |
| `burn_blind_spot_pattern` | `20260820130000_blind_spot_burn.sql` | Yes, applied 2026-08-20 |
| `retention-cleanup` cron job | `20260820120000_retention_cleanup_cron.sql` | Yes, applied 2026-08-20 |

### The partial migration this readback uncovered

Preparing to schedule the retention sweep exposed a defect the ledger could never have shown. `20260125000001_memory_encryption.sql` had been applied to production only in part: the encryption columns landed, but `user_memory.retention_expires_at` and its BEFORE INSERT trigger did not, while all three functions that reference the column did.

The retention control was therefore not merely dormant, as previously recorded here. It was broken:

- `cleanup_expired_memories()` raised `42703 column does not exist` on any call.
- `update_user_memory_retention()` is a live trigger on `user_memory_settings`, so a leader changing their retention window in Settings raised the same error and the setting failed to save.
- `set_memory_retention_expiration()` existed but was attached to nothing, so no row was ever stamped.

`20260820140000_repair_memory_retention_column.sql` adds the column, its partial index, and the missing trigger. It was safe to apply because all 109 `user_memory_settings` rows hold `retention_days IS NULL`, so no row gained an expiry and nothing became eligible for deletion. Verified after applying: 196 memory rows, 0 with an expiry.

### Grants closed on 2026-08-20

`20260820090000_revoke_anon_definer_reads.sql` was applied and verified by live grant readback and an unauthenticated REST call returning 401.

`20260820150000_revoke_anon_memory_maintenance.sql` closes two more of the same class that the first sweep missed because it searched for read-shaped names:

- `get_memory_sweep_batch` is SECURITY DEFINER, bypasses RLS, and returned every account's `user_id` with its activity timestamps to any anonymous caller. A cross-tenant disclosure.
- `cleanup_expired_memories` is SECURITY DEFINER and deletes across all accounts. Any caller could force a global retention sweep.

Both are now `service_role` only, confirmed by `has_function_privilege` readback for `anon`, `authenticated`, and `service_role`. Both are invoked only by edge functions holding the service role, so application behaviour is unchanged.

## Edge Function release, 2026-08-21

Twenty-four functions were redeployed: the seven changed directly, plus seventeen that bundle the changed `_shared` modules. Every one was confirmed ACTIVE at an incremented version by management-API readback, not by trusting a deploy response. Deployed total moved 177 to 178 with the new `backfill-pseudonymise`.

The Supabase CLI cannot reach `api.supabase.com` from the delivery environment; its Go HTTP client fails with `TransportError` behind the agent proxy while curl and Node traverse it. `scripts/deploy-edge-function.mjs` does what the CLI does, walking the relative import graph from each entrypoint and posting the bundle as multipart, and reads `verify_jwt` from `supabase/config.toml` rather than guessing it.

Live contract checks after deployment: `cleanup-expired-data`, `blind-spot`, and `backfill-pseudonymise` each return 401 to an unauthenticated POST, and `/faq`, `/trust`, `/pricing`, and `/` return 200 with the new content present.

## Training material

The active global `training_material` row is version 3. Version 1 predated this work and carried the narrow `third_party_identity` pattern with no pseudonymisation block, and `loadGlobalTraining` prefers the stored row over the in-code fallback, so the widened reject was inert until re-ingested. Version 2 shipped the widened rule; version 3 added the department qualifiers described below.

## The backfill, and what its dry run caught

`backfill-pseudonymise` scanned all 196 memory rows and changed none. Production memory holds no third-party names requiring rewriting.

That result only became trustworthy after the dry run rejected the first attempt. Against the original transform it wanted to change exactly two rows, and both were wrong:

- `4 - VP Eng, Head of Design, Head of Growth, Ops Lead` would have become `4 - VP, ...`, reading the department `Eng` as a surname.
- `No Head of Product, Krish doing PM and CEO simultaneously` would have become `No Head of Product doing PM and CEO simultaneously`, deleting the account holder's own name and inverting the sentence.

Two fixes followed. The role-then-name rule no longer spans a comma, because a real role-name pair is adjacent while a comma usually marks apposition or a list. Department and function qualifiers were added to the allowlist. Both cases are pinned by regression tests in `src/__tests__/training.test.ts`, which now holds 33 cases.

The same transform runs on the live extraction path, so these were live defects, not just backfill defects.

## Scheduled rows last read back on 2026-08-20

Schedule presence is not execution proof. Twelve cron rows were active at this readback; the 2026-09-05 containment verified anonymous rejection, but a positive real machine-credential run remains pending. A `cron.schedule` call in a migration file is only a claim until it appears here. The retired `kit-nudges-email` job was absent before and after containment, at count zero.

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
| `retention-cleanup` | `15 3 * * *` |

`retention-cleanup` was added on 2026-08-20 at `15 3 * * *` and is active, bringing the total to twelve.

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

## Current product state

- CTRL and Make Your Mind Up form one product on the canonical host.
- The public intake remains usable for a deterministic local result and ordinary signup. Company enrichment, server-generated result, result email, new no-login briefing subscription, and portfolio handoff are temporarily unavailable under containment.
- Today retains premium category visuals and the one-pool ranking model.
- The briefing control, responsive player, talk-back, and Settings access are integrated.
- Server voice transcription is temporarily unavailable; typing and browser-supported speech remain the recovery paths.
- Segoe UI Variable Display/Text is the selected human-facing typography system.
- Decide, Blind Spot, Memory, context export, delivery, and Edge Pro billing paths are present.
- Lesson-kit routes redirect to the public demo.
- Vault-backed prewarm and delivery jobs are represented by the release migrations and runbook.

## Historical onboarding company-recognition release, superseded

The onboarding company-recognition release was merged through PR #369 at `b5770194b4646302f47e36655e389f7ec2eb43f8`. At that release it included a 72px animated segmented loading instrument; work-email or LinkedIn resolution; a server-sanitised company dossier with fresh linked signals; one-click confirmation or correction; confirmed company and role handoff into Memory; and company-first no-login result and daily briefings. It used the existing PDL, Brandfetch, Tavily, and Brave providers and introduced no second curation store.

Release verification: 876 Vitest tests pass across 55 files; the four public-onboarding Playwright journeys pass on `makeyourmindup.ai` at 390x844, 320x568, desktop, and reduced motion; typecheck introduces zero diagnostics against the 221-diagnostic baseline; targeted lint, standards, documentation checks, the 2,791-module production build, and 3/3 prerender routes pass. The production browser suite includes correction recovery, LinkedIn URL normalisation, linked evidence, briefing consent, handoff navigation, 44px targets, and horizontal-overflow checks.

That 2026-08-12 onboarding release is superseded operationally by the 2026-09-05 containment state above. Its additive database fields remain backward compatible, but the old function versions and public onboarding behavior are not current production contracts.

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
