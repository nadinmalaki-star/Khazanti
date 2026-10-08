-- Web Push Phase 1 — hourly scheduler for the send-debt-reminders Edge Function.
--
-- The job only calls the existing, tested Edge Function. All reminder rules
-- (stages, one push per user per local day, 09:00–21:00 in each device's IANA
-- timezone, claims/leases, 404/410 cleanup) stay inside that function and the
-- Phase 1 database functions.
--
-- Secret: the x-cron-secret header is read at run time from Vault by name
-- ('khznti_cron_secret'). The value is never stored in this file, in the job
-- command, or anywhere in the repository. It must equal the Edge Function's
-- CRON_SECRET; both were set together, out of band.
--
-- Permissions note: pg_net is installed with Supabase's defaults (objects owned
-- by supabase_admin; usage granted to API roles). The postgres role has no
-- grant option on them, so a REVOKE here would be a silent no-op and is not
-- included. Verified before scheduling: anon/authenticated cannot log in; the
-- REST API exposes only public and graphql_public (net is rejected); pg_graphql
-- is not installed; no exposed function, view or trigger references net.
-- Never add the net schema to the API's exposed schemas.
--
-- Disable: select cron.unschedule('khznti-send-debt-reminders');
-- Kill switch without touching cron: set the Edge Function secret PUSH_ENABLED=false.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'khznti-send-debt-reminders',
  '7 * * * *',
  $job$
  select net.http_post(
    url := 'https://nygfcqlvxogxytwwgbjt.supabase.co/functions/v1/send-debt-reminders',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'khznti_cron_secret')
    ),
    timeout_milliseconds := 120000
  );
  $job$
);
