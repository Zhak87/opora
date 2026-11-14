-- Дневник снов (ТЗ «Дневник снов» v2.0, этап MVP для пространства пользователя).
-- Человек записывает сон, ИИ собирает сценарий из 3–4 кадров, по нему рисуется комикс,
-- в конце человек получает наблюдения и вопросы для размышления (не толкование).
-- Сон виден только владельцу. Таблицы доступа психологу (dream_shares, dream_access_log)
-- заведены заранее, без интерфейса: в них пока никто, кроме владельца, ничего не видит.

create table public.dreams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dream_date date not null default current_date,
  title text not null default '' check (char_length(title) <= 80),
  text text not null check (char_length(text) between 1 and 4000),
  dream_type text not null default 'usual' check (dream_type in ('usual', 'recurring', 'nightmare', 'lucid')),
  vividness smallint check (vividness between 1 and 5),
  day_context text check (char_length(day_context) <= 600),
  emotions jsonb not null default '[]'::jsonb,
  emotions_after jsonb not null default '[]'::jsonb,
  key_images jsonb not null default '[]'::jsonb,
  dreamer text not null default 'mint' check (char_length(dreamer) <= 24),
  seed integer not null default (floor(random() * 2000000000))::int,
  status text not null default 'draft' check (status in ('draft', 'storyboard', 'comic', 'complete')),
  similarity smallint check (similarity between 1 and 5),
  reflection jsonb,
  answers jsonb not null default '[]'::jsonb,
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dreams_user_idx on public.dreams (user_id, dream_date desc, created_at desc);

create table public.dream_panels (
  id uuid primary key default gen_random_uuid(),
  dream_id uuid not null references public.dreams (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position smallint not null default 1,
  scene text not null default '' check (char_length(scene) <= 400),
  caption text not null default '' check (char_length(caption) <= 200),
  visual_prompt text check (char_length(visual_prompt) <= 900),
  mood text not null default 'night' check (char_length(mood) <= 24),
  added jsonb not null default '[]'::jsonb,
  softened boolean not null default false,
  skipped boolean not null default false,
  image_path text,
  provider text,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  version smallint not null default 0,
  created_at timestamptz not null default now()
);
create index dream_panels_dream_idx on public.dream_panels (dream_id, position);

-- Учёт генераций: по нему считается дневной лимит картинок на человека.
create table public.dream_generations (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  provider text not null default '',
  created_at timestamptz not null default now()
);
create index dream_generations_user_idx on public.dream_generations (user_id, created_at desc);

-- Задел на этап 1.2 (поделиться с психологом). Интерфейса пока нет.
create table public.dream_shares (
  id uuid primary key default gen_random_uuid(),
  dream_id uuid not null references public.dreams (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  psychologist_id uuid not null references auth.users (id) on delete cascade,
  scope jsonb not null default '{"text": true, "comic": true, "emotions": true, "notes": false}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index dream_shares_dream_idx on public.dream_shares (dream_id);

-- Журнал хранит факт события без содержимого сна, поэтому переживает удаление сна.
create table public.dream_access_log (
  id bigint generated always as identity primary key,
  dream_id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid,
  actor_role text not null check (actor_role in ('user', 'psychologist', 'system')),
  action text not null check (action in ('open', 'view', 'revoke', 'expire', 'delete')),
  created_at timestamptz not null default now()
);
create index dream_access_log_owner_idx on public.dream_access_log (owner_id, created_at desc);

alter table public.dreams enable row level security;
alter table public.dream_panels enable row level security;
alter table public.dream_generations enable row level security;
alter table public.dream_shares enable row level security;
alter table public.dream_access_log enable row level security;

create policy "dreams own" on public.dreams
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "dream panels own" on public.dream_panels
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.dreams d where d.id = dream_id and d.user_id = (select auth.uid()))
  );

-- Счётчик генераций можно только пополнять и читать: удалить строку и обнулить лимит нельзя.
create policy "dream generations read" on public.dream_generations
  for select to authenticated using (user_id = (select auth.uid()));
create policy "dream generations add" on public.dream_generations
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "dream shares own" on public.dream_shares
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.dreams d where d.id = dream_id and d.user_id = (select auth.uid()))
  );

create policy "dream access log read" on public.dream_access_log
  for select to authenticated using (owner_id = (select auth.uid()));

-- Картинки кадров: закрытое хранилище, у каждого человека своя папка.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dreams', 'dreams', false, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "dreams own files read" on storage.objects
  for select to authenticated
  using (bucket_id = 'dreams' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "dreams own files write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dreams' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "dreams own files update" on storage.objects
  for update to authenticated
  using (bucket_id = 'dreams' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "dreams own files delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dreams' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Воронка: запись сна → сценарий → комикс → размышление. Только названия событий и цифры, без текста сна.
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
    'dream_saved', 'dream_storyboard', 'dream_panel', 'dream_reflect', 'dream_similarity'
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
