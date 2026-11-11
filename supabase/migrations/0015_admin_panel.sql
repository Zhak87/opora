-- Панель администратора: роли сотрудников, обзор «прямо сейчас», список пользователей и журнал действий.
--
-- Роли (строка в public.admins):
-- * viewer    — наблюдатель: видит панель, цифры, пользователей и анкеты, но ничего не меняет;
-- * admin     — администратор: плюс проверяет анкеты психологов и блокирует пользователей;
-- * developer — владелец: плюс назначает и снимает роли сотрудников.
-- Обычный пользователь и психолог ролями сотрудников не являются: это аккаунт без строки в admins
-- (психолог — аккаунт с одобренной анкетой).
--
-- is_admin() теперь значит «может менять» (admin и developer), is_staff() — «может смотреть» (любая роль,
-- функция создана в 0013_product_events.sql).

alter table public.admins add column role text not null default 'admin' check (role in ('viewer', 'admin', 'developer'));
alter table public.admins add column granted_by uuid references auth.users (id) on delete set null;

-- Самый первый администратор становится владельцем: кто-то один должен уметь назначать роли.
update public.admins set role = 'developer'
where user_id = (select user_id from public.admins order by created_at, user_id limit 1);

create function public.staff_role()
returns text
language sql stable security definer set search_path = ''
as $f$ select role from public.admins where user_id = (select auth.uid()) $f$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $f$ select exists (select 1 from public.admins where user_id = (select auth.uid()) and role in ('admin', 'developer')) $f$;

revoke execute on function public.staff_role() from public, anon;
grant execute on function public.staff_role() to authenticated;

-- Наблюдатель читает то же, что и администратор; менять по-прежнему может только is_admin().
alter policy "psychologists own or linked" on public.psychologists
  using (user_id = (select auth.uid()) or public.is_my_psychologist(user_id) or public.is_staff());
alter policy "reviews own or admin" on public.psychologist_reviews
  using (psychologist_id = (select auth.uid()) or public.is_staff());
alter policy "credentials admin read" on storage.objects
  using (bucket_id = 'credentials' and public.is_staff());

/* ---------- Журнал действий сотрудников ---------- */

-- Запись в общий журнал (public.audit_log). client_id здесь — пользователь, над которым совершено действие.
create function public.admin_log(p_action text, p_user uuid, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql security definer set search_path = ''
as $f$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_action !~ '^admin\.[a-z_.]{1,40}$' then raise exception 'bad action'; end if;
  insert into public.audit_log (actor_id, client_id, action, details)
  values ((select auth.uid()), p_user, p_action, coalesce(p_details, '{}'::jsonb));
end;
$f$;
revoke execute on function public.admin_log(text, uuid, jsonb) from public, anon;
grant execute on function public.admin_log(text, uuid, jsonb) to authenticated;

/* ---------- Роли ---------- */

-- Назначить роль сотрудника или снять её ('user'). Только владелец; себе роль менять нельзя,
-- чтобы случайно не остаться без единственного владельца.
create function public.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql security definer set search_path = ''
as $f$
declare
  v_old text;
begin
  if public.staff_role() is distinct from 'developer' then raise exception 'forbidden'; end if;
  if p_role not in ('user', 'viewer', 'admin', 'developer') then raise exception 'bad role'; end if;
  if p_user = (select auth.uid()) then raise exception 'self'; end if;
  if not exists (select 1 from auth.users where id = p_user and coalesce(is_anonymous, false) = false) then
    raise exception 'not found';
  end if;
  select role into v_old from public.admins where user_id = p_user;
  if p_role = 'user' then
    delete from public.admins where user_id = p_user;
  else
    insert into public.admins (user_id, role, granted_by) values (p_user, p_role, (select auth.uid()))
    on conflict (user_id) do update set role = excluded.role, granted_by = excluded.granted_by;
  end if;
  insert into public.audit_log (actor_id, client_id, action, details)
  values ((select auth.uid()), p_user, 'admin.role', jsonb_build_object('from', coalesce(v_old, 'user'), 'to', p_role));
end;
$f$;
revoke execute on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

/* ---------- Пользователи ---------- */

-- Список пользователей для панели: поиск по почте и имени, отбор по виду, постранично.
-- Содержимое разговоров и дневников сюда не попадает: только учётные сведения и счётчики.
create function public.admin_users(p_search text default '', p_filter text default 'all', p_limit int default 30, p_offset int default 0)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $f$
declare
  v_q text := '%' || replace(replace(lower(trim(coalesce(p_search, ''))), '%', ''), '_', '\_') || '%';
  v_limit int := greatest(1, least(coalesce(p_limit, 30), 100));
  v_result jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  with base as (
    select u.id, u.email, u.created_at, u.last_sign_in_at, u.banned_until,
           coalesce(u.is_anonymous, false) as guest,
           p.name, a.role, ps.status as psy_status, ps.slug as psy_slug
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.admins a on a.user_id = u.id
    left join public.psychologists ps on ps.user_id = u.id
    where (lower(coalesce(u.email, '')) like v_q or lower(coalesce(p.name, '')) like v_q)
      and case p_filter
            when 'staff' then a.role is not null
            when 'psychologists' then ps.user_id is not null
            when 'guests' then coalesce(u.is_anonymous, false)
            when 'blocked' then u.banned_until > now()
            else not coalesce(u.is_anonymous, false)
          end
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'users', coalesce((
      select jsonb_agg(row_to_json(t) order by t.created_at desc)
      from (
        select b.id, b.email, b.name, b.created_at, b.last_sign_in_at, b.guest,
               coalesce(b.role, 'user') as role, b.psy_status, b.psy_slug,
               (b.banned_until is not null and b.banned_until > now()) as blocked,
               (select count(*) from public.conversations c where c.user_id = b.id) as conversations,
               (select max(e.created_at) from public.product_events e where e.user_id = b.id) as last_seen
        from base b
        order by b.created_at desc
        limit v_limit offset greatest(0, coalesce(p_offset, 0))
      ) t
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$f$;
revoke execute on function public.admin_users(text, text, int, int) from public, anon;
grant execute on function public.admin_users(text, text, int, int) to authenticated;

/* ---------- Обзор «прямо сейчас» ---------- */

-- Цифры для главной страницы панели. Человек = браузер (visitor), а без него аккаунт.
-- «Сегодня» считается по времени Алматы.
create function public.admin_overview()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $f$
declare
  v_today timestamptz := date_trunc('day', now() at time zone 'Asia/Almaty') at time zone 'Asia/Almaty';
  v_result jsonb;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  with t as (
    select name, coalesce(visitor, user_id::text) as person from public.product_events where created_at >= v_today
  )
  select jsonb_build_object(
    'at', now(),
    'online', (select count(distinct coalesce(visitor, user_id::text)) from public.product_events where created_at >= now() - interval '5 minutes'),
    'online_hour', (select count(distinct coalesce(visitor, user_id::text)) from public.product_events where created_at >= now() - interval '1 hour'),
    'today', jsonb_build_object(
      'visitors', (select count(distinct person) from t),
      'landing', (select count(distinct person) from t where name = 'landing_view'),
      'trials', (select count(distinct person) from t where name = 'trial_start'),
      'signups', (select count(*) from auth.users where created_at >= v_today and coalesce(is_anonymous, false) = false),
      'chats', (select count(*) from t where name = 'chat_start'),
      'replies', (select count(*) from t where name = 'chat_reply'),
      'practices', (select count(*) from t where name = 'practice_complete')
    ),
    'totals', jsonb_build_object(
      'users', (select count(*) from auth.users where coalesce(is_anonymous, false) = false),
      'guests', (select count(*) from auth.users where coalesce(is_anonymous, false)),
      'users_7d', (select count(*) from auth.users where coalesce(is_anonymous, false) = false and created_at >= now() - interval '7 days'),
      'active_7d', (select count(distinct user_id) from public.product_events where user_id is not null and created_at >= now() - interval '7 days'),
      'staff', (select count(*) from public.admins),
      'psychologists', (select count(*) from public.psychologists where status = 'approved'),
      'psy_pending', (select count(*) from public.psychologists where status = 'pending'),
      'conversations', (select count(*) from public.conversations),
      'messages', (select count(*) from public.messages),
      'journal', (select count(*) from public.journal_entries),
      'rooms', (select count(*) from public.rooms),
      'sessions', (select count(*) from public.sessions),
      'blocked', (select count(*) from auth.users where banned_until > now())
    ),
    -- Новые аккаунты по дням за две недели.
    'signups_daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'n', (
        select count(*) from auth.users u
        where coalesce(u.is_anonymous, false) = false and (u.created_at at time zone 'Asia/Almaty')::date = d.day
      )) order by d.day)
      from (select generate_series((now() at time zone 'Asia/Almaty')::date - 13, (now() at time zone 'Asia/Almaty')::date, interval '1 day')::date as day) d
    ), '[]'::jsonb),
    -- Лента последних событий: без имён и почты, только что произошло и когда.
    'feed', coalesce((
      select jsonb_agg(jsonb_build_object('name', f.name, 'at', f.created_at, 'user', f.user_id is not null, 'note', coalesce(f.props ->> 'game', f.props ->> 'step', f.props ->> 'need', f.props ->> 'aud')) order by f.created_at desc)
      from (select name, created_at, user_id, props from public.product_events order by created_at desc limit 25) f
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$f$;
revoke execute on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

-- Журнал действий сотрудников для панели (кто, что, над кем).
create function public.admin_actions(p_limit int default 30)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $f$
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.at desc)
    from (
      select l.at, l.action, l.details,
             (select email from auth.users where id = l.actor_id) as actor,
             (select email from auth.users where id = coalesce(l.client_id, l.psychologist_id)) as target
      from public.audit_log l
      where l.action like 'admin.%' or l.action = 'psychologist.reviewed'
      order by l.at desc
      limit greatest(1, least(coalesce(p_limit, 30), 200))
    ) t
  ), '[]'::jsonb);
end;
$f$;
revoke execute on function public.admin_actions(int) from public, anon;
grant execute on function public.admin_actions(int) to authenticated;
