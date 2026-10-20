-- Этап 5: ИИ-аналитика для психолога и его рабочие заметки.
-- Материал для аналитики собирает только база и только из того, на что клиент дал согласие.
-- Отчёт — вспомогательная сводка, не диагноз; создание отчёта попадает в журнал, который видит клиент.

/* ---------- Заметки психолога ---------- */

-- Рабочие записи специалиста: заметки, гипотезы, подготовка и итоги встреч для себя.
-- Клиент их не видит (то, что видит клиент, — итоги встречи в sessions.summary).
create table public.psychologist_notes (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null default auth.uid() references public.psychologists (user_id) on delete cascade,
  client_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  kind text not null default 'note' check (kind in ('note', 'hypothesis', 'session', 'plan')),
  body text not null check (char_length(body) between 1 and 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index psychologist_notes_client_idx on public.psychologist_notes (psychologist_id, client_id, created_at desc);
alter table public.psychologist_notes enable row level security;
create policy "notes own select" on public.psychologist_notes for select to authenticated
  using (psychologist_id = (select auth.uid()));
create policy "notes own insert" on public.psychologist_notes for insert to authenticated
  with check (psychologist_id = (select auth.uid()) and public.is_my_client(client_id)
    and (session_id is null or exists (select 1 from public.sessions s where s.id = session_id and s.psychologist_id = (select auth.uid()) and s.client_id = client_id)));
create policy "notes own update" on public.psychologist_notes for update to authenticated
  using (psychologist_id = (select auth.uid())) with check (psychologist_id = (select auth.uid()));
create policy "notes own delete" on public.psychologist_notes for delete to authenticated
  using (psychologist_id = (select auth.uid()));

/* ---------- ИИ-отчёты ---------- */

create table public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (user_id) on delete cascade,
  client_id uuid not null references auth.users (id) on delete cascade,
  period_from date not null,
  period_to date not null,
  scopes text[] not null,
  provider text,
  report jsonb not null,
  created_at timestamptz not null default now()
);
create index ai_reports_client_idx on public.ai_reports (psychologist_id, client_id, created_at desc);
alter table public.ai_reports enable row level security;
-- Видит только автор и только пока работает с клиентом и клиент не отозвал согласие на аналитику.
create policy "reports own" on public.ai_reports for select to authenticated
  using (psychologist_id = (select auth.uid()) and public.can_view(client_id, 'analytics'));
revoke insert, update, delete on public.ai_reports from anon, authenticated;

-- Материал для аналитики: только разрешённые клиентом виды данных за период.
-- Требует согласия analytics; каждый вид данных — ещё и своего согласия.
create function public.client_ai_material(p_client uuid, p_from date, p_to date)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  result jsonb := '{}';
  scopes text[] := '{}';
begin
  if not public.can_view(p_client, 'analytics') then raise exception 'forbidden'; end if;
  if p_to < p_from or p_to - p_from > 366 then raise exception 'bad period'; end if;

  if public.can_view(p_client, 'wellbeing') then
    scopes := array_append(scopes, 'wellbeing');
    result := result || jsonb_build_object(
      'checkins', coalesce((select jsonb_agg(jsonb_build_object('day', c.day, 'mood', c.mood, 'energy', c.energy, 'calm', c.calm, 'sleep', c.sleep, 'feelings', c.feelings, 'note', c.note) order by c.day)
                              from public.checkins c where c.user_id = p_client and c.day between p_from and p_to), '[]'),
      'balance', coalesce((select jsonb_agg(jsonb_build_object('at', a.created_at::date, 'answers', a.answers, 'note', a.note) order by a.created_at)
                              from public.self_assessments a where a.user_id = p_client and a.created_at::date <= p_to
                               and a.created_at::date >= p_from - 90), '[]'));
  end if;
  if public.can_view(p_client, 'goals') then
    scopes := array_append(scopes, 'goals');
    result := result || jsonb_build_object('goals', coalesce((
      select jsonb_agg(jsonb_build_object('title', g.title, 'why', g.why, 'status', g.status, 'progress', g.progress,
               'steps', (select coalesce(jsonb_agg(jsonb_build_object('at', u.created_at::date, 'note', u.note, 'progress', u.progress) order by u.created_at), '[]')
                           from public.goal_updates u where u.goal_id = g.id and u.created_at::date between p_from and p_to)))
        from public.goals g where g.user_id = p_client), '[]'));
  end if;
  if public.can_view(p_client, 'journal') then
    scopes := array_append(scopes, 'journal');
    result := result || jsonb_build_object('journal', coalesce((
      select jsonb_agg(jsonb_build_object('at', j.created_at::date, 'kind', j.kind, 'text', left(j.content, 1500)) order by j.created_at)
        from (select * from public.journal_entries where user_id = p_client and created_at::date between p_from and p_to order by created_at desc limit 60) j), '[]'));
  end if;
  if public.can_view(p_client, 'ai_chats') then
    scopes := array_append(scopes, 'ai_chats');
    -- Только слова самого клиента: ответы ИИ-собеседника в материал не идут.
    result := result || jsonb_build_object('ai_chats', coalesce((
      select jsonb_agg(jsonb_build_object('at', m.created_at::date, 'text', left(m.content, 800)) order by m.created_at)
        from (select * from public.messages where user_id = p_client and role = 'user' and created_at::date between p_from and p_to order by created_at desc limit 120) m), '[]'));
  end if;
  -- Итоги встреч, которые психолог сам оставил клиенту, — тоже контекст.
  result := result || jsonb_build_object('sessions', coalesce((
    select jsonb_agg(jsonb_build_object('at', s.starts_at::date, 'status', s.status, 'summary', s.summary, 'tasks', s.tasks) order by s.starts_at)
      from public.sessions s where s.client_id = p_client and s.psychologist_id = me and s.starts_at::date between p_from and p_to), '[]'));

  perform public.log_event('client.viewed', p_client, me, jsonb_build_object('what', 'analytics'));
  return jsonb_build_object('scopes', to_jsonb(scopes), 'data', result);
end;
$$;

-- Сохранить отчёт: снова проверяем согласие (его могли отозвать, пока ИИ думал).
create function public.save_ai_report(p_client uuid, p_from date, p_to date, p_scopes text[], p_provider text, p_report jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  rid uuid;
begin
  if not public.can_view(p_client, 'analytics') then raise exception 'forbidden'; end if;
  if pg_column_size(p_report) > 200000 then raise exception 'too large'; end if;
  insert into public.ai_reports (psychologist_id, client_id, period_from, period_to, scopes, provider, report)
  values (auth.uid(), p_client, p_from, p_to, coalesce(p_scopes, '{}'), left(p_provider, 60), p_report)
  returning id into rid;
  perform public.log_event('analytics.generated', p_client, auth.uid(), jsonb_build_object('from', p_from, 'to', p_to, 'scopes', p_scopes));
  return rid;
end;
$$;

revoke execute on function public.client_ai_material(uuid, date, date) from public, anon;
revoke execute on function public.save_ai_report(uuid, date, date, text[], text, jsonb) from public, anon;
