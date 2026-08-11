begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

select has_table('public', 'blind_spot_evidence_links', 'evidence links table exists');
select has_table('public', 'blind_spot_experiments', 'experiments table exists');
select has_table('public', 'blind_spot_rejections', 'rejections table exists');
select has_function('public', 'confirm_blind_spot_candidate_v2', array['uuid', 'text', 'text', 'text', 'jsonb', 'jsonb', 'jsonb', 'text'], 'atomic confirmation RPC exists');
select has_function('public', 'record_blind_spot_experiment_outcome', array['uuid', 'uuid', 'text', 'text'], 'experiment outcome RPC exists');

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000001', 'blind-spot-a@example.test'),
  ('10000000-0000-4000-8000-000000000002', 'blind-spot-b@example.test');

insert into public.user_memory (
  id, user_id, fact_key, fact_category, fact_label, fact_value,
  verification_status, source_type, is_current, verified_at, created_at, updated_at
) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'objective_test', 'objective', 'Your objective', 'Build a team that can ship without me.', 'verified', 'form', true, now() - interval '40 days', now() - interval '40 days', now() - interval '40 days'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'blocker_test', 'blocker', 'Your blocker', 'Decisions keep returning to me.', 'verified', 'form', true, now() - interval '10 days', now() - interval '10 days', now() - interval '10 days');

insert into public.user_decisions (id, user_id, decision_text, status, source, created_at, updated_at)
values ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Keep product strategy with me for now.', 'active', 'manual', now() - interval '25 days', now() - interval '25 days');

create temporary table first_confirmation as
create temporary table second_confirmation as
select * from public.confirm_blind_spot_candidate_v2(
  '10000000-0000-4000-8000-000000000001',
  'Strategy is outrunning ownership.',
  'Decisions remain central while ownership is meant to move outward.',
  repeat('a', 64),
  '{"signalCount":3,"sourceTypeCount":2,"windowDays":40}'::jsonb,
  '[
    {"sourceId":"20000000-0000-4000-8000-000000000001","sourceKind":"memory","label":"Your objective","excerpt":"Build a team that can ship without me.","observedAt":"2026-07-02T12:00:00Z","role":"intention"},
    {"sourceId":"20000000-0000-4000-8000-000000000002","sourceKind":"memory","label":"Your blocker","excerpt":"Decisions keep returning to me.","observedAt":"2026-08-01T12:00:00Z","role":"recurrence"},
    {"sourceId":"30000000-0000-4000-8000-000000000001","sourceKind":"decision","label":"Your decision","excerpt":"Keep product strategy with me for now.","observedAt":"2026-07-17T12:00:00Z","role":"recurrence"}
  ]'::jsonb,
  '{"title":"Hand over one call","instruction":"Name the owner and the boundary.","checkInPrompt":"Did it stay owned?","durationMinutes":15}'::jsonb,
  'blind-spot-test-confirmation-1'
);

select is((select count(*) from public.user_patterns where user_id = '10000000-0000-4000-8000-000000000001' and anchor_fingerprint = repeat('a', 64)), 1::bigint, 'confirmation writes one pattern');
select is((select count(*) from public.blind_spot_evidence_links where pattern_id = (select pattern_id from first_confirmation)), 3::bigint, 'confirmation writes all evidence links');
select is((select count(*) from public.blind_spot_experiments where pattern_id = (select pattern_id from first_confirmation) and status = 'active'), 1::bigint, 'confirmation writes one active experiment');
select ok((select due_at >= created_at + interval '24 hours' and expires_at = created_at + interval '14 days' from public.blind_spot_experiments where pattern_id = (select pattern_id from first_confirmation)), 'experiment timing is bounded');

select * from public.confirm_blind_spot_candidate_v2(
  '10000000-0000-4000-8000-000000000001',
  'Strategy is outrunning ownership.',
  'Decisions remain central while ownership is meant to move outward.',
  repeat('a', 64),
  '{"signalCount":3,"sourceTypeCount":2,"windowDays":40}'::jsonb,
  '[
    {"sourceId":"20000000-0000-4000-8000-000000000001","sourceKind":"memory","label":"Your objective","excerpt":"Build a team that can ship without me.","observedAt":"2026-07-02T12:00:00Z","role":"intention"},
    {"sourceId":"20000000-0000-4000-8000-000000000002","sourceKind":"memory","label":"Your blocker","excerpt":"Decisions keep returning to me.","observedAt":"2026-08-01T12:00:00Z","role":"recurrence"},
    {"sourceId":"30000000-0000-4000-8000-000000000001","sourceKind":"decision","label":"Your decision","excerpt":"Keep product strategy with me for now.","observedAt":"2026-07-17T12:00:00Z","role":"recurrence"}
  ]'::jsonb,
  '{"title":"Hand over one call","instruction":"Name the owner and the boundary.","checkInPrompt":"Did it stay owned?","durationMinutes":15}'::jsonb,
  'blind-spot-test-confirmation-1'
);

select is((select count(*) from public.user_patterns where user_id = '10000000-0000-4000-8000-000000000001' and anchor_fingerprint = repeat('a', 64)), 1::bigint, 'retry remains idempotent');
select is((select count(*) from public.blind_spot_experiments where pattern_id = (select pattern_id from first_confirmation)), 1::bigint, 'retry does not duplicate the experiment');

select throws_ok(
  $$select * from public.confirm_blind_spot_candidate_v2(
    '10000000-0000-4000-8000-000000000002', 'Borrowed evidence is not allowed.', 'No.', repeat('b', 64),
    '{}'::jsonb,
    '[
      {"sourceId":"20000000-0000-4000-8000-000000000001","sourceKind":"memory","label":"A","excerpt":"A","observedAt":"2026-07-02T12:00:00Z","role":"intention"},
      {"sourceId":"20000000-0000-4000-8000-000000000002","sourceKind":"memory","label":"B","excerpt":"B","observedAt":"2026-08-01T12:00:00Z","role":"recurrence"},
      {"sourceId":"30000000-0000-4000-8000-000000000001","sourceKind":"decision","label":"C","excerpt":"C","observedAt":"2026-07-17T12:00:00Z","role":"recurrence"}
    ]'::jsonb,
    '{"title":"Test","instruction":"Test","checkInPrompt":"Test?","durationMinutes":15}'::jsonb,
    'blind-spot-test-confirmation-2'
  )$$,
  'Evidence source is not owned by the confirming user',
  'confirmation rejects another owner''s evidence'
);

select ok((select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'blind_spot_evidence_links'), 'evidence links enforce RLS');
select ok((select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'blind_spot_experiments'), 'experiments enforce RLS');

select * from finish();
rollback;
