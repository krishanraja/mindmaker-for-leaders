# Kit Engine deploy runbook

Everything here is additive and inert until the frontend routes ship. Order
matters: migrations, then functions, then the cron, then seeds, then smoke.

Token: `SUPABASE_ACCESS_TOKEN` is the `sbp_*` PAT (never commit it). The
Management API needs a non-default User-Agent (Cloudflare drops bare curl).

## 1. Migrations (Management API; local history is out of sync, no db push)

Apply in order via POST https://api.supabase.com/v1/projects/bkyuxvschuwngtcdhsyg/database/query
with header `Authorization: Bearer $SUPABASE_ACCESS_TOKEN` and body `{"query": "<file contents>"}`:

1. supabase/migrations/20260610000000_kit_engine.sql
2. supabase/migrations/20260610000001_kit_artifacts_bucket.sql
3. supabase/migrations/20260610000002_kit_memory_sources.sql  (enum ADD VALUE: run standalone)
4. supabase/migrations/20260610000003_kit_nudge_cron.sql      (after functions deploy)

## 2. Edge functions

```
supabase functions deploy kit-redeem
supabase functions deploy kit-compose
supabase functions deploy kit-capsule-ingest
supabase functions deploy send-kit-pack
supabase functions deploy send-kit-nudges
supabase functions deploy track-event
supabase functions deploy generate-skill-export
supabase functions deploy free-skill-export
```
(The last three pick up the shared-module changes: event list, quality-gate
advisory check.)

## 3. Seed codes (Management API, same endpoint)

```sql
INSERT INTO kit_codes (code, class_slug, label, skill_quota, pass_days, max_redemptions)
VALUES
  ('VIBE-TEST',    'vibe-coding',         'internal test code', 3, 30, 50),
  ('AUTONOMY-TEST','autonomous-business', 'internal test code', 3, 30, 50)
ON CONFLICT (code) DO NOTHING;
-- Dead-code fixture for the e2e expiry contract:
INSERT INTO kit_codes (code, class_slug, label, expires_at)
VALUES ('VIBE-DEAD', 'vibe-coding', 'expired fixture', now() - interval '1 day')
ON CONFLICT (code) DO NOTHING;
```

Real class codes (e.g. VIBE-JUN26) get their own INSERT before each lesson,
with `max_redemptions` sized to the registration list and `expires_at` about
two weeks after the session.

## 4. Smoke (before any live class: the 15-minute ritual)

1. Phone on cellular, scan the real QR for the live code.
2. Redeem, finish intake with voice on Q2.
3. Watch the compose progress; copy the context-pull prompt.
4. Download the skill ZIP; install it in Claude.ai; run test prompt 1.
5. Send the pack to your own email; confirm it arrives.
6. Check a journey day, reload, confirm it stays checked.
7. `send-kit-nudges` dry run:
   curl -X POST https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/send-kit-nudges \
     -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "Content-Type: application/json" \
     -d '{"dry_run": true}'

## 5. RLS verification (Management API or SQL editor)

```sql
-- As two different anon users A and B (set request.jwt.claims), each select
-- on kit_redemptions / kit_builds / kit_artifacts / kit_journey_events must
-- return only own rows; kit_codes must return zero rows for both:
SET LOCAL ROLE authenticated;
SELECT count(*) FROM kit_codes;            -- expect 0 rows visible
```
