-- Записи по встрече в трёх уровнях доступа.
--
-- 1. Личная запись психолога (session_notes): тема, состояние клиента, гипотезы, вопросы на следующий раз
--    и черновик итога. Видит только автор. Клиенту не показывается и не отправляется никогда:
--    у таблицы нет ни одного правила чтения для клиента.
-- 2. Итог встречи (sessions.summary): клиент видит его только после того, как психолог нажал
--    «Поделиться с клиентом» (share_summary). До этого текст итога живёт в session_notes.summary_draft.
--    Завершение встречи (finish_session) само ничего клиенту не отправляет.
-- 3. Задания (assignments): назначает психолог, клиент отмечает выполнение и пишет обратную связь.
--    Переписка по заданию хранится в ветке задания (assignment_replies), а не в общем чате.

/* ---------- 1. Личная запись психолога ---------- */

create table public.session_notes (
  session_id uuid primary key references public.sessions (id) on delete cascade,
  psychologist_id uuid not null default auth.uid() references public.psychologists (user_id) on delete cascade,
  client_id uuid not null references auth.users (id) on delete cascade,
  template text not null default 'free' check (template in ('free', 'cbt')),
  topic text check (topic is null or char_length(topic) <= 300),
  -- Состояние клиента по оценке психолога: 0 — очень тяжело, 10 — очень хорошо.
  client_state int check (client_state is null or client_state between 0 and 10),
  -- Поля шаблона: свободная форма — body; КПТ — agenda, homework, thoughts, feedback.
  fields jsonb not null default '{}' check (jsonb_typeof(fields) = 'object' and pg_column_size(fields) <= 40000),
  hypotheses text check (hypotheses is null or char_length(hypotheses) <= 4000),
  next_questions text check (next_questions is null or char_length(next_questions) <= 4000),
  -- Черновик итога для клиента. Пока психолог не поделился, клиент его не видит.
  summary_draft text check (summary_draft is null or char_length(summary_draft) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index session_notes_client_idx on public.session_notes (psychologist_id, client_id, updated_at desc);
alter table public.session_notes enable row level security;
create policy "session notes own" on public.session_notes
  for all to authenticated
  using (psychologist_id = (select auth.uid()) and public.psy_active((select auth.uid())))
  with check (
    psychologist_id = (select auth.uid()) and public.psy_active((select auth.uid()))
    and exists (
      select 1 from public.sessions s
      where s.id = session_notes.session_id and s.psychologist_id = (select auth.uid()) and s.client_id = session_notes.client_id
    )
  );
revoke all on public.session_notes from anon;

/* ---------- 2. Итог встречи: клиент видит только после «Поделиться» ---------- */

alter table public.sessions
  add column summary_shared_at timestamptz,
  add column summary_edited_at timestamptz;

-- Итоги, сохранённые раньше, уходили клиенту сразу: считаем их отправленными.
update public.sessions set summary_shared_at = updated_at where summary is not null and summary_shared_at is null;

-- Завершить встречу без отправки чего-либо клиенту.
create function public.finish_session(p_session uuid)
returns void
language plpgsql security definer set search_path = ''
as $f$
declare
  x public.sessions;
begin
  select * into x from public.sessions where id = p_session for update;
  if x.id is null or x.psychologist_id is distinct from auth.uid() then raise exception 'forbidden'; end if;
  if x.status = 'cancelled' then raise exception 'cancelled'; end if;
  if x.starts_at > now() then raise exception 'not started'; end if;
  if x.status = 'scheduled' then
    update public.sessions set status = 'completed', updated_at = now() where id = p_session;
    perform public.log_event('session.finished', x.client_id, x.psychologist_id, jsonb_build_object('session', p_session));
  end if;
end;
$f$;

-- Поделиться итогом с клиентом. Повторный вызов с другим текстом — исправление: клиент видит пометку «изменено».
create function public.share_summary(p_session uuid, p_summary text)
returns void
language plpgsql security definer set search_path = ''
as $f$
declare
  x public.sessions;
  body text := nullif(left(trim(p_summary), 4000), '');
begin
  select * into x from public.sessions where id = p_session for update;
  if x.id is null or x.psychologist_id is distinct from auth.uid() then raise exception 'forbidden'; end if;
  if not public.psy_active(auth.uid()) then raise exception 'forbidden'; end if;
  if x.status = 'cancelled' then raise exception 'cancelled'; end if;
  if x.starts_at > now() then raise exception 'not started'; end if;
  if body is null then raise exception 'empty'; end if;
  if x.summary_shared_at is null then
    update public.sessions
       set summary = body, summary_shared_at = now(), status = 'completed', updated_at = now()
     where id = p_session;
    perform public.log_event('summary.shared', x.client_id, x.psychologist_id, jsonb_build_object('session', p_session));
  elsif body is distinct from x.summary then
    update public.sessions set summary = body, summary_edited_at = now(), updated_at = now() where id = p_session;
    perform public.log_event('summary.edited', x.client_id, x.psychologist_id, jsonb_build_object('session', p_session));
  end if;
end;
$f$;

/* ---------- 3. Задания и обратная связь ---------- */

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (user_id) on delete cascade,
  client_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  details text check (details is null or char_length(details) <= 4000),
  due_on date,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assignments_client_idx on public.assignments (client_id, created_at desc);
create index assignments_psychologist_idx on public.assignments (psychologist_id, client_id, created_at desc);
alter table public.assignments enable row level security;
-- Клиент видит свои задания (кроме снятых), психолог — те, что назначил сам.
create policy "assignments participants" on public.assignments
  for select to authenticated
  using (
    (client_id = (select auth.uid()) and status <> 'cancelled')
    or (psychologist_id = (select auth.uid()) and public.psy_active((select auth.uid())))
  );
revoke all on public.assignments from anon;
revoke insert, update, delete on public.assignments from authenticated;

create table public.assignment_replies (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index assignment_replies_idx on public.assignment_replies (assignment_id, created_at);
alter table public.assignment_replies enable row level security;
-- Ветку видит тот, кто видит само задание (правило задания проверяется внутри подзапроса).
create policy "assignment replies participants" on public.assignment_replies
  for select to authenticated
  using (exists (select 1 from public.assignments a where a.id = assignment_replies.assignment_id));
revoke all on public.assignment_replies from anon;
revoke insert, update, delete on public.assignment_replies from authenticated;

-- Психолог назначает задание своему клиенту (по встрече или без неё).
create function public.assign_task(p_client uuid, p_title text, p_details text default null, p_due date default null, p_session uuid default null)
returns uuid
language plpgsql security definer set search_path = ''
as $f$
declare
  me uuid := auth.uid();
  v_title text := nullif(left(trim(p_title), 200), '');
  tid uuid;
begin
  if not public.is_my_client(p_client) then raise exception 'forbidden'; end if;
  if v_title is null then raise exception 'empty'; end if;
  if p_session is not null and not exists (
    select 1 from public.sessions s where s.id = p_session and s.psychologist_id = me and s.client_id = p_client
  ) then raise exception 'forbidden'; end if;
  if (select count(*) from public.assignments a where a.psychologist_id = me and a.client_id = p_client and a.status = 'open') >= 50 then
    raise exception 'too many';
  end if;
  insert into public.assignments (psychologist_id, client_id, session_id, title, details, due_on)
  values (me, p_client, p_session, v_title, nullif(left(trim(p_details), 4000), ''), p_due)
  returning id into tid;
  perform public.log_event('task.assigned', p_client, me, jsonb_build_object('task', tid));
  return tid;
end;
$f$;

-- Психолог правит задание или снимает его. Снятое задание клиент больше не видит.
create function public.update_task(p_task uuid, p_title text, p_details text default null, p_due date default null, p_cancel boolean default false)
returns void
language plpgsql security definer set search_path = ''
as $f$
declare
  a public.assignments;
  v_title text := nullif(left(trim(p_title), 200), '');
begin
  select * into a from public.assignments where id = p_task for update;
  if a.id is null or a.psychologist_id is distinct from auth.uid() or not public.psy_active(auth.uid()) then raise exception 'forbidden'; end if;
  if p_cancel then
    update public.assignments set status = 'cancelled', updated_at = now() where id = p_task;
    return;
  end if;
  if v_title is null then raise exception 'empty'; end if;
  update public.assignments
     set title = v_title, details = nullif(left(trim(p_details), 4000), ''), due_on = p_due, updated_at = now()
   where id = p_task;
end;
$f$;

-- Клиент отмечает задание выполненным (или возвращает в работу) и может сразу описать, как прошло.
create function public.set_task_done(p_task uuid, p_done boolean, p_feedback text default null)
returns void
language plpgsql security definer set search_path = ''
as $f$
declare
  me uuid := auth.uid();
  a public.assignments;
  body text := nullif(left(trim(p_feedback), 2000), '');
begin
  select * into a from public.assignments where id = p_task for update;
  if a.id is null or a.client_id is distinct from me or a.status = 'cancelled' then raise exception 'forbidden'; end if;
  if p_done and a.status = 'open' then
    update public.assignments set status = 'done', done_at = now(), updated_at = now() where id = p_task;
    perform public.log_event('task.done', a.client_id, a.psychologist_id, jsonb_build_object('task', p_task));
  elsif not p_done and a.status = 'done' then
    update public.assignments set status = 'open', done_at = null, updated_at = now() where id = p_task;
  end if;
  if body is not null then
    insert into public.assignment_replies (assignment_id, author_id, body) values (p_task, me, body);
    -- Отдельное уведомление об отзыве не нужно, если психолог только что получил «выполнено».
    if not (p_done and a.status = 'open') then
      perform public.log_event('task.reply', a.client_id, a.psychologist_id, jsonb_build_object('task', p_task));
    end if;
  end if;
end;
$f$;

-- Сообщение в ветке задания: пишет клиент или психолог этого задания.
create function public.reply_task(p_task uuid, p_body text)
returns void
language plpgsql security definer set search_path = ''
as $f$
declare
  me uuid := auth.uid();
  a public.assignments;
  body text := nullif(left(trim(p_body), 2000), '');
begin
  select * into a from public.assignments where id = p_task;
  if a.id is null or a.status = 'cancelled' then raise exception 'forbidden'; end if;
  if me is distinct from a.client_id and not (me = a.psychologist_id and public.psy_active(me)) then raise exception 'forbidden'; end if;
  if body is null then raise exception 'empty'; end if;
  if (select count(*) from public.assignment_replies r where r.assignment_id = p_task) >= 200 then raise exception 'too many'; end if;
  insert into public.assignment_replies (assignment_id, author_id, body) values (p_task, me, body);
  perform public.log_event('task.reply', a.client_id, a.psychologist_id, jsonb_build_object('task', p_task));
end;
$f$;

/* ---------- Уведомления ---------- */

-- Новые события для второй стороны: итогом поделились, задание назначено, выполнено, ответ в ветке.
-- «session.finished» и «summary.edited» остаются только в журнале: о них отдельно не уведомляем.
create or replace function public.notify_from_audit()
returns trigger
language plpgsql security definer set search_path = ''
as $f$
declare
  target uuid;
  names jsonb;
begin
  if new.action not in (
    'link.requested', 'link.created', 'link.ended',
    'session.booked', 'session.rescheduled', 'session.cancelled', 'session.completed',
    'psychologist.reviewed',
    'summary.shared', 'task.assigned', 'task.done', 'task.reply'
  ) then
    return new;
  end if;
  names := jsonb_build_object(
    'client_name', (select p.name from public.profiles p where p.id = new.client_id),
    'psychologist_name', (select ps.full_name from public.psychologists ps where ps.user_id = new.psychologist_id)
  );
  foreach target in array array[new.client_id, new.psychologist_id] loop
    if target is not null and target is distinct from new.actor_id then
      insert into public.care_notifications (user_id, kind, actor_id, client_id, psychologist_id, details)
      values (target, new.action, new.actor_id, new.client_id, new.psychologist_id, new.details || jsonb_strip_nulls(names));
    end if;
  end loop;
  return new;
end;
$f$;

revoke execute on function public.finish_session(uuid) from public, anon;
revoke execute on function public.share_summary(uuid, text) from public, anon;
revoke execute on function public.assign_task(uuid, text, text, date, uuid) from public, anon;
revoke execute on function public.update_task(uuid, text, text, date, boolean) from public, anon;
revoke execute on function public.set_task_done(uuid, boolean, text) from public, anon;
revoke execute on function public.reply_task(uuid, text) from public, anon;
revoke execute on function public.notify_from_audit() from public, anon, authenticated;
