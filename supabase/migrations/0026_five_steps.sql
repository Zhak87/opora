-- Собеседник v3, этап 2: программа «Пять шагов», опросники PHQ-9 и GAD-7 как самонаблюдение,
-- сопровождение психолога и метрики для команды (документ «ИИ-собеседник v3», разделы 7, 9, 11).

/* ---------- Опросники ---------- */

create table public.screenings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('phq9', 'gad7')),
  answers smallint[] not null check (
    (kind = 'phq9' and cardinality(answers) = 9 or kind = 'gad7' and cardinality(answers) = 7)
    and 0 <= all (answers) and 3 >= all (answers)
  ),
  score smallint not null check (score between 0 and 27),
  step smallint check (step between 1 and 6),
  program_id uuid,
  created_at timestamptz not null default now()
);
create index screenings_user_idx on public.screenings (user_id, created_at desc);
alter table public.screenings enable row level security;
create policy "own screenings select" on public.screenings for select to authenticated using (user_id = (select auth.uid()));
create policy "own screenings insert" on public.screenings for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own screenings delete" on public.screenings for delete to authenticated using (user_id = (select auth.uid()));

/* ---------- Программа «Пять шагов» ---------- */

-- step: 1–5 — шаги программы, 6 — проверка через месяц. progress: {"1": {"started_at", "task_done", "task_note"}, ...}.
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'done', 'stopped')),
  step smallint not null default 1 check (step between 1 and 6),
  goal text check (char_length(goal) <= 1000),
  wish text check (char_length(wish) <= 1000),
  guided boolean not null default false,
  safety_ok_at timestamptz,
  progress jsonb not null default '{}'::jsonb check (jsonb_typeof(progress) = 'object' and pg_column_size(progress) < 16384),
  handoff text check (char_length(handoff) <= 4000),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index programs_user_idx on public.programs (user_id, created_at desc);
-- Одновременно идёт не больше одной программы.
create unique index programs_one_active on public.programs (user_id) where status = 'active';
alter table public.programs enable row level security;
create policy "own programs select" on public.programs for select to authenticated using (user_id = (select auth.uid()));
create policy "own programs insert" on public.programs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own programs update" on public.programs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own programs delete" on public.programs for delete to authenticated using (user_id = (select auth.uid()));

alter table public.screenings add constraint screenings_program_fk foreign key (program_id) references public.programs (id) on delete set null;

revoke all on public.screenings, public.programs from anon;

-- Разговор, начатый с шага программы.
alter table public.conversations drop constraint if exists conversations_mode_check;
alter table public.conversations add constraint conversations_mode_check check (mode in ('talk', 'topic', 'hope', 'journal', 'program'));

/* ---------- Чтение психологом (сопровождение) ---------- */
-- Психолог видит динамику опросников и выполнение заданий только при активной связи и согласии «Самочувствие».
-- Переписку с Опорой он по-прежнему видит только по отдельному согласию ai_chats.

create function public.client_screenings(p_client uuid)
returns table (kind text, score smallint, step smallint, item9 smallint, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $f$
begin
  if not public.can_view(p_client, 'wellbeing') then raise exception 'forbidden'; end if;
  return query
    select s.kind, s.score, s.step, case when s.kind = 'phq9' then s.answers[9] end, s.created_at from public.screenings s
     where s.user_id = p_client order by s.created_at desc limit 40;
end;
$f$;

create function public.client_program(p_client uuid)
returns table (status text, step smallint, goal text, wish text, guided boolean, progress jsonb, started_at timestamptz, finished_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $f$
begin
  if not public.can_view(p_client, 'wellbeing') then raise exception 'forbidden'; end if;
  return query
    select p.status, p.step, p.goal, p.wish, p.guided, p.progress, p.started_at, p.finished_at from public.programs p
     where p.user_id = p_client and p.status <> 'stopped' order by p.created_at desc limit 1;
end;
$f$;

revoke execute on function public.client_screenings(uuid) from public, anon;
revoke execute on function public.client_program(uuid) from public, anon;
grant execute on function public.client_screenings(uuid) to authenticated;
grant execute on function public.client_program(uuid) to authenticated;

/* ---------- Метрики для команды (раздел 11) ---------- */
-- Только сотрудникам и только агрегаты, без текстов разговоров и без имён.

create function public.companion_report(p_days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $f$
declare
  v_from timestamptz := now() - make_interval(days => greatest(1, least(p_days, 365)));
  v_result jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  with r as (
    select m.conversation_id, m.created_at, m.meta -> 'route' as route
      from public.messages m
     where m.role = 'assistant' and m.created_at >= v_from and m.meta ? 'route'
  ),
  sessions as (
    select conversation_id,
           (array_agg((route ->> 'score')::int order by created_at) filter (where route ? 'score'))[1] as first_score,
           (array_agg((route ->> 'score')::int order by created_at desc) filter (where route ? 'score'))[1] as last_score,
           count(*) filter (where route ? 'score') as scored,
           max((route ->> 'phase')::int) as max_phase,
           bool_or(route ->> 'risk' = 'acute') as acute
      from r group by conversation_id
  )
  select jsonb_build_object(
    'days', p_days,
    'replies', (select count(*) from r),
    'sessions', (select count(*) from sessions),
    'scored_sessions', (select count(*) from sessions where scored >= 2 and first_score is not null),
    'avg_change', (select round(avg(last_score - first_score)::numeric, 2) from sessions where scored >= 2),
    'reached_takeaway', (select count(*) from sessions where max_phase >= 9),
    'acute_sessions', (select count(*) from sessions where acute),
    'focus', coalesce((select jsonb_agg(jsonb_build_object('focus', f, 'n', n) order by n desc)
      from (select route ->> 'focus' as f, count(*) as n from r where route ? 'focus' group by 1) x), '[]'::jsonb),
    'practices', coalesce((select jsonb_agg(jsonb_build_object('practice', p, 'n', n) order by n desc)
      from (select route ->> 'practice' as p, count(distinct conversation_id) as n from r
             where route ->> 'practice' is not null and route ->> 'practice' <> 'none' group by 1) x), '[]'::jsonb),
    'insights_saved', (select count(*) from public.journal_entries where kind = 'insight' and created_at >= v_from),
    'programs', jsonb_build_object(
      'started', (select count(*) from public.programs where created_at >= v_from),
      'by_step', coalesce((select jsonb_object_agg(step, n) from (select step, count(*) as n from public.programs where created_at >= v_from group by step) x), '{}'::jsonb),
      'reached_5', (select count(*) from public.programs where created_at >= v_from and step >= 5),
      'guided', (select count(*) from public.programs where created_at >= v_from and guided)
    ),
    -- Изменение PHQ-9 и GAD-7 у дошедших до пятого шага и у бросивших: первый и последний опросник в программе.
    'scales', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'group', grp, 'people', n, 'first', f, 'last', l)) from (
      select s.kind, case when p.step >= 5 then 'reached' else 'dropped' end as grp, count(distinct p.id) as n,
             round(avg(fs.score)::numeric, 1) as f, round(avg(ls.score)::numeric, 1) as l
        from public.programs p
        join lateral (select kind from (values ('phq9'), ('gad7')) k(kind)) s on true
        join lateral (select score from public.screenings x where x.program_id = p.id and x.kind = s.kind order by created_at limit 1) fs on true
        join lateral (select score from public.screenings x where x.program_id = p.id and x.kind = s.kind order by created_at desc limit 1) ls on true
       where p.created_at >= v_from and (p.status <> 'active' or p.step >= 5)
       group by s.kind, grp
    ) y), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$f$;
revoke execute on function public.companion_report(int) from public, anon;
grant execute on function public.companion_report(int) to authenticated;
