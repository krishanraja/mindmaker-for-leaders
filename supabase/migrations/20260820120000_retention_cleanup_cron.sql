-- Schedule the retention sweep.
--
-- Settings already offered users a 30 or 90 day retention choice, and the
-- machinery behind it was complete: set_memory_retention_expiration stamps
-- an expiry on insert, update_user_memory_retention re-stamps every row when
-- the choice changes, and cleanup_expired_memories deletes what has expired.
-- Nothing ever invoked it, so "memories older than N days will be
-- automatically deleted" was a promise the product did not keep. This is the
-- missing schedule.
--
-- Reuses the Vault-held ctrl_cron_secret created by the briefing cron
-- migration, so no credential is stored here. cleanup-expired-data verifies
-- that secret before it touches a row.

do $$
begin
  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'ctrl_cron_secret'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'ctrl_cron_secret',
      'Authenticates CTRL pg_cron requests to Edge Functions'
    );
  end if;
end
$$;

-- Idempotent: re-running this migration re-points the job rather than
-- raising on a duplicate job name.
select cron.unschedule('retention-cleanup')
where exists (select 1 from cron.job where jobname = 'retention-cleanup');

select cron.schedule(
  'retention-cleanup',
  '15 3 * * *',
  $CRON$
  select net.http_post(
    url := 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/cleanup-expired-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-CTRL-Cron-Secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'ctrl_cron_secret'
        order by created_at desc
        limit 1
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $CRON$
);
