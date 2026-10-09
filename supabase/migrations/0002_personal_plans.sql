-- Личный план: игры и советы, собранные ИИ по разговорам и дневнику.
create table if not exists public.personal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan jsonb not null,
  progress jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists personal_plans_user_idx on public.personal_plans (user_id, created_at desc);
alter table public.personal_plans enable row level security;
create policy "own plans select" on public.personal_plans for select using (user_id = auth.uid());
create policy "own plans insert" on public.personal_plans for insert with check (user_id = auth.uid());
create policy "own plans update" on public.personal_plans for update using (user_id = auth.uid());
create policy "own plans delete" on public.personal_plans for delete using (user_id = auth.uid());
