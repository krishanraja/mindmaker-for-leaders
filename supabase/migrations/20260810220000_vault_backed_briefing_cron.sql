-- Make CTRL's two daily delivery jobs independent of the retired
-- app.supabase_service_role_key Postgres setting.
--
-- A random shared secret is generated inside Vault and sent only in the
-- X-CTRL-Cron-Secret header. The matching Edge Function secret is provisioned
-- from the same Vault value during deployment; no credential is stored here.

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

select cron.schedule(
  'live-headlines-prewarm',
  '30 10 * * *',
  $CRON$
  select net.http_post(
    url := 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/live-headlines?force=1',
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

select cron.schedule(
  'daily-briefing-email',
  '0 12 * * *',
  $CRON$
  select net.http_post(
    url := 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/send-daily-briefing',
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
