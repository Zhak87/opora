-- Живые комнаты: постоянные тематические комнаты, ИИ-собеседники с меткой «ИИ», примеры разговоров,
-- общий бюджет на ИИ (на человека, комнату и весь сервис), сессии с их стоимостью и аналитика воронки.
-- Темы, персонажи и примеры задаются в src/lib/rooms/topics.ts, сервер сам переносит их сюда по slug
-- (повторный перенос обновляет строки, а не создаёт новые). Пользовательские комнаты работают как раньше.

/* ---------- Тематические комнаты ---------- */

-- У тематической комнаты нет человека-создателя: её заводит сервис.
alter table public.rooms alter column creator_id drop not null;
alter table public.rooms add column kind text not null default 'user' check (kind in ('user', 'topic'));
alter table public.rooms add column slug text unique;
alter table public.rooms add column sort int not null default 0;
-- Тексты карточки на трёх языках: {"ru": {"title", "description", "example"}, "kk": {...}, "en": {...}}
alter table public.rooms add column content jsonb not null default '{}'::jsonb;
alter table public.rooms add constraint rooms_kind_shape check (
  (kind = 'user' and creator_id is not null) or (kind = 'topic' and slug is not null)
);

-- ИИ-собеседники тематической комнаты. Это не психологи и не люди: в интерфейсе у них всегда метка «ИИ».
create table public.room_personas (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  slug text not null,
  sort int not null default 0,
  -- голос Gemini для «Слушать ИИ»
  voice text not null default 'Sulafat',
  -- {"ru": {"name", "style"}, "kk": {...}, "en": {...}}
  content jsonb not null default '{}'::jsonb,
  -- манера речи для модели (по-русски, в ответ попадает язык собеседника)
  manner text not null default '',
  active boolean not null default true,
  unique (room_id, slug)
);

-- Заранее подготовленный «Пример разговора» для первого входа: хранится в базе, ИИ его не генерирует.
-- lines: [{"who": "example" | "<slug персонажа>", "text": "..."}], who = example — пример того, что может написать человек.
create table public.room_samples (
  room_id uuid not null references public.rooms (id) on delete cascade,
  locale text not null check (locale in ('ru', 'kk', 'en')),
  lines jsonb not null default '[]'::jsonb,
  primary key (room_id, locale)
);

alter table public.room_personas enable row level security;
alter table public.room_samples enable row level security;
create policy "room personas visible" on public.room_personas for select to authenticated using (true);
create policy "room samples visible" on public.room_samples for select to authenticated using (true);
revoke insert, update, delete on public.room_personas, public.room_samples from anon, authenticated;

-- Сообщения ИИ-собеседников: kind = 'ai', persona_id — кто из персонажей ответил.
alter table public.room_messages drop constraint if exists room_messages_kind_check;
alter table public.room_messages add constraint room_messages_kind_check check (kind in ('user', 'moderator', 'ai'));
alter table public.room_messages add column persona_id uuid references public.room_personas (id) on delete set null;

/* ---------- Права модерации ---------- */

-- Модерировать пользовательскую комнату может её создатель, тематическую — сотрудники «Опоры».
create or replace function public.room_is_creator(p_room uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.rooms
     where id = p_room and ended_at is null
       and (creator_id = (select auth.uid()) or (kind = 'topic' and public.is_staff()))
  )
$$;

-- Тематическую комнату завершить нельзя: её закрывает только сервис (тема убрана из списка).
create or replace function public.end_room(p_room uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.room_is_creator(p_room) or exists (select 1 from public.rooms where id = p_room and kind = 'topic') then
    raise exception 'forbidden';
  end if;
  update public.rooms set ended_at = now() where id = p_room;
end;
$$;

create or replace function public.room_report_list(p_room uuid)
returns table (id uuid, source text, reporter_name text, target_id uuid, target_name text, message_id uuid, message_body text, reason text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select x.id, x.source, rp.name, x.target_id, tp.name, x.message_id, msg.body, x.reason, x.created_at
    from public.room_reports x
    left join public.profiles rp on rp.id = x.reporter_id
    left join public.profiles tp on tp.id = x.target_id
    left join public.room_messages msg on msg.id = x.message_id
   where x.room_id = p_room and public.room_is_creator(p_room) and x.resolved_at is null
   order by x.created_at desc
   limit 50
$$;

-- Комната и моя роль: добавлены вид комнаты, slug, тексты и право модерации.
drop function public.room_info(uuid);
create function public.room_info(p_room uuid)
returns table (
  id uuid, title text, description text, format text, access text, scheduled boolean, starts_at timestamptz,
  ended_at timestamptz, max_speakers int, creator_id uuid, creator_name text, is_creator boolean,
  my_role text, my_hand boolean, my_muted boolean, request_status text, pending_requests int,
  kind text, slug text, content jsonb, can_moderate boolean
)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.title, r.description, r.format, r.access, r.scheduled, r.starts_at, r.ended_at, r.max_speakers,
         r.creator_id, (select p.name from public.profiles p where p.id = r.creator_id),
         coalesce(r.creator_id = (select auth.uid()), false),
         m.role, m.hand_at is not null, m.voice_muted_at is not null,
         (select q.status from public.room_requests q where q.room_id = r.id and q.user_id = (select auth.uid())),
         case when r.creator_id = (select auth.uid())
              then (select count(*)::int from public.room_requests q where q.room_id = r.id and q.status = 'pending') else 0 end,
         r.kind, r.slug, r.content, public.room_is_creator(r.id)
    from public.rooms r
    left join public.room_members m on m.room_id = r.id and m.user_id = (select auth.uid())
   where r.id = p_room and (select auth.uid()) is not null
$$;

-- Сообщения комнаты: добавлен persona_id для ответов ИИ-собеседников.
drop function public.room_messages_list(uuid, int);
create function public.room_messages_list(p_room uuid, p_limit int default 200)
returns table (
  id uuid, sender_id uuid, sender_name text, kind text, body text, flag text, reply_to uuid, hidden boolean, created_at timestamptz,
  persona_id uuid
)
language sql stable security definer set search_path = ''
as $$
  select x.id, x.sender_id, x.sender_name, x.kind, x.body, x.flag, x.reply_to, x.hidden, x.created_at, x.persona_id
    from (
      select m.id, m.sender_id, p.name as sender_name, m.kind,
             case when m.hidden_at is null or public.room_is_creator(p_room) then m.body else '' end as body,
             m.flag, m.reply_to, m.hidden_at is not null as hidden, m.created_at, m.persona_id
        from public.room_messages m
        left join public.profiles p on p.id = m.sender_id
       where m.room_id = p_room and public.room_can_enter(p_room)
       order by m.created_at desc
       limit least(greatest(coalesce(p_limit, 200), 1), 500)
    ) x
   order by x.created_at
$$;

/* ---------- Бюджет ИИ в комнатах ---------- */

-- Расход за сутки (по времени Алматы) на весь сервис (scope = 'all'), комнату ('room:<id>') и человека ('user:<id>').
-- cost_micro — миллионные доли доллара. Пишет только сервер (service_role).
create table public.room_ai_spend (
  day date not null,
  scope text not null,
  tokens bigint not null default 0,
  tts_sec numeric not null default 0,
  replies int not null default 0,
  cost_micro bigint not null default 0,
  primary key (day, scope)
);
alter table public.room_ai_spend enable row level security;
revoke all on public.room_ai_spend from anon, authenticated;

-- Атомарно проверить и зарезервировать расход перед запросом к ИИ. Все проверки и записи идут под одной
-- блокировкой, поэтому параллельные запросы не проскочат лимит. Лимит 0 или отсутствие — без ограничения.
-- p_limits: {"all": {"usd", "tokens", "tts_sec", "replies"}, "room": {...}, "user": {...}}
create function public.room_ai_reserve(
  p_room uuid, p_user uuid, p_tokens int, p_tts_sec numeric, p_replies int, p_cost_micro bigint, p_limits jsonb
)
returns boolean
language plpgsql volatile security definer set search_path = ''
as $f$
declare
  v_day date := (now() at time zone 'Asia/Almaty')::date;
  v_scopes text[] := array['all', 'room:' || p_room::text] || case when p_user is null then array[]::text[] else array['user:' || p_user::text] end;
  v_keys text[] := array['all', 'room'] || case when p_user is null then array[]::text[] else array['user'] end;
  r public.room_ai_spend;
  l jsonb;
  i int;
begin
  perform pg_advisory_xact_lock(hashtext('opora_room_ai_budget'));
  for i in 1 .. array_length(v_scopes, 1) loop
    insert into public.room_ai_spend (day, scope) values (v_day, v_scopes[i]) on conflict do nothing;
    select * into r from public.room_ai_spend where day = v_day and scope = v_scopes[i];
    l := coalesce(p_limits -> v_keys[i], '{}'::jsonb);
    if coalesce((l ->> 'usd')::numeric, 0) > 0 and r.cost_micro + p_cost_micro > (l ->> 'usd')::numeric * 1000000 then return false; end if;
    if coalesce((l ->> 'tokens')::bigint, 0) > 0 and r.tokens + p_tokens > (l ->> 'tokens')::bigint then return false; end if;
    if coalesce((l ->> 'tts_sec')::numeric, 0) > 0 and r.tts_sec + p_tts_sec > (l ->> 'tts_sec')::numeric then return false; end if;
    if coalesce((l ->> 'replies')::int, 0) > 0 and r.replies + p_replies > (l ->> 'replies')::int then return false; end if;
  end loop;
  update public.room_ai_spend
     set tokens = tokens + p_tokens, tts_sec = tts_sec + p_tts_sec, replies = replies + p_replies, cost_micro = cost_micro + p_cost_micro
   where day = v_day and scope = any (v_scopes);
  return true;
end;
$f$;

-- После ответа ИИ: поправить резерв на фактический расход (разница может быть отрицательной — возврат).
create function public.room_ai_settle(p_room uuid, p_user uuid, p_tokens int, p_tts_sec numeric, p_replies int, p_cost_micro bigint)
returns void
language sql volatile security definer set search_path = ''
as $f$
  update public.room_ai_spend
     set tokens = greatest(tokens + p_tokens, 0), tts_sec = greatest(tts_sec + p_tts_sec, 0),
         replies = greatest(replies + p_replies, 0), cost_micro = greatest(cost_micro + p_cost_micro, 0)
   where day = (now() at time zone 'Asia/Almaty')::date
     and scope = any (array['all', 'room:' || p_room::text] || case when p_user is null then array[]::text[] else array['user:' || p_user::text] end)
$f$;

/* ---------- Сессии комнат ---------- */

-- Сессия — время, пока в комнате есть хотя бы один человек. Нужна для «стоимости активной сессии».
create table public.room_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  people int not null default 0,
  human_messages int not null default 0,
  ai_replies int not null default 0,
  tokens bigint not null default 0,
  tts_sec numeric not null default 0,
  cost_micro bigint not null default 0
);
create index room_sessions_room_idx on public.room_sessions (room_id, started_at desc);
create index room_sessions_time_idx on public.room_sessions (started_at);
alter table public.room_sessions enable row level security;
revoke all on public.room_sessions from anon, authenticated;

/* ---------- Аналитика ---------- */

create or replace function public.track_event(p_name text, p_visitor text, p_props jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer set search_path = ''
as $f$
begin
  if p_name not in (
    'landing_view', 'guide_start', 'guide_complete', 'trial_start', 'signup_start', 'signup_complete',
    'app_open', 'chat_start', 'chat_reply', 'chat_rated', 'step_offered', 'step_taken', 'practice_start', 'practice_complete', 'journal_entry',
    'need_pick', 'room_view', 'room_join', 'room_create', 'psychologist_view', 'contact_request', 'practice_feel',
    'dream_saved', 'dream_storyboard', 'dream_panel', 'dream_reflect', 'dream_similarity',
    'practice_open', 'practice_session_end', 'practice_exit', 'practice_restart',
    'room_card_view', 'room_first_message', 'room_starter', 'room_listen_ai'
  ) then
    return;
  end if;
  if p_visitor is not null and p_visitor !~ '^[0-9a-f-]{36}$' then
    p_visitor := null;
  end if;
  if p_visitor is null and (select auth.uid()) is null then
    return;
  end if;
  if pg_column_size(coalesce(p_props, '{}'::jsonb)) > 400 then
    p_props := '{}'::jsonb;
  end if;
  insert into public.product_events (name, visitor, user_id, props)
  values (p_name, p_visitor, (select auth.uid()), coalesce(p_props, '{}'::jsonb));
end;
$f$;
revoke execute on function public.track_event(text, text, jsonb) from public;
grant execute on function public.track_event(text, text, jsonb) to anon, authenticated;

-- Отчёт по комнатам для сотрудников: просмотр карточки → вход → первое сообщение → повторный визит,
-- плюс сессии и их стоимость. Люди считаются по visitor или аккаунту; тексты сообщений сюда не попадают.
create function public.rooms_report(p_days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $f$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'rooms', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.sort, t.title)
      from (
        select r.id, r.slug, r.title, r.sort,
               (select count(distinct coalesce(e.user_id::text, e.visitor)) from public.product_events e
                 where e.created_at >= v_since and e.name = 'room_card_view' and e.props ->> 'room' = r.id::text) as card_views,
               (select count(distinct coalesce(e.user_id::text, e.visitor)) from public.product_events e
                 where e.created_at >= v_since and e.name = 'room_join' and e.props ->> 'room' = r.id::text) as joined,
               (select count(distinct e.user_id) from public.product_events e
                 where e.created_at >= v_since and e.name = 'room_first_message' and e.props ->> 'room' = r.id::text) as first_message,
               (select count(*) from (
                  select e.user_id from public.product_events e
                   where e.created_at >= v_since and e.name = 'room_join' and e.props ->> 'room' = r.id::text and e.user_id is not null
                   group by e.user_id having count(distinct (e.created_at at time zone 'Asia/Almaty')::date) >= 2
                ) x) as returned,
               (select count(*) from public.room_sessions s where s.room_id = r.id and s.started_at >= v_since) as sessions,
               (select count(*) from public.room_sessions s where s.room_id = r.id and s.started_at >= v_since and s.human_messages > 0) as talks,
               (select coalesce(sum(s.ai_replies), 0) from public.room_sessions s where s.room_id = r.id and s.started_at >= v_since) as ai_replies,
               (select round(coalesce(sum(s.cost_micro), 0) / 1000000.0, 4) from public.room_sessions s where s.room_id = r.id and s.started_at >= v_since) as cost_usd,
               (select round(coalesce(avg(s.cost_micro) filter (where s.human_messages > 0), 0) / 1000000.0, 5) from public.room_sessions s where s.room_id = r.id and s.started_at >= v_since) as cost_per_talk_usd
          from public.rooms r
         where r.kind = 'topic'
      ) t
    ), '[]'::jsonb),
    'spend', coalesce((
      select jsonb_agg(jsonb_build_object('day', s.day, 'tokens', s.tokens, 'tts_sec', s.tts_sec, 'replies', s.replies,
                                          'usd', round(s.cost_micro / 1000000.0, 4)) order by s.day desc)
        from public.room_ai_spend s
       where s.scope = 'all' and s.day >= (v_since at time zone 'Asia/Almaty')::date
    ), '[]'::jsonb)
  );
end;
$f$;

/* ---------- Права на функции ---------- */

do $grants$
declare
  f text;
begin
  foreach f in array array['room_info(uuid)', 'room_messages_list(uuid, int)', 'room_is_creator(uuid)', 'end_room(uuid)', 'room_report_list(uuid)', 'rooms_report(int)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
  foreach f in array array['room_ai_reserve(uuid, uuid, int, numeric, int, bigint, jsonb)', 'room_ai_settle(uuid, uuid, int, numeric, int, bigint)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end
$grants$;
