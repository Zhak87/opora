-- Курс «Мой путь»: программа на 7, 14 или 30 дней, которую ИИ собирает под запрос человека.
-- Каждый день открывается по очереди; письмо дня приходит на почту только по согласию.
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topic text,
  goal text not null default '',
  length int not null check (length in (7, 14, 30)),
  plan jsonb not null,
  locale text not null default 'ru',
  tz text not null default 'Asia/Almaty',
  status text not null default 'active' check (status in ('active', 'done', 'stopped')),
  email_daily boolean not null default false,
  last_emailed_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists courses_user_idx on public.courses (user_id, created_at desc);
create index if not exists courses_email_idx on public.courses (status, email_daily);
alter table public.courses enable row level security;
create policy "own courses select" on public.courses for select using (user_id = auth.uid());
create policy "own courses insert" on public.courses for insert with check (user_id = auth.uid());
create policy "own courses update" on public.courses for update using (user_id = auth.uid());
create policy "own courses delete" on public.courses for delete using (user_id = auth.uid());

create table if not exists public.course_days (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day int not null check (day between 1 and 30),
  content jsonb,
  mood_before int check (mood_before between 1 and 5),
  mood_after int check (mood_after between 1 and 5),
  reflection text,
  action_done boolean not null default false,
  completed_on date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (course_id, day)
);
create index if not exists course_days_user_idx on public.course_days (user_id, completed_at desc);
alter table public.course_days enable row level security;
create policy "own course days select" on public.course_days for select using (user_id = auth.uid());
create policy "own course days insert" on public.course_days for insert with check (
  user_id = auth.uid() and exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid())
);
create policy "own course days update" on public.course_days for update using (user_id = auth.uid());
create policy "own course days delete" on public.course_days for delete using (user_id = auth.uid());
