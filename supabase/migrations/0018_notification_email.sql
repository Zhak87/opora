create table public.notification_email_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  locale text not null check (locale in ('ru', 'kk', 'en')),
  enabled_at timestamptz not null default now(),
  last_daily_on date
);
alter table public.notification_email_preferences enable row level security;
revoke all on public.notification_email_preferences from public, anon, authenticated;
grant select on public.notification_email_preferences to authenticated;
create policy "notification email own" on public.notification_email_preferences
  for select to authenticated using (user_id = (select auth.uid()));
grant select, insert, update, delete on public.notification_email_preferences to service_role;

alter table public.push_jobs
  drop constraint push_jobs_kind_check,
  add constraint push_jobs_kind_check check (kind in ('message', 'reminder', 'changed', 'booked', 'care', 'daily')),
  add column email_done boolean not null default false,
  add column push_done boolean not null default false;

-- Запись о встрече уже попадает в очередь из таблицы sessions.
create function public.queue_other_care_notification()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.kind not in ('session.booked', 'session.rescheduled', 'session.cancelled') then
    insert into public.push_jobs (user_id, kind, href, expires_at)
      values (new.user_id, 'care',
        case when new.user_id = new.psychologist_id then '/pro' else '/notifications' end,
        now() + interval '1 hour');
  end if;
  return new;
end;
$$;
revoke execute on function public.queue_other_care_notification() from public, anon, authenticated;
create trigger queue_other_care_notification after insert on public.care_notifications
  for each row execute function public.queue_other_care_notification();

create function public.queue_daily_notification_emails()
returns void language sql set search_path = ''
as $$
  with recipients as (
    update public.notification_email_preferences
      set last_daily_on = (now() at time zone 'Asia/Almaty')::date
      where last_daily_on is distinct from (now() at time zone 'Asia/Almaty')::date
      returning user_id
  )
  insert into public.push_jobs (user_id, kind, href, expires_at, push_done)
  select user_id, 'daily', '/notifications', now() + interval '12 hours', true
  from recipients;
$$;
revoke execute on function public.queue_daily_notification_emails() from public, anon, authenticated;
grant execute on function public.queue_daily_notification_emails() to service_role;
