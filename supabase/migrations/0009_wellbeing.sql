-- Этап 4: отметки самочувствия, самооценка (колесо баланса) и личные цели клиента.
-- Это не клинические шкалы и не диагностика: человек сам отмечает, как он, а динамику видит он
-- и — только по отдельному согласию — его психолог (scope wellbeing и goals).

/* ---------- Самочувствие ---------- */

-- Одна отметка в день; повторная отметка в тот же день обновляет её.
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  mood smallint not null check (mood between 1 and 5),
  energy smallint check (energy between 1 and 5),
  calm smallint check (calm between 1 and 5),
  sleep smallint check (sleep between 1 and 5),
  feelings text[] not null default '{}' check (cardinality(feelings) <= 8),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);
create index checkins_user_day_idx on public.checkins (user_id, day desc);
alter table public.checkins enable row level security;
create policy "own checkins select" on public.checkins for select to authenticated using (user_id = (select auth.uid()));
create policy "own checkins insert" on public.checkins for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own checkins update" on public.checkins for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own checkins delete" on public.checkins for delete to authenticated using (user_id = (select auth.uid()));

/* ---------- Самооценка ---------- */

-- kind — вид самооценки. Пока один: balance — колесо баланса, 8 сфер жизни по шкале 0–10.
create table public.self_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null default 'balance' check (kind in ('balance')),
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index self_assessments_user_idx on public.self_assessments (user_id, created_at desc);
alter table public.self_assessments enable row level security;
create policy "own assessments select" on public.self_assessments for select to authenticated using (user_id = (select auth.uid()));
create policy "own assessments insert" on public.self_assessments for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own assessments delete" on public.self_assessments for delete to authenticated using (user_id = (select auth.uid()));

/* ---------- Цели ---------- */

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  why text check (char_length(why) <= 1000),
  status text not null default 'active' check (status in ('active', 'done', 'paused', 'dropped')),
  progress smallint not null default 0 check (progress between 0 and 100),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_user_idx on public.goals (user_id, created_at desc);
alter table public.goals enable row level security;
create policy "own goals select" on public.goals for select to authenticated using (user_id = (select auth.uid()));
create policy "own goals insert" on public.goals for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own goals update" on public.goals for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own goals delete" on public.goals for delete to authenticated using (user_id = (select auth.uid()));

-- Отметки о продвижении к цели: что сделал и на сколько теперь продвинулся.
create table public.goal_updates (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  note text check (char_length(note) <= 1000),
  progress smallint check (progress between 0 and 100),
  created_at timestamptz not null default now()
);
create index goal_updates_goal_idx on public.goal_updates (goal_id, created_at desc);
alter table public.goal_updates enable row level security;
create policy "own goal updates select" on public.goal_updates for select to authenticated using (user_id = (select auth.uid()));
create policy "own goal updates insert" on public.goal_updates for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid())));
create policy "own goal updates delete" on public.goal_updates for delete to authenticated using (user_id = (select auth.uid()));

/* ---------- Чтение психологом ---------- */
-- Психолог не получает прямого доступа к таблицам. Он читает данные клиента только через эти функции,
-- которые проверяют активную связь и согласие на вид данных и пишут просмотр в журнал, видимый клиенту.

create function public.client_checkins(p_client uuid, p_from date default null)
returns setof public.checkins
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.can_view(p_client, 'wellbeing') then raise exception 'forbidden'; end if;
  return query
    select * from public.checkins c
     where c.user_id = p_client and (p_from is null or c.day >= p_from)
     order by c.day;
end;
$$;

create function public.client_assessments(p_client uuid)
returns setof public.self_assessments
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.can_view(p_client, 'wellbeing') then raise exception 'forbidden'; end if;
  return query select * from public.self_assessments a where a.user_id = p_client order by a.created_at desc limit 20;
end;
$$;

create function public.client_goals(p_client uuid)
returns table (id uuid, title text, why text, status text, progress smallint, target_date date, created_at timestamptz, updated_at timestamptz, updates jsonb)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.can_view(p_client, 'goals') then raise exception 'forbidden'; end if;
  return query
    select g.id, g.title, g.why, g.status, g.progress, g.target_date, g.created_at, g.updated_at,
           coalesce((select jsonb_agg(jsonb_build_object('note', u.note, 'progress', u.progress, 'at', u.created_at) order by u.created_at desc)
                       from (select * from public.goal_updates u2 where u2.goal_id = g.id order by u2.created_at desc limit 10) u), '[]')
      from public.goals g
     where g.user_id = p_client
     order by (g.status = 'active') desc, g.updated_at desc;
end;
$$;

revoke execute on function public.client_checkins(uuid, date) from public, anon;
revoke execute on function public.client_assessments(uuid) from public, anon;
revoke execute on function public.client_goals(uuid) from public, anon;
