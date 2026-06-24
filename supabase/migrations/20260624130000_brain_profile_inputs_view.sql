-- PR8 - decommission silos at the READ layer with ONE unified view.
--
-- The product rule is "no silos": every brain input a leader feeds CTRL must
-- read out of one place. `brain-profile.loadBrainProfile` already merges them in
-- code, but the tuning + interest signals still came from two physically separate
-- tables via three separate reads. This view collapses those into a SINGLE
-- normalized read surface the accessor queries once.
--
-- Why a view and NOT a merge into `user_memory`: `user_memory` is "facts about
-- the leader", consumed by the brain graph, skill exports and Memory Center.
-- Folding feed-tuning / interests into it would surface them as if they were
-- biographical facts. The correct single repository for the read path is this
-- view, which can later be backed by anything without the accessor changing.
--
-- security_invoker = on: the view runs with the caller's privileges, so the
-- existing owner-scoped RLS on the underlying tables still applies verbatim
-- (an authed user sees only their own rows; the service role sees all and the
-- accessor scopes by user_id). Additive + reversible: drop the view to revert.

create or replace view public.brain_profile_inputs
with (security_invoker = on) as
  -- Tuning: boosted categories (was news_preferences.boosted_categories[]).
  select
    np.user_id,
    'boosted_category'::text as kind,
    c                        as value,
    null::uuid               as ref_id,
    null::text               as interest_kind,
    np.updated_at            as created_at
  from public.news_preferences np
  cross join unnest(coalesce(np.boosted_categories, '{}')) as c
  union all
  -- Tuning: scan bias (was news_preferences.bias).
  select
    np.user_id,
    'bias'::text,
    np.bias,
    null::uuid,
    null::text,
    np.updated_at
  from public.news_preferences np
  where np.bias is not null
  union all
  -- Interests / excludes (was briefing_interests, active only). ref_id preserves
  -- the real interest id so lens projection / dedupe keep working; interest_kind
  -- carries beat | entity | exclude.
  select
    bi.user_id,
    'interest'::text,
    bi.text,
    bi.id,
    bi.kind,
    bi.created_at
  from public.briefing_interests bi
  where bi.is_active = true;

grant select on public.brain_profile_inputs to anon, authenticated, service_role;
