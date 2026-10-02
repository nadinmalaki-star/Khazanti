-- =====================================================================
-- KHZNTI Phase 1 Web Push — Migration 1 (storage + functions only)
-- =====================================================================
-- Purely additive. Creates:
--   1. public.push_subscriptions        (one row per opted-in device)
--   2. public.debt_reminder_deliveries  (claim -> sent records per stage)
--   3. public.push_daily_sends          (one push per user per local date)
--   4. register_push_subscription(...)  (browser, authenticated only; never
--      transfers an endpoint between users)
--   5. debt_reminder_candidates(...)    (sender, service_role only)
--   6. claim_daily_push / claim_reminder_stages / finalize_push_run
--      (sender, service_role only — implement the tested Stage 1 model)
--
-- It does NOT touch transactions, debts, products, analytics_events or any
-- existing policy, and does NOT install pg_cron / pg_net or anything that
-- can make network requests: on its own it cannot send a notification.
--
-- Claim model (matches supabase/functions/_shared/debt-reminders.js):
--   claim (status 'claimed', run_id, claimed_at) -> send -> finalize:
--   'sent' only if a push service accepted; otherwise the run's claims are
--   deleted (released) and stay retryable. A 'claimed' row older than the
--   15-minute lease belongs to a crashed run and may be taken over.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. push_subscriptions
-- ---------------------------------------------------------------------
create table public.push_subscriptions (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  endpoint        text not null,
  p256dh          text not null,
  auth_key        text not null,
  timezone        text not null,
  user_agent      text,
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  last_success_at timestamptz,
  failure_count   integer not null default 0,
  constraint push_subscriptions_endpoint_key unique (endpoint),
  constraint push_subscriptions_endpoint_len check (char_length(endpoint) <= 1024),
  constraint push_subscriptions_keys_format check (
    p256dh   ~ '^[A-Za-z0-9_-]{80,100}={0,2}$' and
    auth_key ~ '^[A-Za-z0-9_-]{16,32}={0,2}$'
  ),
  constraint push_subscriptions_timezone_len check (char_length(timezone) <= 64),
  constraint push_subscriptions_user_agent_len check (user_agent is null or char_length(user_agent) <= 300)
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: owner can select"
  on public.push_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "push_subscriptions: owner can delete"
  on public.push_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- No INSERT/UPDATE policy: browsers write only via register_push_subscription().
revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;


-- ---------------------------------------------------------------------
-- 2. debt_reminder_deliveries — one slot per (debt, due_date, stage group)
-- ---------------------------------------------------------------------
create table public.debt_reminder_deliveries (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  debt_id     integer not null references public.debts(id) on delete cascade,
  due_date    date not null,
  stage       text not null,
  stage_group text generated always as (
                case when stage in ('due_in_3', 'due_in_2', 'due_in_1') then 'pre_due' else stage end
              ) stored,
  local_date  date not null,
  status      text not null default 'claimed',
  run_id      uuid not null,
  claimed_at  timestamptz not null default now(),
  sent_at     timestamptz,
  constraint debt_reminder_deliveries_stage_check
    check (stage in ('due_in_3', 'due_in_2', 'due_in_1', 'due_today', 'overdue')),
  constraint debt_reminder_deliveries_status_check
    check (status in ('claimed', 'sent')),
  constraint debt_reminder_deliveries_sent_at_check
    check ((status = 'sent') = (sent_at is not null)),
  -- At most one pre_due, one due_today and one overdue per debt + due date
  -- (=> max 3 per cycle). A new due_date is a new cycle.
  constraint debt_reminder_deliveries_cycle_group_key unique (debt_id, due_date, stage_group)
);

create index debt_reminder_deliveries_user_id_idx on public.debt_reminder_deliveries (user_id);
create index debt_reminder_deliveries_claimed_run_idx
  on public.debt_reminder_deliveries (run_id) where status = 'claimed';

alter table public.debt_reminder_deliveries enable row level security;
-- No policies: not readable or writable by anon/authenticated at all.
revoke all on public.debt_reminder_deliveries from anon, authenticated;


-- ---------------------------------------------------------------------
-- 3. push_daily_sends — one push per user per local date
-- ---------------------------------------------------------------------
create table public.push_daily_sends (
  user_id    uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  status     text not null default 'claimed',
  run_id     uuid not null,
  claimed_at timestamptz not null default now(),
  sent_at    timestamptz,
  primary key (user_id, local_date),
  constraint push_daily_sends_status_check check (status in ('claimed', 'sent')),
  constraint push_daily_sends_sent_at_check check ((status = 'sent') = (sent_at is not null))
);

create index push_daily_sends_claimed_run_idx
  on public.push_daily_sends (run_id) where status = 'claimed';

alter table public.push_daily_sends enable row level security;
revoke all on public.push_daily_sends from anon, authenticated;


-- ---------------------------------------------------------------------
-- 4. register_push_subscription — browser (authenticated) only
-- ---------------------------------------------------------------------
create or replace function public.register_push_subscription(
  p_endpoint   text,
  p_p256dh     text,
  p_auth_key   text,
  p_timezone   text,
  p_user_agent text default null
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id  bigint;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- Only real Web Push services: FCM (Chrome/Edge/Samsung/Opera on Android),
  -- Mozilla, Apple, Microsoft. Host must be followed directly by "/".
  if p_endpoint is null
     or char_length(p_endpoint) > 1024
     or p_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.notify\.windows\.com)/[^[:space:]]+$'
  then
    raise exception 'unsupported push endpoint' using errcode = '22023';
  end if;

  if p_p256dh is null or p_p256dh !~ '^[A-Za-z0-9_-]{80,100}={0,2}$'
     or p_auth_key is null or p_auth_key !~ '^[A-Za-z0-9_-]{16,32}={0,2}$'
  then
    raise exception 'invalid subscription keys' using errcode = '22023';
  end if;

  -- Device-reported IANA zone only; no fallback zone by design.
  if p_timezone is null
     or char_length(p_timezone) > 64
     or p_timezone !~ '^(UTC|[A-Za-z]+(/[A-Za-z0-9_+-]+)+)$'
     or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone)
  then
    raise exception 'invalid timezone' using errcode = '22023';
  end if;

  -- user_id always comes from auth.uid().
  -- New endpoint -> inserted for the caller.
  -- Endpoint already owned by the caller -> keys / timezone / last_seen refreshed.
  -- Endpoint owned by ANOTHER user -> nothing changes (no ownership transfer)
  --   and the caller gets the same generic 'not_registered' status, with no
  --   information about the existing row. The browser then unsubscribes that
  --   device subscription and subscribes again, which yields a brand-new
  --   endpoint that registers cleanly; the old row's endpoint is dead from
  --   then on and is removed by the sender on its 404/410.
  insert into public.push_subscriptions as s
    (user_id, endpoint, p256dh, auth_key, timezone, user_agent)
  values
    (v_uid, p_endpoint, p_p256dh, p_auth_key, p_timezone, left(p_user_agent, 300))
  on conflict (endpoint) do update set
    p256dh        = excluded.p256dh,
    auth_key      = excluded.auth_key,
    timezone      = excluded.timezone,
    user_agent    = excluded.user_agent,
    last_seen_at  = now(),
    failure_count = 0
  where s.user_id = excluded.user_id
  returning s.id into v_id;

  return case when v_id is null then 'not_registered' else 'registered' end;
end;
$$;

revoke all on function public.register_push_subscription(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.register_push_subscription(text, text, text, text, text) to authenticated;


-- ---------------------------------------------------------------------
-- 5. debt_reminder_candidates — sender (service_role) only
-- ---------------------------------------------------------------------
-- Eligible debts of ONE user for p_local_date (the user's local calendar
-- date), with the stage groups already taken for each debt's CURRENT
-- due_date (sent, or claimed within the 15-minute lease).
-- No names, no amounts.
create or replace function public.debt_reminder_candidates(
  p_user_id    uuid,
  p_local_date date,
  p_now        timestamptz default now()
) returns table (
  debt_id        integer,
  account_type   text,
  due_date       date,
  days_until_due integer,
  taken_groups   text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    d.id,
    d.account_type,
    d.due_date,
    (d.due_date - p_local_date)::integer,
    coalesce(
      array(
        select r.stage_group
        from public.debt_reminder_deliveries r
        where r.debt_id = d.id
          and r.due_date = d.due_date
          and (r.status = 'sent' or r.claimed_at > p_now - interval '15 minutes')
        order by r.stage_group
      ),
      '{}'::text[]
    )
  from public.debts d
  where d.user_id = p_user_id
    and d.due_date is not null
    and coalesce(d.paid, 0) = 0
    and coalesce(d.amount, 0) - coalesce(d.paid_amount, 0) > 0.005
    and d.due_date <= p_local_date + 3
  order by d.due_date, d.id;
$$;

revoke all on function public.debt_reminder_candidates(uuid, date, timestamptz) from public, anon, authenticated;
grant execute on function public.debt_reminder_candidates(uuid, date, timestamptz) to service_role;


-- ---------------------------------------------------------------------
-- 6. claim / finalize — sender (service_role) only
-- ---------------------------------------------------------------------

-- Reserve the user's single push for p_local_date.
-- 'claimed'      -> this run owns it
-- 'already_sent' -> a push was already delivered for that local date
-- 'in_progress'  -> another run holds a live (non-stale) claim
create or replace function public.claim_daily_push(
  p_user_id    uuid,
  p_local_date date,
  p_run_id     uuid,
  p_now        timestamptz default now()
) returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner  uuid;
  v_status text;
begin
  insert into public.push_daily_sends as s (user_id, local_date, status, run_id, claimed_at)
  values (p_user_id, p_local_date, 'claimed', p_run_id, p_now)
  on conflict (user_id, local_date) do update
    set run_id = excluded.run_id, claimed_at = excluded.claimed_at
    where s.status = 'claimed' and s.claimed_at <= p_now - interval '15 minutes'
  returning s.run_id into v_owner;

  if v_owner = p_run_id then
    return 'claimed';
  end if;

  select s.status into v_status
  from public.push_daily_sends s
  where s.user_id = p_user_id and s.local_date = p_local_date;

  return case when v_status = 'sent' then 'already_sent' else 'in_progress' end;
end;
$$;

-- Reserve stage slots for this run. p_items: [{"debt_id":1,"due_date":"2026-11-13","stage":"due_today"}, ...]
-- Re-checks on the live tables that the run holds the daily claim, the debt
-- belongs to the user, still has that due_date, is still eligible, and that
-- the stage matches the days left. Returns only the items actually claimed.
create or replace function public.claim_reminder_stages(
  p_user_id    uuid,
  p_local_date date,
  p_run_id     uuid,
  p_items      jsonb,
  p_now        timestamptz default now()
) returns table (debt_id integer, due_date date, stage text)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.push_daily_sends s
    where s.user_id = p_user_id and s.local_date = p_local_date
      and s.run_id = p_run_id and s.status = 'claimed'
  ) then
    return;
  end if;

  return query
  insert into public.debt_reminder_deliveries as r
    (user_id, debt_id, due_date, stage, local_date, status, run_id, claimed_at)
  select p_user_id, d.id, d.due_date, i.stage, p_local_date, 'claimed', p_run_id, p_now
  from jsonb_to_recordset(p_items) as i(debt_id integer, due_date date, stage text)
  join public.debts d on d.id = i.debt_id
  where d.user_id = p_user_id
    and d.due_date = i.due_date
    and coalesce(d.paid, 0) = 0
    and coalesce(d.amount, 0) - coalesce(d.paid_amount, 0) > 0.005
    and i.stage = case
      when d.due_date - p_local_date = 3 then 'due_in_3'
      when d.due_date - p_local_date = 2 then 'due_in_2'
      when d.due_date - p_local_date = 1 then 'due_in_1'
      when d.due_date - p_local_date = 0 then 'due_today'
      when d.due_date - p_local_date < 0 then 'overdue'
    end
  on conflict on constraint debt_reminder_deliveries_cycle_group_key do update
    set stage = excluded.stage, local_date = excluded.local_date,
        run_id = excluded.run_id, claimed_at = excluded.claimed_at
    where r.status = 'claimed' and r.claimed_at <= p_now - interval '15 minutes'
  returning r.debt_id, r.due_date, r.stage;
end;
$$;

-- Finish a run: p_delivered = true only if at least one push service accepted
-- (HTTP 2xx). true -> this run's claims become 'sent'. false -> this run's
-- claims are deleted (released) and stay retryable. Only rows still owned by
-- p_run_id are affected, so a run can never finalize or release another run's
-- claims. Returns the number of reminder rows affected.
create or replace function public.finalize_push_run(
  p_run_id    uuid,
  p_delivered boolean,
  p_now       timestamptz default now()
) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rows integer;
begin
  if p_delivered then
    update public.debt_reminder_deliveries
      set status = 'sent', sent_at = p_now
      where run_id = p_run_id and status = 'claimed';
    get diagnostics v_rows = row_count;
    update public.push_daily_sends
      set status = 'sent', sent_at = p_now
      where run_id = p_run_id and status = 'claimed';
  else
    delete from public.debt_reminder_deliveries
      where run_id = p_run_id and status = 'claimed';
    get diagnostics v_rows = row_count;
    delete from public.push_daily_sends
      where run_id = p_run_id and status = 'claimed';
  end if;
  return v_rows;
end;
$$;

revoke all on function public.claim_daily_push(uuid, date, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_reminder_stages(uuid, date, uuid, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.finalize_push_run(uuid, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_daily_push(uuid, date, uuid, timestamptz) to service_role;
grant execute on function public.claim_reminder_stages(uuid, date, uuid, jsonb, timestamptz) to service_role;
grant execute on function public.finalize_push_run(uuid, boolean, timestamptz) to service_role;
