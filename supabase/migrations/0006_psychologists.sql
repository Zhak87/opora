-- Психологи и их клиенты: роли, анкеты специалистов, проверка анкет, приглашения,
-- связи «психолог — клиент», согласия на передачу данных и журнал важных действий.
--
-- Принципы:
-- * обычный аккаунт — клиент; психолог — тот же аккаунт плюс анкета; администратор — строка в public.admins
--   (назначается только из панели Supabase, через API её не изменить);
-- * связи, согласия и журнал меняются только через функции ниже, где проверяются права;
--   прямой записи в эти таблицы через API нет;
-- * психолог видит данные клиента только при активной связи И действующем согласии на этот вид данных.

/* ---------- Администраторы ---------- */

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- Политик нет: таблицу читают только функции ниже.

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins where user_id = (select auth.uid())) $$;

/* ---------- Анкета психолога ---------- */

create table public.psychologists (
  user_id uuid primary key references auth.users (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  full_name text not null default '' check (char_length(full_name) <= 120),
  photo_url text check (photo_url is null or char_length(photo_url) <= 500),
  headline text not null default '' check (char_length(headline) <= 160),
  about text not null default '' check (char_length(about) <= 4000),
  approach text not null default '' check (char_length(approach) <= 4000),
  specializations text[] not null default '{}',
  -- [{ "institution": "...", "degree": "...", "year": 2015 }]
  education jsonb not null default '[]' check (jsonb_typeof(education) = 'array'),
  experience_years int check (experience_years between 0 and 70),
  languages text[] not null default '{ru}',
  formats text[] not null default '{online}' check (formats <@ array['online', 'offline']::text[]),
  city text check (city is null or char_length(city) <= 80),
  price int check (price between 0 and 10000000),
  currency text not null default 'KZT' check (currency in ('KZT', 'RUB', 'USD', 'EUR')),
  session_minutes int not null default 50 check (session_minutes between 20 and 180),
  timezone text not null default 'Asia/Almaty',
  accepting_clients boolean not null default true,
  -- draft — заполняется; pending — на проверке; approved — опубликован; rejected — отклонён; suspended — приостановлен
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected', 'suspended')),
  terms_accepted_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index psychologists_status_idx on public.psychologists (status);
alter table public.psychologists enable row level security;

/* ---------- Связь психолога и клиента ---------- */

create table public.client_links (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (user_id) on delete cascade,
  client_id uuid not null references auth.users (id) on delete cascade,
  -- pending — клиент попросил, психолог ещё не принял; active — работают вместе; ended — связь завершена
  status text not null default 'active' check (status in ('pending', 'active', 'ended')),
  source text not null default 'invite' check (source in ('invite', 'catalog')),
  invite_id uuid,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  ended_at timestamptz,
  ended_by uuid,
  check (psychologist_id <> client_id)
);
create unique index client_links_open_pair on public.client_links (psychologist_id, client_id) where status in ('pending', 'active');
create index client_links_client_idx on public.client_links (client_id, status);
create index client_links_psychologist_idx on public.client_links (psychologist_id, status);
alter table public.client_links enable row level security;

-- Специалист не отстранён: приостановленная или отклонённая анкета сразу закрывает доступ к клиентам.
create function public.psy_active(psychologist uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.psychologists p where p.user_id = psychologist and p.status not in ('suspended', 'rejected')) $$;

-- Кто из специалистов работает с этим клиентом прямо сейчас.
create function public.is_my_client(client uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.client_links l
    where l.client_id = client and l.psychologist_id = (select auth.uid()) and l.status = 'active'
  ) and public.psy_active((select auth.uid()))
$$;

-- Работает ли со мной этот психолог (активная связь).
create function public.is_my_psychologist(psychologist uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.client_links l
    where l.psychologist_id = psychologist and l.client_id = (select auth.uid()) and l.status in ('pending', 'active')
  )
$$;

/* ---------- Проверка анкет ---------- */

create table public.psychologist_reviews (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (user_id) on delete cascade,
  status text not null check (status in ('pending', 'approved', 'rejected', 'suspended')),
  note text check (note is null or char_length(note) <= 2000),
  reviewer_id uuid,
  created_at timestamptz not null default now()
);
create index psychologist_reviews_idx on public.psychologist_reviews (psychologist_id, created_at desc);
alter table public.psychologist_reviews enable row level security;

/* ---------- Приглашения ---------- */

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null default auth.uid() references public.psychologists (user_id) on delete cascade,
  code text not null unique check (code ~ '^[A-Za-z0-9_-]{8,32}$'),
  label text not null default '' check (char_length(label) <= 80),
  views int not null default 0,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index invites_psychologist_idx on public.invites (psychologist_id, created_at desc);
alter table public.invites enable row level security;
alter table public.client_links
  add constraint client_links_invite_fk foreign key (invite_id) references public.invites (id) on delete set null;

/* ---------- Согласия клиента ---------- */

-- Каждый вид данных — отдельное согласие. Отозванное не удаляется: остаётся с датой отзыва как доказательство.
create table public.consent_grants (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.client_links (id) on delete cascade,
  client_id uuid not null references auth.users (id) on delete cascade,
  psychologist_id uuid not null,
  scope text not null check (scope in ('wellbeing', 'goals', 'ai_chats', 'journal', 'analytics')),
  version text not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
create unique index consent_grants_active on public.consent_grants (link_id, scope) where revoked_at is null;
create index consent_grants_lookup on public.consent_grants (client_id, psychologist_id, scope) where revoked_at is null;
alter table public.consent_grants enable row level security;

-- Может ли текущий пользователь (психолог) видеть этот вид данных клиента.
create function public.can_view(client uuid, data_scope text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.consent_grants g
    join public.client_links l on l.id = g.link_id
    where l.client_id = client
      and l.psychologist_id = (select auth.uid())
      and l.status = 'active'
      and g.scope = data_scope
      and g.revoked_at is null
  ) and public.psy_active((select auth.uid()))
$$;

/* ---------- Журнал важных действий ---------- */

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  client_id uuid,
  psychologist_id uuid,
  action text not null,
  details jsonb not null default '{}'
);
create index audit_log_client_idx on public.audit_log (client_id, at desc);
create index audit_log_psychologist_idx on public.audit_log (psychologist_id, at desc);
alter table public.audit_log enable row level security;

create function public.log_event(p_action text, p_client uuid, p_psychologist uuid, p_details jsonb default '{}')
returns void
language sql security definer set search_path = ''
as $$
  insert into public.audit_log (actor_id, client_id, psychologist_id, action, details)
  values ((select auth.uid()), p_client, p_psychologist, p_action, coalesce(p_details, '{}'))
$$;

/* ---------- Правила доступа ---------- */

-- Анкеты: опубликованные видят все (каталог и публичный профиль), свою — владелец,
-- своего психолога — его клиент, все — администратор.
create policy "psychologists public" on public.psychologists
  for select to anon, authenticated
  using (status = 'approved');
create policy "psychologists own or linked" on public.psychologists
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_my_psychologist(user_id) or public.is_admin());
create policy "psychologists insert own" on public.psychologists
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "psychologists update own" on public.psychologists
  for update to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());
create policy "psychologists delete own" on public.psychologists
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Статус анкеты и даты проверки меняет только администратор (через review_psychologist).
-- Сам психолог может лишь вернуть анкету в черновик; на проверку она уходит через submit_psychologist.
-- Если у опубликованной анкеты меняются сведения о квалификации, она снова уходит на проверку.
create function public.psychologists_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  -- Внутри функций ниже (security definer) и из панели Supabase запрос идёт не от роли authenticated.
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.submitted_at := null;
    new.reviewed_at := null;
    new.terms_accepted_at := null;
    return new;
  end if;
  new.reviewed_at := old.reviewed_at;
  new.submitted_at := old.submitted_at;
  new.terms_accepted_at := old.terms_accepted_at;
  if new.status is distinct from old.status and new.status <> 'draft' then
    new.status := old.status;
  end if;
  if old.status = 'suspended' then
    new.status := 'suspended';
  end if;
  if old.status = 'approved' and new.status = 'approved' and (
    new.full_name is distinct from old.full_name
    or new.education is distinct from old.education
    or new.experience_years is distinct from old.experience_years
    or new.photo_url is distinct from old.photo_url
  ) then
    new.status := 'pending';
    new.submitted_at := now();
  end if;
  return new;
end;
$$;
create trigger psychologists_guard before insert or update on public.psychologists
  for each row execute function public.psychologists_guard();

create policy "reviews own or admin" on public.psychologist_reviews
  for select to authenticated
  using (psychologist_id = (select auth.uid()) or public.is_admin());

create policy "invites own" on public.invites
  for all to authenticated
  using (psychologist_id = (select auth.uid()))
  with check (psychologist_id = (select auth.uid()));

create policy "links participants" on public.client_links
  for select to authenticated
  using (client_id = (select auth.uid()) or psychologist_id = (select auth.uid()) or public.is_admin());

create policy "consents participants" on public.consent_grants
  for select to authenticated
  using (client_id = (select auth.uid()) or psychologist_id = (select auth.uid()));

-- Клиент видит всё, что касается его данных; психолог — свои действия и события по своим клиентам.
create policy "audit visible to participants" on public.audit_log
  for select to authenticated
  using (
    client_id = (select auth.uid())
    or actor_id = (select auth.uid())
    or psychologist_id = (select auth.uid())
    or public.is_admin()
  );

-- Психолог видит имя своего клиента (и только пока они работают вместе).
create policy "linked psychologist reads client profile" on public.profiles
  for select to authenticated
  using (public.is_my_client(id));

/* ---------- Действия ---------- */

-- Отправить анкету на проверку. Нужны имя, специализация, образование и согласие с условиями для специалистов.
create function public.submit_psychologist()
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  p public.psychologists;
begin
  select * into p from public.psychologists where user_id = me for update;
  if p.user_id is null then raise exception 'no profile'; end if;
  if p.status in ('pending', 'approved') then return p.status; end if;
  if p.status = 'suspended' then raise exception 'suspended'; end if;
  if char_length(trim(p.full_name)) < 3 or cardinality(p.specializations) = 0 or jsonb_array_length(p.education) = 0 then
    raise exception 'incomplete';
  end if;
  update public.psychologists
     set status = 'pending', submitted_at = now(), terms_accepted_at = coalesce(terms_accepted_at, now())
   where user_id = me;
  insert into public.psychologist_reviews (psychologist_id, status) values (me, 'pending');
  perform public.log_event('psychologist.submitted', null, me);
  return 'pending';
end;
$$;

-- Решение администратора по анкете.
create function public.review_psychologist(p_user uuid, p_status text, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('approved', 'rejected', 'suspended') then raise exception 'bad status'; end if;
  update public.psychologists set status = p_status, reviewed_at = now() where user_id = p_user;
  if not found then raise exception 'not found'; end if;
  insert into public.psychologist_reviews (psychologist_id, status, note, reviewer_id)
  values (p_user, p_status, nullif(trim(p_note), ''), auth.uid());
  perform public.log_event('psychologist.reviewed', null, p_user, jsonb_build_object('status', p_status));
end;
$$;

-- Публичные сведения по ссылке-приглашению (доступно и без входа). Отозванная ссылка или
-- непроверенный специалист — пустой ответ.
create function public.invite_info(p_code text)
returns table (invite_id uuid, psychologist_id uuid, slug text)
language sql stable security definer set search_path = ''
as $$
  select i.id, p.user_id, p.slug
  from public.invites i
  join public.psychologists p on p.user_id = i.psychologist_id
  where i.code = p_code and i.revoked_at is null and p.status = 'approved'
$$;

-- Счётчик переходов по ссылке.
create function public.count_invite_view(p_code text)
returns void
language sql security definer set search_path = ''
as $$ update public.invites set views = views + 1 where code = p_code and revoked_at is null $$;

-- Клиент принимает приглашение и выбирает, какими данными делиться.
create function public.accept_invite(p_code text, p_scopes text[], p_version text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  inv record;
  link_id uuid;
  s text;
begin
  if me is null then raise exception 'unauthorized'; end if;
  select * into inv from public.invite_info(p_code);
  if inv.invite_id is null then raise exception 'invalid invite'; end if;
  if inv.psychologist_id = me then raise exception 'own invite'; end if;

  select id into link_id from public.client_links
   where psychologist_id = inv.psychologist_id and client_id = me and status in ('pending', 'active');
  if link_id is null then
    insert into public.client_links (psychologist_id, client_id, status, source, invite_id, activated_at)
    values (inv.psychologist_id, me, 'active', 'invite', inv.invite_id, now())
    returning id into link_id;
    perform public.log_event('link.created', me, inv.psychologist_id, jsonb_build_object('source', 'invite'));
  else
    update public.client_links set status = 'active', activated_at = coalesce(activated_at, now()) where id = link_id;
  end if;

  foreach s in array coalesce(p_scopes, '{}') loop
    perform public.set_consent(link_id, s, true, p_version);
  end loop;
  return link_id;
end;
$$;

-- Выдать или отозвать согласие. Только сам клиент.
create function public.set_consent(p_link uuid, p_scope text, p_granted boolean, p_version text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  l public.client_links;
begin
  select * into l from public.client_links where id = p_link;
  if l.id is null or l.client_id is distinct from me then raise exception 'forbidden'; end if;
  if p_scope not in ('wellbeing', 'goals', 'ai_chats', 'journal', 'analytics') then raise exception 'bad scope'; end if;
  if p_granted then
    if l.status = 'ended' then raise exception 'link ended'; end if;
    if exists (select 1 from public.consent_grants where link_id = p_link and scope = p_scope and revoked_at is null) then
      return;
    end if;
    insert into public.consent_grants (link_id, client_id, psychologist_id, scope, version)
    values (p_link, me, l.psychologist_id, p_scope, coalesce(p_version, 'unknown'));
    perform public.log_event('consent.granted', me, l.psychologist_id, jsonb_build_object('scope', p_scope));
  else
    update public.consent_grants set revoked_at = now()
     where link_id = p_link and scope = p_scope and revoked_at is null;
    if found then
      perform public.log_event('consent.revoked', me, l.psychologist_id, jsonb_build_object('scope', p_scope));
    end if;
  end if;
end;
$$;

-- Завершить работу: может любая сторона. Все согласия отзываются, доступ к данным пропадает сразу.
create function public.end_link(p_link uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  l public.client_links;
begin
  select * into l from public.client_links where id = p_link for update;
  if l.id is null or (l.client_id is distinct from me and l.psychologist_id is distinct from me) then
    raise exception 'forbidden';
  end if;
  if l.status = 'ended' then return; end if;
  update public.client_links set status = 'ended', ended_at = now(), ended_by = me where id = p_link;
  update public.consent_grants set revoked_at = now() where link_id = p_link and revoked_at is null;
  perform public.log_event('link.ended', l.client_id, l.psychologist_id,
    jsonb_build_object('by', case when me = l.client_id then 'client' else 'psychologist' end));
end;
$$;

-- Психолог открыл карточку клиента: запись в журнал (клиент видит её у себя).
create function public.log_client_view(p_client uuid, p_what text default 'card')
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_my_client(p_client) then raise exception 'forbidden'; end if;
  -- Не чаще раза в час на один и тот же раздел, чтобы журнал оставался читаемым.
  if exists (
    select 1 from public.audit_log
    where actor_id = auth.uid() and client_id = p_client and action = 'client.viewed'
      and details ->> 'what' = p_what and at > now() - interval '1 hour'
  ) then
    return;
  end if;
  perform public.log_event('client.viewed', p_client, auth.uid(), jsonb_build_object('what', left(p_what, 40)));
end;
$$;

/* ---------- Права на функции ---------- */

revoke execute on function public.log_event(text, uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.psychologists_guard() from public, anon, authenticated;
revoke execute on function public.submit_psychologist() from public, anon;
revoke execute on function public.review_psychologist(uuid, text, text) from public, anon;
revoke execute on function public.accept_invite(text, text[], text) from public, anon;
revoke execute on function public.set_consent(uuid, text, boolean, text) from public, anon;
revoke execute on function public.end_link(uuid) from public, anon;
revoke execute on function public.log_client_view(uuid, text) from public, anon;
grant execute on function public.invite_info(text) to anon, authenticated;
grant execute on function public.count_invite_view(text) to anon, authenticated;

revoke all on public.admins, public.client_links, public.consent_grants, public.audit_log,
  public.invites, public.psychologist_reviews from anon;
-- Гостю из анкеты нужны только публичные поля опубликованных специалистов.
revoke all on public.psychologists from anon;
grant select on public.psychologists to anon;
-- Связи, согласия и журнал меняются только функциями выше.
revoke insert, update, delete on public.client_links, public.consent_grants, public.audit_log, public.psychologist_reviews from authenticated;

/* ---------- Файлы: фото и документы об образовании ---------- */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 3145728, array['image/jpeg', 'image/png', 'image/webp']),
  ('credentials', 'credentials', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- Каждый пишет только в свою папку: <id пользователя>/файл.
create policy "avatars own write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars own update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars own delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Документы видят только сам специалист и администратор.
create policy "credentials own" on storage.objects
  for all to authenticated
  using (bucket_id = 'credentials' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'credentials' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "credentials admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'credentials' and public.is_admin());
