# CTRL North Star

## The outcome

CTRL exists to help a time-poor senior leader build, orchestrate, productize, and get to market the AI-native version of their business, acting as their AI-native chief of staff. See `docs/CTRL-SYSTEM-SPEC.md` and `docs/MAIN-APP-POLISH-SPEC.md`.

## The moat metric (founder-signed 2026-07-04): the flywheel

The one number that proves the product works is the **flywheel**: context in, judgment out, recurring.

> **Flywheel leaders (this week)** = leaders who BOTH (a) hold a real brain (at least 5 current facts in `user_memory`) AND (b) weighed at least one decision in the last 7 days.

Either half alone is not the product working. A rich brain that never drives a decision is a filing cabinet. A decision with no brain behind it is a generic answer. Both together, week over week, is the flywheel turning: the more the leader tells CTRL, the sharper the weigh, so they come back and tell it more.

Two component counts are tracked alongside it so a dip is diagnosable:
- **brain_rich_users**: leaders with a real brain (a context problem if this falls).
- **active_deciders**: leaders who weighed a decision in the last 7 days (an engagement problem if this falls).
- **weekly_active_users**: the denominator the flywheel converts (any decision or memory write in 7 days).

## How it is instrumented

Migration `supabase/migrations/20260704120000_north_star_flywheel.sql`:
- `north_star_flywheel` (view): the current live snapshot, on demand.
- `north_star_daily` (table): a daily snapshot for the trend line (RLS on, service-role only).
- `snapshot_north_star()` (function): upserts today's row, idempotent.
- `north-star-daily-snapshot` (pg_cron, 06:00 UTC daily): populates the trend from day one.

Read it now:

```sql
select * from north_star_flywheel;                 -- current
select * from north_star_daily order by day desc;  -- trend
```

The threshold "at least 5 current facts" lives in `ns_brain_min_facts()`; change it there and both the view and the daily snapshot follow.
