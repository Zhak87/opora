create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  locale text not null check (locale in ('ru', 'kk', 'en')),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table public.push_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('message', 'reminder', 'changed', 'booked')),
  href text not null,
  session_id uuid references public.sessions (id) on delete cascade,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  expires_at timestamptz not null,
  delivered_to uuid[] not null default '{}'
);
create index push_jobs_ready_idx on public.push_jobs (available_at);
create index push_jobs_expiry_idx on public.push_jobs (expires_at);
create index push_jobs_session_idx on public.push_jobs (session_id) where session_id is not null;

alter table public.push_subscriptions enable row level security;
alter table public.push_jobs enable row level security;
revoke all on public.push_subscriptions, public.push_jobs from public, anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions, public.push_jobs to service_role;

create function public.queue_care_push()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.sender_id = new.psychologist_id then
    insert into public.push_jobs (user_id, kind, href, expires_at)
      values (new.client_id, 'message', '/care/chat/' || new.psychologist_id, now() + interval '1 hour');
  else
    insert into public.push_jobs (user_id, kind, href, expires_at)
      values (new.psychologist_id, 'message', '/pro/messages/' || new.client_id, now() + interval '1 hour');
  end if;
  return new;
end;
$$;
revoke execute on function public.queue_care_push() from public, anon, authenticated;
create trigger queue_care_push after insert on public.care_messages
  for each row execute function public.queue_care_push();

create function public.queue_session_push()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  event_kind text;
begin
  delete from public.push_jobs where session_id = new.id;
  if new.status = 'scheduled' and new.starts_at > now() then
    insert into public.push_jobs (user_id, kind, href, session_id, available_at, expires_at)
      values
        (new.client_id, 'reminder', '/care/sessions/' || new.id, new.id, new.starts_at - interval '15 minutes', new.starts_at),
        (new.psychologist_id, 'reminder', '/pro/sessions/' || new.id, new.id, new.starts_at - interval '15 minutes', new.starts_at);
  end if;

  if tg_op = 'INSERT' then
    if new.status = 'scheduled' then event_kind := 'booked'; end if;
  elsif new.status = 'cancelled' and new.cancelled_by is not null then
    event_kind := 'changed';
  elsif new.status = 'scheduled' and old.starts_at is distinct from new.starts_at then
    event_kind := 'changed';
  end if;
  if event_kind is not null then
    insert into public.push_jobs (user_id, kind, href, session_id, expires_at)
      values
        (new.client_id, event_kind, '/care/sessions/' || new.id, new.id, now() + interval '1 hour'),
        (new.psychologist_id, event_kind, '/pro/sessions/' || new.id, new.id, now() + interval '1 hour');
  end if;
  return new;
end;
$$;
revoke execute on function public.queue_session_push() from public, anon, authenticated;
create trigger queue_new_session_push after insert on public.sessions
  for each row execute function public.queue_session_push();
create trigger queue_updated_session_push after update of starts_at, status, cancelled_by on public.sessions
  for each row when (old.starts_at is distinct from new.starts_at or old.status is distinct from new.status
    or old.cancelled_by is distinct from new.cancelled_by)
  execute function public.queue_session_push();

-- Напоминания о встречах, которые были назначены до подключения Web Push.
insert into public.push_jobs (user_id, kind, href, session_id, available_at, expires_at)
select recipient.user_id, 'reminder', recipient.path || s.id, s.id, s.starts_at - interval '15 minutes', s.starts_at
from public.sessions s
cross join lateral (values (s.client_id, '/care/sessions/'), (s.psychologist_id, '/pro/sessions/')) as recipient(user_id, path)
where s.status = 'scheduled' and s.starts_at > now();

-- Блокировка между запусками планировщика. Если отправитель прервётся, задание снова станет доступно.
create function public.claim_push_jobs()
returns setof public.push_jobs language sql set search_path = ''
as $$
  delete from public.push_jobs where expires_at <= now();
  update public.push_jobs j set available_at = now() + interval '2 minutes'
  where j.id in (
    select id from public.push_jobs
    where available_at <= now() and expires_at > now()
    order by available_at
    limit 30
    for update skip locked
  )
  returning j.*;
$$;
revoke execute on function public.claim_push_jobs() from public, anon, authenticated;
grant execute on function public.claim_push_jobs() to service_role;
