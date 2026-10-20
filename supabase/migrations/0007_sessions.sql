-- Расписание и консультации: рабочие часы психолога, выходные, сеансы, запись из каталога.
-- Свободные окна считает база (free_slots), запись и перенос проверяются там же,
-- двойная запись на одно время невозможна (ограничение exclude).
-- Поля video_url и payment_status заложены под видеоконсультации и онлайн-оплату.

create extension if not exists btree_gist with schema extensions;

alter table public.psychologists
  add column buffer_minutes int not null default 10 check (buffer_minutes between 0 and 60),
  add column booking_notice_hours int not null default 12 check (booking_notice_hours between 0 and 168),
  add column booking_horizon_days int not null default 30 check (booking_horizon_days between 1 and 90);

-- Рабочие часы по дням недели (1 — понедельник … 7 — воскресенье), в минутах от полуночи по часовому поясу психолога.
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null default auth.uid() references public.psychologists (user_id) on delete cascade,
  weekday int not null check (weekday between 1 and 7),
  start_min int not null check (start_min between 0 and 1439),
  end_min int not null check (end_min between 1 and 1440),
  check (end_min > start_min)
);
create index availability_idx on public.availability (psychologist_id, weekday);
alter table public.availability enable row level security;

-- Отпуск, выходной, занятое время вне «Опоры».
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null default auth.uid() references public.psychologists (user_id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text not null default '' check (char_length(note) <= 200),
  check (ends_at > starts_at)
);
create index time_off_idx on public.time_off (psychologist_id, starts_at);
alter table public.time_off enable row level security;

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (user_id) on delete cascade,
  client_id uuid not null references auth.users (id) on delete cascade,
  link_id uuid references public.client_links (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  format text not null default 'online' check (format in ('online', 'offline')),
  price int,
  currency text,
  -- Итоги встречи и задачи до следующей: пишет психолог, видит и клиент.
  summary text check (summary is null or char_length(summary) <= 4000),
  tasks text check (tasks is null or char_length(tasks) <= 4000),
  -- На будущее: ссылка на видеовстречу и оплата.
  video_url text check (video_url is null or video_url ~ '^https://'),
  payment_status text not null default 'none' check (payment_status in ('none', 'pending', 'paid', 'refunded')),
  created_by uuid,
  cancelled_by uuid,
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 500),
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  constraint sessions_no_overlap exclude using gist (
    psychologist_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'scheduled')
);
create index sessions_psychologist_idx on public.sessions (psychologist_id, starts_at);
create index sessions_client_idx on public.sessions (client_id, starts_at);
alter table public.sessions enable row level security;

/* ---------- Правила доступа ---------- */

create policy "availability own" on public.availability
  for all to authenticated
  using (psychologist_id = (select auth.uid()))
  with check (psychologist_id = (select auth.uid()));
create policy "time off own" on public.time_off
  for all to authenticated
  using (psychologist_id = (select auth.uid()))
  with check (psychologist_id = (select auth.uid()));
create policy "sessions participants" on public.sessions
  for select to authenticated
  using (client_id = (select auth.uid()) or psychologist_id = (select auth.uid()));

revoke all on public.availability, public.time_off, public.sessions from anon;
revoke insert, update, delete on public.sessions from authenticated;

-- Психолог видит имя и того, кто только записался из каталога и ждёт ответа.
create function public.is_my_client_or_request(client uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.client_links l
    where l.client_id = client and l.psychologist_id = (select auth.uid()) and l.status in ('pending', 'active')
  )
$$;
drop policy "linked psychologist reads client profile" on public.profiles;
create policy "linked psychologist reads client profile" on public.profiles
  for select to authenticated
  using (public.is_my_client_or_request(id));

/* ---------- Свободные окна ---------- */

-- Свободное время психолога на ближайшие дни. Чужие записи не раскрываются: только окна.
create function public.free_slots(p_psychologist uuid, p_days int default 21)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  with p as (
    select * from public.psychologists
    where user_id = p_psychologist
      and (
        (status = 'approved' and accepting_clients)
        or user_id = (select auth.uid())
        or exists (
          select 1 from public.client_links l
          where l.psychologist_id = p_psychologist and l.client_id = (select auth.uid()) and l.status in ('pending', 'active')
        )
      )
  ),
  days as (
    select ((now() at time zone p.timezone)::date + i) as d, p.timezone as tz, p.session_minutes as m,
           p.buffer_minutes as b, p.booking_notice_hours as n
    from p, generate_series(0, least(greatest(p_days, 1), p.booking_horizon_days)) as i
  ),
  slots as (
    select ((days.d + make_interval(mins => s)) at time zone days.tz) as st, days.m, days.n
    from days
    join public.availability a on a.psychologist_id = p_psychologist and a.weekday = extract(isodow from days.d)
    cross join lateral generate_series(a.start_min, a.end_min - days.m, days.m + days.b) as s
  )
  select st, st + make_interval(mins => m)
  from slots
  where st >= now() + make_interval(hours => n)
    and not exists (
      select 1 from public.sessions x
      where x.psychologist_id = p_psychologist and x.status = 'scheduled'
        and tstzrange(x.starts_at, x.ends_at) && tstzrange(st, st + make_interval(mins => m))
    )
    and not exists (
      select 1 from public.time_off t
      where t.psychologist_id = p_psychologist
        and tstzrange(t.starts_at, t.ends_at) && tstzrange(st, st + make_interval(mins => m))
    )
  order by st
$$;

/* ---------- Действия ---------- */

-- Запись клиента. Из каталога (связи ещё нет) создаётся заявка: психолог подтверждает её, принимая клиента.
create function public.book_session(p_psychologist uuid, p_starts_at timestamptz, p_format text default 'online',
  p_scopes text[] default '{}', p_version text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  p public.psychologists;
  link public.client_links;
  sid uuid;
  s text;
begin
  if me is null then raise exception 'unauthorized'; end if;
  if me = p_psychologist then raise exception 'own profile'; end if;
  select * into p from public.psychologists where user_id = p_psychologist;
  if p.user_id is null or p.status <> 'approved' then raise exception 'not available'; end if;
  if not (p_format = any (p.formats)) then raise exception 'bad format'; end if;

  select * into link from public.client_links
   where psychologist_id = p_psychologist and client_id = me and status in ('pending', 'active');
  if link.id is null then
    if not p.accepting_clients then raise exception 'not accepting'; end if;
    insert into public.client_links (psychologist_id, client_id, status, source)
    values (p_psychologist, me, 'pending', 'catalog')
    returning * into link;
    perform public.log_event('link.requested', me, p_psychologist, jsonb_build_object('source', 'catalog'));
    foreach s in array coalesce(p_scopes, '{}') loop
      perform public.set_consent(link.id, s, true, p_version);
    end loop;
  end if;

  if not exists (select 1 from public.free_slots(p_psychologist, 90) f where f.starts_at = p_starts_at) then
    raise exception 'slot taken';
  end if;
  insert into public.sessions (psychologist_id, client_id, link_id, starts_at, ends_at, format, price, currency, created_by)
  values (p_psychologist, me, link.id, p_starts_at, p_starts_at + make_interval(mins => p.session_minutes),
          p_format, p.price, p.currency, me)
  returning id into sid;
  perform public.log_event('session.booked', me, p_psychologist, jsonb_build_object('session', sid, 'at', p_starts_at));
  return sid;
end;
$$;

-- Психолог назначает встречу своему клиенту на любое свободное время.
create function public.create_session(p_client uuid, p_starts_at timestamptz, p_minutes int default null, p_format text default 'online')
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  p public.psychologists;
  link_id uuid;
  sid uuid;
begin
  select id into link_id from public.client_links where psychologist_id = me and client_id = p_client and status = 'active';
  if link_id is null then raise exception 'forbidden'; end if;
  select * into p from public.psychologists where user_id = me;
  if p_starts_at < now() then raise exception 'in past'; end if;
  insert into public.sessions (psychologist_id, client_id, link_id, starts_at, ends_at, format, price, currency, created_by)
  values (me, p_client, link_id, p_starts_at,
          p_starts_at + make_interval(mins => coalesce(p_minutes, p.session_minutes)),
          case when p_format = 'offline' then 'offline' else 'online' end, p.price, p.currency, me)
  returning id into sid;
  perform public.log_event('session.booked', p_client, me, jsonb_build_object('session', sid, 'at', p_starts_at));
  return sid;
end;
$$;

-- Перенос. Клиент выбирает из свободных окон, психолог — любое свободное время.
create function public.reschedule_session(p_session uuid, p_starts_at timestamptz)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  x public.sessions;
  minutes int;
begin
  select * into x from public.sessions where id = p_session for update;
  if x.id is null or (x.client_id is distinct from me and x.psychologist_id is distinct from me) then raise exception 'forbidden'; end if;
  if x.status <> 'scheduled' then raise exception 'not scheduled'; end if;
  if p_starts_at < now() then raise exception 'in past'; end if;
  minutes := extract(epoch from (x.ends_at - x.starts_at)) / 60;
  -- Освобождаем старое время, чтобы оно не мешало проверке нового.
  update public.sessions set status = 'cancelled' where id = p_session;
  if me = x.client_id and not exists (select 1 from public.free_slots(x.psychologist_id, 90) f where f.starts_at = p_starts_at) then
    raise exception 'slot taken';
  end if;
  update public.sessions
     set status = 'scheduled', starts_at = p_starts_at, ends_at = p_starts_at + make_interval(mins => minutes),
         reminded_at = null, updated_at = now()
   where id = p_session;
  perform public.log_event('session.rescheduled', x.client_id, x.psychologist_id,
    jsonb_build_object('session', p_session, 'from', x.starts_at, 'at', p_starts_at));
end;
$$;

create function public.cancel_session(p_session uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  x public.sessions;
begin
  select * into x from public.sessions where id = p_session for update;
  if x.id is null or (x.client_id is distinct from me and x.psychologist_id is distinct from me) then raise exception 'forbidden'; end if;
  if x.status <> 'scheduled' then return; end if;
  update public.sessions
     set status = 'cancelled', cancelled_by = me, cancel_reason = nullif(left(trim(p_reason), 500), ''), updated_at = now()
   where id = p_session;
  perform public.log_event('session.cancelled', x.client_id, x.psychologist_id, jsonb_build_object('session', p_session, 'at', x.starts_at));
end;
$$;

-- Итоги встречи и задачи до следующей. Только психолог; встреча становится завершённой.
create function public.complete_session(p_session uuid, p_summary text, p_tasks text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  x public.sessions;
begin
  select * into x from public.sessions where id = p_session for update;
  if x.id is null or x.psychologist_id is distinct from auth.uid() then raise exception 'forbidden'; end if;
  if x.status = 'cancelled' then raise exception 'cancelled'; end if;
  if x.starts_at > now() then raise exception 'not started'; end if;
  update public.sessions
     set status = 'completed', summary = nullif(left(trim(p_summary), 4000), ''), tasks = nullif(left(trim(p_tasks), 4000), ''), updated_at = now()
   where id = p_session;
  if x.status = 'scheduled' then
    perform public.log_event('session.completed', x.client_id, x.psychologist_id, jsonb_build_object('session', p_session));
  end if;
end;
$$;

-- Психолог принимает клиента, записавшегося из каталога.
create function public.accept_request(p_link uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  l public.client_links;
begin
  select * into l from public.client_links where id = p_link for update;
  if l.id is null or l.psychologist_id is distinct from auth.uid() then raise exception 'forbidden'; end if;
  if l.status <> 'pending' then return; end if;
  update public.client_links set status = 'active', activated_at = now() where id = p_link;
  perform public.log_event('link.created', l.client_id, l.psychologist_id, jsonb_build_object('source', l.source));
end;
$$;

-- Завершение работы теперь отменяет и будущие встречи.
create or replace function public.end_link(p_link uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  l public.client_links;
begin
  select * into l from public.client_links where id = p_link for update;
  if l.id is null or (l.client_id is distinct from me and l.psychologist_id is distinct from me) then
    raise exception 'forbidden';
  end if;
  if l.status = 'ended' then return; end if;
  update public.client_links set status = 'ended', ended_at = now(), ended_by = me where id = p_link;
  update public.consent_grants set revoked_at = now() where link_id = p_link and revoked_at is null;
  update public.sessions set status = 'cancelled', cancelled_by = me, updated_at = now()
   where psychologist_id = l.psychologist_id and client_id = l.client_id and status = 'scheduled' and starts_at > now();
  perform public.log_event('link.ended', l.client_id, l.psychologist_id,
    jsonb_build_object('by', case when me = l.client_id then 'client' else 'psychologist' end));
end;
$$;

revoke execute on function public.free_slots(uuid, int) from public;
grant execute on function public.free_slots(uuid, int) to anon, authenticated;
revoke execute on function public.book_session(uuid, timestamptz, text, text[], text) from public, anon;
revoke execute on function public.create_session(uuid, timestamptz, int, text) from public, anon;
revoke execute on function public.reschedule_session(uuid, timestamptz) from public, anon;
revoke execute on function public.cancel_session(uuid, text) from public, anon;
revoke execute on function public.complete_session(uuid, text, text) from public, anon;
revoke execute on function public.accept_request(uuid) from public, anon;
revoke execute on function public.end_link(uuid) from public, anon;
