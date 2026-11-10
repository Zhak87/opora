-- Комнаты: общение пользователей между собой (текстовый чат, голос, запланированные встречи).
-- Читать и писать можно только через функции ниже: они проверяют время начала, заявки и блокировки.
-- ИИ-модератор пишет в комнату через служебный ключ сервера (service_role) и видит только эту комнату.

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  description text not null default '' check (char_length(description) <= 300),
  -- chat — только текст, voice — текст и общий голос
  format text not null check (format in ('chat', 'voice')),
  -- open — заходит любой вошедший, request — только с одобренной заявкой
  access text not null default 'open' check (access in ('open', 'request')),
  scheduled boolean not null default false,
  starts_at timestamptz not null default now(),
  -- сколько человек одновременно могут говорить (вместе с создателем); слушателей сколько угодно
  max_speakers int not null default 5 check (max_speakers between 1 and 20),
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  ended_at timestamptz
);
create index rooms_live_idx on public.rooms (starts_at) where ended_at is null;
create index rooms_creator_idx on public.rooms (creator_id, created_at desc);

create table public.room_requests (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  primary key (room_id, user_id)
);

create table public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'listener' check (role in ('listener', 'speaker')),
  hand_at timestamptz,
  voice_muted_at timestamptz,
  banned_at timestamptz,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  -- null у сообщений ИИ-модератора
  sender_id uuid references auth.users (id) on delete cascade,
  kind text not null default 'user' check (kind in ('user', 'moderator')),
  body text not null default '' check (char_length(body) <= 2000),
  -- для модератора: greeting, reminder; для людей: найденное нарушение (insult, harassment, threat, personal_data)
  flag text,
  reply_to uuid references public.room_messages (id) on delete set null,
  hidden_at timestamptz,
  created_at timestamptz not null default now()
);
create index room_messages_room_idx on public.room_messages (room_id, created_at desc);
create index room_messages_sender_idx on public.room_messages (sender_id, created_at desc);

create table public.room_reports (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  -- null — случай передал ИИ-модератор
  reporter_id uuid references auth.users (id) on delete cascade,
  target_id uuid not null references auth.users (id) on delete cascade,
  message_id uuid references public.room_messages (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 300),
  source text not null check (source in ('ai', 'user')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index room_reports_room_idx on public.room_reports (room_id, created_at desc);

alter table public.rooms enable row level security;
alter table public.room_requests enable row level security;
alter table public.room_members enable row level security;
alter table public.room_messages enable row level security;
alter table public.room_reports enable row level security;

-- Каталог видят все вошедшие. Остальное — только через функции.
create policy "rooms visible" on public.rooms for select to authenticated using (true);
create policy "room requests own or creator" on public.room_requests for select to authenticated
  using (user_id = (select auth.uid())
    or exists (select 1 from public.rooms r where r.id = room_id and r.creator_id = (select auth.uid())));
revoke insert, update, delete on public.rooms, public.room_requests from anon, authenticated;
revoke all on public.room_members, public.room_messages, public.room_reports from anon, authenticated;

/* ---------- Право входа ---------- */

-- ok | not_found | ended | banned | not_started | request_none | request_pending | request_declined
create function public.room_access(p_room uuid)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  r public.rooms;
  st text;
begin
  if me is null then return 'not_found'; end if;
  select * into r from public.rooms where id = p_room;
  if r.id is null then return 'not_found'; end if;
  if r.ended_at is not null then return 'ended'; end if;
  if exists (select 1 from public.room_members m where m.room_id = p_room and m.user_id = me and m.banned_at is not null) then
    return 'banned';
  end if;
  if now() < r.starts_at then return 'not_started'; end if;
  if r.access = 'request' and r.creator_id <> me then
    select status into st from public.room_requests where room_id = p_room and user_id = me;
    if st is null then return 'request_none'; end if;
    if st <> 'approved' then return 'request_' || st; end if;
  end if;
  return 'ok';
end;
$$;

create function public.room_can_enter(p_room uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select public.room_access(p_room) = 'ok' $$;

/* ---------- Создание и вход ---------- */

create function public.create_room(
  p_title text, p_description text, p_format text, p_scheduled boolean, p_starts_at timestamptz, p_access text, p_max_speakers int
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  t text := btrim(coalesce(p_title, ''));
  d text := left(btrim(coalesce(p_description, '')), 300);
  at timestamptz := case when p_scheduled then p_starts_at else now() end;
  rid uuid;
begin
  if me is null then raise exception 'forbidden'; end if;
  if char_length(t) < 3 or char_length(t) > 80 then raise exception 'title'; end if;
  if p_format not in ('chat', 'voice') then raise exception 'format'; end if;
  if p_scheduled and (at is null or at < now() - interval '1 minute' or at > now() + interval '90 days') then
    raise exception 'starts_at';
  end if;
  -- Не больше 5 новых комнат в час от одного человека.
  if (select count(*) from public.rooms where creator_id = me and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too many';
  end if;
  insert into public.rooms (creator_id, title, description, format, access, scheduled, starts_at, max_speakers)
  values (me, t, d, p_format, case when p_scheduled and p_access = 'request' then 'request' else 'open' end,
          coalesce(p_scheduled, false), at, least(greatest(coalesce(p_max_speakers, 5), 1), 20))
  returning id into rid;
  insert into public.room_members (room_id, user_id, role) values (rid, me, 'speaker');
  return rid;
end;
$$;

-- Вход в комнату: проверяет право, отмечает участника, при первом входе модератор публикует приветствие.
create function public.enter_room(p_room uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  st text := public.room_access(p_room);
begin
  if st <> 'ok' then return st; end if;
  insert into public.room_members (room_id, user_id) values (p_room, me)
  on conflict (room_id, user_id) do update set last_seen_at = now();
  update public.rooms set last_activity_at = now() where id = p_room;
  if not exists (select 1 from public.room_messages where room_id = p_room and kind = 'moderator' and flag = 'greeting') then
    insert into public.room_messages (room_id, kind, flag) values (p_room, 'moderator', 'greeting');
  end if;
  return 'ok';
end;
$$;

/* ---------- Чтение ---------- */

-- Комната и моя роль в ней (для страницы комнаты, в том числе до начала).
create function public.room_info(p_room uuid)
returns table (
  id uuid, title text, description text, format text, access text, scheduled boolean, starts_at timestamptz,
  ended_at timestamptz, max_speakers int, creator_id uuid, creator_name text, is_creator boolean,
  my_role text, my_hand boolean, my_muted boolean, request_status text, pending_requests int
)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.title, r.description, r.format, r.access, r.scheduled, r.starts_at, r.ended_at, r.max_speakers,
         r.creator_id, (select p.name from public.profiles p where p.id = r.creator_id),
         r.creator_id = (select auth.uid()),
         m.role, m.hand_at is not null, m.voice_muted_at is not null,
         (select q.status from public.room_requests q where q.room_id = r.id and q.user_id = (select auth.uid())),
         case when r.creator_id = (select auth.uid())
              then (select count(*)::int from public.room_requests q where q.room_id = r.id and q.status = 'pending') else 0 end
    from public.rooms r
    left join public.room_members m on m.room_id = r.id and m.user_id = (select auth.uid())
   where r.id = p_room and (select auth.uid()) is not null
$$;

-- Сообщения комнаты. Скрытые видит только создатель, остальным — пометка без текста.
create function public.room_messages_list(p_room uuid, p_limit int default 200)
returns table (
  id uuid, sender_id uuid, sender_name text, kind text, body text, flag text, reply_to uuid, hidden boolean, created_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select x.id, x.sender_id, x.sender_name, x.kind, x.body, x.flag, x.reply_to, x.hidden, x.created_at
    from (
      select m.id, m.sender_id, p.name as sender_name, m.kind,
             case when m.hidden_at is null or r.creator_id = (select auth.uid()) then m.body else '' end as body,
             m.flag, m.reply_to, m.hidden_at is not null as hidden, m.created_at
        from public.room_messages m
        join public.rooms r on r.id = m.room_id
        left join public.profiles p on p.id = m.sender_id
       where m.room_id = p_room and public.room_can_enter(p_room)
       order by m.created_at desc
       limit least(greatest(coalesce(p_limit, 200), 1), 500)
    ) x
   order by x.created_at
$$;

-- Участники комнаты (кто хоть раз заходил): имена, роли, поднятые руки.
create function public.room_people(p_room uuid)
returns table (user_id uuid, name text, role text, hand boolean, muted boolean, banned boolean)
language sql stable security definer set search_path = ''
as $$
  select m.user_id, p.name, m.role, m.hand_at is not null, m.voice_muted_at is not null, m.banned_at is not null
    from public.room_members m
    left join public.profiles p on p.id = m.user_id
   where m.room_id = p_room and public.room_can_enter(p_room)
$$;

-- Заявки на встречу (только для создателя).
create function public.room_request_list(p_room uuid)
returns table (user_id uuid, name text, status text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select q.user_id, p.name, q.status, q.created_at
    from public.room_requests q
    join public.rooms r on r.id = q.room_id
    left join public.profiles p on p.id = q.user_id
   where q.room_id = p_room and r.creator_id = (select auth.uid())
   order by q.created_at
$$;

-- Открытые жалобы и случаи от модератора (только для создателя).
create function public.room_report_list(p_room uuid)
returns table (id uuid, source text, reporter_name text, target_id uuid, target_name text, message_id uuid, message_body text, reason text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select x.id, x.source, rp.name, x.target_id, tp.name, x.message_id, msg.body, x.reason, x.created_at
    from public.room_reports x
    join public.rooms r on r.id = x.room_id
    left join public.profiles rp on rp.id = x.reporter_id
    left join public.profiles tp on tp.id = x.target_id
    left join public.room_messages msg on msg.id = x.message_id
   where x.room_id = p_room and r.creator_id = (select auth.uid()) and x.resolved_at is null
   order by x.created_at desc
   limit 50
$$;

/* ---------- Сообщения ---------- */

create function public.send_room_message(p_room uuid, p_body text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  b text := left(btrim(coalesce(p_body, '')), 2000);
  mid uuid;
begin
  if public.room_access(p_room) <> 'ok' then raise exception 'forbidden'; end if;
  if b = '' then raise exception 'empty'; end if;
  -- Не больше 20 сообщений за минуту от одного человека.
  if (select count(*) from public.room_messages where sender_id = me and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'too many';
  end if;
  insert into public.room_members (room_id, user_id) values (p_room, me)
  on conflict (room_id, user_id) do update set last_seen_at = now();
  insert into public.room_messages (room_id, sender_id, body) values (p_room, me, b) returning id into mid;
  update public.rooms set last_activity_at = now() where id = p_room;
  return mid;
end;
$$;

/* ---------- Действия создателя ---------- */

create function public.room_is_creator(p_room uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.rooms where id = p_room and creator_id = (select auth.uid()) and ended_at is null) $$;

create function public.hide_room_message(p_message uuid, p_hidden boolean default true)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  rid uuid;
begin
  select room_id into rid from public.room_messages where id = p_message and kind = 'user';
  if rid is null or not public.room_is_creator(rid) then raise exception 'forbidden'; end if;
  update public.room_messages set hidden_at = case when p_hidden then now() end where id = p_message;
  update public.room_reports set resolved_at = now() where message_id = p_message and resolved_at is null and p_hidden;
  return rid;
end;
$$;

-- Удалить участника: он больше не сможет войти в эту комнату.
create function public.kick_room_member(p_room uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.room_is_creator(p_room) or p_user = (select auth.uid()) then raise exception 'forbidden'; end if;
  insert into public.room_members (room_id, user_id, banned_at, role) values (p_room, p_user, now(), 'listener')
  on conflict (room_id, user_id) do update set banned_at = now(), role = 'listener', hand_at = null;
  update public.room_reports set resolved_at = now() where room_id = p_room and target_id = p_user and resolved_at is null;
end;
$$;

-- Отключить или вернуть микрофон участнику.
create function public.mute_room_member(p_room uuid, p_user uuid, p_muted boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.room_is_creator(p_room) or p_user = (select auth.uid()) then raise exception 'forbidden'; end if;
  update public.room_members set voice_muted_at = case when p_muted then now() end where room_id = p_room and user_id = p_user;
end;
$$;

-- Сделать участника спикером или вернуть в слушатели. Спикеров не больше лимита комнаты.
create function public.set_room_speaker(p_room uuid, p_user uuid, p_speaker boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  lim int;
begin
  if not public.room_is_creator(p_room) then raise exception 'forbidden'; end if;
  select max_speakers into lim from public.rooms where id = p_room;
  if p_speaker and (select count(*) from public.room_members where room_id = p_room and role = 'speaker' and user_id <> p_user) >= lim then
    raise exception 'speakers full';
  end if;
  update public.room_members set role = case when p_speaker then 'speaker' else 'listener' end, hand_at = null
   where room_id = p_room and user_id = p_user and banned_at is null;
end;
$$;

create function public.set_room_max_speakers(p_room uuid, p_max int)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.room_is_creator(p_room) then raise exception 'forbidden'; end if;
  update public.rooms set max_speakers = least(greatest(coalesce(p_max, 5), 1), 20) where id = p_room;
end;
$$;

-- Поднять или опустить руку (попросить слово).
create function public.raise_room_hand(p_room uuid, p_raise boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if public.room_access(p_room) <> 'ok' then raise exception 'forbidden'; end if;
  update public.room_members set hand_at = case when p_raise then now() end
   where room_id = p_room and user_id = (select auth.uid()) and role = 'listener';
end;
$$;

create function public.end_room(p_room uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.room_is_creator(p_room) then raise exception 'forbidden'; end if;
  update public.rooms set ended_at = now() where id = p_room;
end;
$$;

/* ---------- Заявки ---------- */

create function public.request_room(p_room uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  r public.rooms;
  st text;
begin
  select * into r from public.rooms where id = p_room;
  if me is null or r.id is null or r.ended_at is not null or r.access <> 'request' or r.creator_id = me then
    raise exception 'forbidden';
  end if;
  if exists (select 1 from public.room_members where room_id = p_room and user_id = me and banned_at is not null) then
    raise exception 'forbidden';
  end if;
  insert into public.room_requests (room_id, user_id) values (p_room, me)
  on conflict (room_id, user_id) do nothing;
  select status into st from public.room_requests where room_id = p_room and user_id = me;
  return st;
end;
$$;

create function public.decide_room_request(p_room uuid, p_user uuid, p_approve boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.room_is_creator(p_room) then raise exception 'forbidden'; end if;
  update public.room_requests set status = case when p_approve then 'approved' else 'declined' end, decided_at = now()
   where room_id = p_room and user_id = p_user;
end;
$$;

/* ---------- Жалобы ---------- */

create function public.report_room_member(p_room uuid, p_target uuid, p_reason text, p_message uuid default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  rid uuid;
begin
  if public.room_access(p_room) <> 'ok' or p_target = me then raise exception 'forbidden'; end if;
  if (select count(*) from public.room_reports where reporter_id = me and created_at > now() - interval '10 minutes') >= 10 then
    raise exception 'too many';
  end if;
  insert into public.room_reports (room_id, reporter_id, target_id, message_id, reason, source)
  values (p_room, me, p_target,
          (select id from public.room_messages where id = p_message and room_id = p_room),
          left(btrim(coalesce(p_reason, '')), 300), 'user')
  returning id into rid;
  return rid;
end;
$$;

create function public.resolve_room_report(p_report uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  rid uuid;
begin
  select room_id into rid from public.room_reports where id = p_report;
  if rid is null or not public.room_is_creator(rid) then raise exception 'forbidden'; end if;
  update public.room_reports set resolved_at = now() where id = p_report;
end;
$$;

/* ---------- Права на функции ---------- */

do $grants$
declare
  f text;
begin
  foreach f in array array[
    'room_access(uuid)', 'room_can_enter(uuid)', 'room_is_creator(uuid)',
    'create_room(text, text, text, boolean, timestamptz, text, int)', 'enter_room(uuid)', 'room_info(uuid)',
    'room_messages_list(uuid, int)', 'room_people(uuid)', 'room_request_list(uuid)', 'room_report_list(uuid)',
    'send_room_message(uuid, text)', 'hide_room_message(uuid, boolean)', 'kick_room_member(uuid, uuid)',
    'mute_room_member(uuid, uuid, boolean)', 'set_room_speaker(uuid, uuid, boolean)', 'set_room_max_speakers(uuid, int)',
    'raise_room_hand(uuid, boolean)', 'end_room(uuid)', 'request_room(uuid)', 'decide_room_request(uuid, uuid, boolean)',
    'report_room_member(uuid, uuid, text, uuid)', 'resolve_room_report(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end
$grants$;
