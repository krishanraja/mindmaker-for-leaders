# Database containment candidate

Status: local design artifact only. Not applied, committed, deployed, or copied
into the shared repository.

This package contains a forward-only containment migration and two independent
read-only evidence scripts. It changes ACLs and idempotently removes one exact
legacy pg_cron schedule. It does not change application rows, policies, owners,
triggers, function bodies, or production from this workspace.

## Required execution contract

1. Verify the exact Supabase project reference, database name, and environment
   out of band. Do not infer the target from a locally linked CLI directory.
2. Run `00_preflight_readback.sql` in a dedicated session and save its complete
   output immutably with the release evidence.
3. Confirm that all 23 required application relations, `cron.job`, all six
   required privileged function signatures, and `cron.unschedule(bigint)`
   exist. `claim_user_history(uuid,uuid,text)` is the only target allowed to be
   absent. Confirm the preflight reports zero matching `kit-nudges-email` jobs;
   this is prevention-only containment against migration replay.
4. Review the raw `relacl`, `attacl`, and `proacl` rows, including grantor and
   grant-option state. Record the preflight policy fingerprints and the single
   `service_role_preservation_fingerprint`.
5. Apply `01_forward_containment.sql` once through the approved migration path.
   Its transaction aborts on a missing required object, unexpected function
   owner or security mode, residual client privilege, or failed service-role
   preservation assertion.
6. Run `02_post_readback.sql` in a fresh database session.
7. Require all three catalog gates:
   `containment_status = PASS`, every policy fingerprint exactly matches its
   preflight value, and the service-role preservation fingerprint exactly
   matches its preflight value.
8. Exercise every dependent Edge Function and user journey separately. Catalog
   containment is not runtime health.

Short safeguards are embedded in every SQL file: a 15-second statement timeout,
a 2-second lock timeout, a 30-second idle-in-transaction timeout, and an explicit
`pg_catalog, public` search path. `row_security = off` makes the cron absence
query fail instead of silently returning a role-filtered partial view when the
runner cannot bypass the `cron.job` RLS policy.

## Exact intended effect

Direct `PUBLIC`, `anon`, and `authenticated` table and column privileges are
removed from these 21 live-verified tables while preserving every effective
`service_role` table and column privilege, including grant options:

- `conversation_sessions`
- `chat_messages`
- `ai_insights_generated`
- `assessment_events`
- `booking_requests`
- `conversion_analytics`
- `engagement_analytics`
- `index_participant_data`
- `lead_qualification_scores`
- `lead_qualifications`
- `prompt_library_profiles`
- `roi_actuals`
- `velocity_events`
- `voice_instrumentation`
- `voice_sessions`
- `user_business_context`
- `audience_contacts`
- `feedback`
- `delivery_subscriptions`
- `portfolio_handoff`
- `tts_quality_snapshots`

Additional exact boundaries:

- Remove every table and column privilege on `ai_response_cache` from `PUBLIC`,
  `anon`, `authenticated`, and `service_role`.
- Remove table-level and column-level `INSERT` on `cannes_responses` from
  `PUBLIC` and `anon` only. Preserve service-role insertion. Other roles and
  operations are deliberately out of this narrow boundary.
- Remove direct `PUBLIC`, `anon`, and `authenticated` execution of these six
  live-verified `SECURITY DEFINER` functions owned by `postgres`:
  `apply_outcome_to_brain(uuid)`, `run_brain_adapt(integer)`,
  `sync_decision_lineage()`, `get_or_create_memory_settings(uuid)`,
  `trigger_anonymous_booking_sync()`, and
  `trigger_anonymous_lead_sync()`.
- Remove `service_role` execution from the five functions other than
  `get_or_create_memory_settings(uuid)`. Their owner can still execute them;
  registered trigger functions do not need a Data API execution grant.
- Make `get_or_create_memory_settings(uuid)` the sole transitional
  server-callable exception: `service_role` receives `EXECUTE` without grant
  option, while `PUBLIC`, `anon`, and `authenticated` receive none.
- If `claim_user_history(uuid,uuid,text)` exists, remove execution from
  `PUBLIC`, `anon`, `authenticated`, and `service_role`. Do not create or drop
  it. Its owner retains the ability to inspect it.
- Idempotently unschedule every pg_cron job named `kit-nudges-email`. Neither
  preflight nor post-readback selects its schedule, command, headers,
  configuration values, or any other potentially secret-bearing field.
- Preserve every application row, RLS policy, relation owner, function owner,
  trigger, and function body. The named pg_cron scheduling row is the sole
  intentional non-ACL metadata change.

The migration captures service-role access before revoking `PUBLIC`. If a
service privilege was inherited through `PUBLIC`, the migration materializes
the same effective privilege directly on `service_role`. This preserves runtime
capability but intentionally changes the grant topology. The saved raw preflight
ACLs remain the authority for reconstructing the prior topology.

## Consequential assumptions and expected breakage

- The target is the exact independently inspected live environment. The
  migration fails closed on missing required objects rather than silently
  applying a partial boundary.
- Edge Functions that still require the 21 quarantined tables authenticate as
  `service_role`. Any direct browser or Data API dependency on them stops.
- The permissive public write paths on `audience_contacts` and `feedback` stop.
  Direct client access to `booking_requests` and the other quarantined tables
  also stops even where an RLS policy would otherwise allow it.
- `delivery_subscriptions`, `portfolio_handoff`, and `tts_quality_snapshots` are
  defense-in-depth additions. RLS was enabled and no permissive client policy
  was verified, but broad client ACLs existed and are removed.
- Public onboarding currently inserts `cannes_responses` anonymously. That
  insert stops until a bounded server-side ingestion route exists. This is an
  explicit containment cost.
- Cache calls using `service_role` will receive permission errors. Callers must
  fail safely as cache misses. Verify this at runtime before declaring the wider
  release healthy.
- Revoking direct execution on a trigger function does not disable a registered
  trigger. It removes the direct RPC/PostgREST execution path.
- Existing RLS policies remain in place and are fingerprinted. They become
  reachable again if a later change restores a client ACL, so ACL regression
  prevention is required after this hotfix.
- The live `cron.job` readback was empty for `kit-nudges-email` on 2026-09-05.
  Unscheduling is therefore prevention against canonical migration replay, not
  evidence that a live mail job was firing.

## Latent migration ordering requirements

Repository migration `20251216202000_add_claim_history_rpc.sql` can create
`claim_user_history(uuid,uuid,text)` and explicitly grant it to client roles.
The containment migration is durable only if its canonical migration timestamp
sorts after that definition and after every other historical create or grant.

CI must build a fresh database from the complete canonical migration chain and
then run the post-readback gate. A later migration that recreates or regrants the
claim RPC must fail CI. A one-time production revoke cannot prevent a future
owner-authored grant by itself.

Repository migration `20260610000003_kit_nudge_cron.sql` can recreate the
retired `kit-nudges-email` job. The containment migration must also sort after
that migration and after every other schedule of the same job name. Fresh-chain
CI must require zero matching jobs after replay. A one-time live absence check
does not neutralize a schedule that an older or later migration can recreate.

## Security-preserving rollback

There is deliberately no generic rollback script. `GRANT ALL`, restoring
`PUBLIC`, or guessing a role's former access would reopen the boundary.

If functionality must be restored:

1. Use the saved preflight raw `relacl`, `attacl`, and `proacl` output to identify
   the exact object, grantee, grantor, privilege, and grant-option state.
2. Deploy and verify the replacement authorization path first.
3. Write a new forward migration that restores only individually proven grants
   required by that replacement. Restore no privilege solely because it was
   effective through role inheritance.
4. Never restore client execution on a `SECURITY DEFINER` function without a
   separately reviewed caller-binding contract.
5. Restore cache access only after cache partitioning, expiry, content safety,
   and fail-closed authorization are verified.
6. Restore Cannes insertion only behind a bounded server-side route with
   server-derived abuse controls and a narrow input contract.
7. Run an updated independent readback and complete runtime regression suite in
   a fresh session.

Do not generically reschedule `kit-nudges-email` during rollback. This package
intentionally does not capture its command because historical cron commands can
contain credentials. Re-enabling it requires a new reviewed forward migration
that reconstructs a secret-safe command from an approved source and verifies
the destination function's authorization contract.

No application-data rollback is required. The cron schedule is intentionally
not automatically recoverable from this evidence package.

## CI gate

The canonical repository should treat the target lists and signatures in the
post-readback `violations` CTE as an allowlisted containment manifest. CI should:

1. Reject a migration ordered after containment if it grants a quarantined
   table or column privilege to `PUBLIC`, `anon`, or `authenticated`.
2. Reject client execution grants on any of the six protected functions or the
   latent claim RPC.
3. Replay every migration into a fresh database and require the independent
   post-readback verdict to be `PASS`.
4. Reject any post-containment migration that schedules a job named
   `kit-nudges-email`, and require its explicit absence check to pass after a
   complete fresh-chain replay.
5. Compare pre/post policy and service-preservation fingerprints in any staged
   application of this migration.
6. Run application tests that prove cache denial is a safe miss and that
   replaced public ingestion routes are bounded and operational.

## Evidence boundary

Names and signatures come from independently captured live catalog evidence.
Repository revision `9d23e92c189ee304c983e36123c10022bea8c556`
supplied historical definitions, the latent claim RPC evidence, and migration
`20260610000003_kit_nudge_cron.sql`. The live cron readback returned no matching
`kit-nudges-email` row on 2026-09-05. No production SQL was executed while
producing or reviewing this package.
