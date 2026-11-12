-- Видеоконсультации внутри «Опоры» и приватный ИИ-помощник психолога.
--
-- 1. Видеокомната встречи. Комната в LiveKit называется consult-<id встречи>-<video_epoch>.
--    Номер меняется при любом переносе, отмене или завершении, поэтому пропуск, выданный раньше,
--    ведёт в старую пустую комнату, где второго участника уже не будет.
-- 2. Обработка речи. Включается, только когда оба участника этой встречи дали согласие.
--    Любое изменение согласия меняет speech_ver: фрагменты, которые начали обрабатываться до отзыва,
--    база не примет (add_transcript сверяет номер).
-- 3. Расшифровка, подсказки, вопросы психолога и черновик итогов — только для психолога этой встречи.
--    Клиент видит лишь то, что психолог сам опубликовал в sessions.summary и sessions.tasks.
--    У всех этих записей есть срок хранения (expires_at); purge_consult_data удаляет просроченное.
-- 4. Напоминания и подтверждения: журнал отправленного (session_notifications) не даёт отправить
--    одно и то же письмо дважды, даже если задача запустилась повторно.

/* ---------- Встреча ---------- */

alter table public.sessions
  add column video_epoch int not null default 0,
  add column speech_ver int not null default 0;

-- Перенос, отмена, завершение: старые пропуски в видеокомнату больше не подходят.
create function public.sessions_video_epoch()
returns trigger
language plpgsql set search_path = ''
as $f$
begin
  if new.starts_at is distinct from old.starts_at or new.status is distinct from old.status then
    new.video_epoch := old.video_epoch + 1;
  end if;
  return new;
end;
$f$;
create trigger sessions_video_epoch before update on public.sessions
  for each row execute function public.sessions_video_epoch();

-- Часовой пояс клиента для писем и напоминаний (браузер сообщает его при записи).
alter table public.profiles
  add column if not exists timezone text check (timezone is null or char_length(timezone) <= 64);

/* ---------- Согласие на обработку речи ---------- */

create table public.consult_consents (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  granted boolean not null,
  changed_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
alter table public.consult_consents enable row level security;
-- Оба участника видят и своё согласие, и согласие собеседника: так каждый понимает, включена ли обработка.
create policy "consult consents participants" on public.consult_consents
  for select to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = consult_consents.session_id
      and ((select auth.uid()) in (s.client_id, s.psychologist_id))
  ));
revoke all on public.consult_consents from anon;
revoke insert, update, delete on public.consult_consents from authenticated;

create function public.set_speech_consent(p_session uuid, p_granted boolean)
returns int
language plpgsql security definer set search_path = ''
as $f$
declare
  me uuid := auth.uid();
  x public.sessions;
begin
  select * into x from public.sessions where id = p_session for update;
  if x.id is null or (me is distinct from x.client_id and me is distinct from x.psychologist_id) then
    raise exception 'forbidden';
  end if;
  -- Включить можно только у запланированной встречи; выключить — всегда.
  if p_granted and x.status <> 'scheduled' then raise exception 'not scheduled'; end if;
  insert into public.consult_consents (session_id, user_id, granted, changed_at)
  values (p_session, me, p_granted, now())
  on conflict (session_id, user_id) do update set granted = excluded.granted, changed_at = now();
  update public.sessions set speech_ver = speech_ver + 1 where id = p_session;
  return x.speech_ver + 1;
end;
$f$;

-- Номер «разрешения» на обработку речи сейчас, или null, если обработка не разрешена обоими.
create function public.speech_ticket(p_session uuid)
returns int
language sql stable security definer set search_path = ''
as $f$
  select s.speech_ver
  from public.sessions s
  where s.id = p_session
    and s.status = 'scheduled'
    and (select auth.uid()) in (s.client_id, s.psychologist_id)
    and exists (select 1 from public.consult_consents c where c.session_id = s.id and c.user_id = s.client_id and c.granted)
    and exists (select 1 from public.consult_consents c where c.session_id = s.id and c.user_id = s.psychologist_id and c.granted)
$f$;

/* ---------- Расшифровка (только психолог) ---------- */

create table public.consult_transcript (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  psychologist_id uuid not null references public.psychologists (user_id) on delete cascade,
  speaker text not null check (speaker in ('psychologist', 'client')),
  body text not null check (char_length(body) between 1 and 4000),
  said_at timestamptz not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index consult_transcript_session_idx on public.consult_transcript (session_id, said_at);
create index consult_transcript_expires_idx on public.consult_transcript (expires_at);
alter table public.consult_transcript enable row level security;
create policy "transcript own psychologist" on public.consult_transcript
  for select to authenticated
  using (psychologist_id = (select auth.uid()) and public.psy_active((select auth.uid())));
create policy "transcript own psychologist delete" on public.consult_transcript
  for delete to authenticated
  using (psychologist_id = (select auth.uid()));
revoke all on public.consult_transcript from anon;
revoke insert, update on public.consult_transcript from authenticated;

-- Фрагмент речи участника. Принимается, только если обработка разрешена обоими и с тех пор
-- согласие не менялось (p_ver — номер, полученный до начала обработки фрагмента).
create function public.add_transcript(p_session uuid, p_ver int, p_body text, p_said_at timestamptz, p_keep_days int default 30)
returns boolean
language plpgsql security definer set search_path = ''
as $f$
declare
  me uuid := auth.uid();
  x public.sessions;
begin
  select * into x from public.sessions where id = p_session;
  if x.id is null or (me is distinct from x.client_id and me is distinct from x.psychologist_id) then
    raise exception 'forbidden';
  end if;
  if public.speech_ticket(p_session) is distinct from p_ver then return false; end if;
  if coalesce(trim(p_body), '') = '' then return false; end if;
  insert into public.consult_transcript (session_id, psychologist_id, speaker, body, said_at, expires_at)
  values (p_session, x.psychologist_id, case when me = x.client_id then 'client' else 'psychologist' end,
          left(trim(p_body), 4000), coalesce(p_said_at, now()),
          greatest(x.ends_at, now()) + make_interval(days => least(greatest(coalesce(p_keep_days, 30), 1), 365)));
  return true;
end;
$f$;

/* ---------- Приватный диалог, подсказки, подготовка (только психолог) ---------- */

create table public.consult_ai_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  psychologist_id uuid not null default auth.uid() references public.psychologists (user_id) on delete cascade,
  kind text not null check (kind in ('question', 'answer', 'hint', 'prep')),
  body text not null check (char_length(body) between 1 and 8000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index consult_ai_messages_session_idx on public.consult_ai_messages (session_id, id);
create index consult_ai_messages_expires_idx on public.consult_ai_messages (expires_at);
alter table public.consult_ai_messages enable row level security;
create policy "assistant own select" on public.consult_ai_messages
  for select to authenticated
  using (psychologist_id = (select auth.uid()) and public.psy_active((select auth.uid())));
create policy "assistant own insert" on public.consult_ai_messages
  for insert to authenticated
  with check (psychologist_id = (select auth.uid()) and public.psy_active((select auth.uid()))
    and exists (select 1 from public.sessions s where s.id = consult_ai_messages.session_id and s.psychologist_id = (select auth.uid())));
create policy "assistant own delete" on public.consult_ai_messages
  for delete to authenticated
  using (psychologist_id = (select auth.uid()));
revoke all on public.consult_ai_messages from anon;
revoke update on public.consult_ai_messages from authenticated;

/* ---------- Черновик итогов (только психолог) ---------- */

-- Отдельно от sessions.summary/tasks: клиент получает только то, что психолог опубликует сам.
create table public.consult_drafts (
  session_id uuid primary key references public.sessions (id) on delete cascade,
  psychologist_id uuid not null default auth.uid() references public.psychologists (user_id) on delete cascade,
  body jsonb not null default '{}',
  source text not null default 'manual' check (source in ('manual', 'ai')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index consult_drafts_expires_idx on public.consult_drafts (expires_at);
alter table public.consult_drafts enable row level security;
create policy "drafts own" on public.consult_drafts
  for all to authenticated
  using (psychologist_id = (select auth.uid()) and public.psy_active((select auth.uid())))
  with check (psychologist_id = (select auth.uid()) and public.psy_active((select auth.uid()))
    and exists (select 1 from public.sessions s where s.id = consult_drafts.session_id and s.psychologist_id = (select auth.uid())));
revoke all on public.consult_drafts from anon;

-- Удаление просроченного. Вызывает задача по расписанию (ключ службы) раз в час.
create function public.purge_consult_data()
returns jsonb
language plpgsql security definer set search_path = ''
as $f$
declare
  t int; a int; d int;
begin
  delete from public.consult_transcript where expires_at < now();
  get diagnostics t = row_count;
  delete from public.consult_ai_messages where expires_at < now();
  get diagnostics a = row_count;
  delete from public.consult_drafts where expires_at < now();
  get diagnostics d = row_count;
  return jsonb_build_object('transcript', t, 'assistant', a, 'drafts', d);
end;
$f$;

/* ---------- Отправленные напоминания и подтверждения ---------- */

-- Один ключ — одно письмо. slot — время встречи (для напоминаний) или время события (для подтверждений):
-- после переноса у напоминаний новый ключ, а старые просто не наступят.
create table public.session_notifications (
  session_id uuid not null references public.sessions (id) on delete cascade,
  kind text not null check (kind in ('booked', 'rescheduled', 'cancelled', 'remind24', 'remind1')),
  recipient uuid not null references auth.users (id) on delete cascade,
  slot timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (session_id, kind, recipient, slot)
);
alter table public.session_notifications enable row level security;
revoke all on public.session_notifications from anon, authenticated;

revoke execute on function public.sessions_video_epoch() from public, anon, authenticated;
revoke execute on function public.set_speech_consent(uuid, boolean) from public, anon;
revoke execute on function public.speech_ticket(uuid) from public, anon;
revoke execute on function public.add_transcript(uuid, int, text, timestamptz, int) from public, anon;
revoke execute on function public.purge_consult_data() from public, anon, authenticated;
