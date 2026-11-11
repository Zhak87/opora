-- Продуктовая аналитика: воронка от захода на сайт до возвращения.
-- В таблицу пишутся только названия событий и короткие технические пометки (какая практика, откуда пришёл).
-- Тексты разговоров, дневника и комнат сюда не попадают. Читать может только администратор, через funnel_report.

create table public.product_events (
  id bigint generated always as identity primary key,
  name text not null,
  -- Случайный номер браузера (кука opora-vid): связывает шаги одного человека до и после регистрации.
  visitor text,
  user_id uuid references auth.users (id) on delete set null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index product_events_time on public.product_events (created_at);
create index product_events_name_time on public.product_events (name, created_at);

alter table public.product_events enable row level security;
revoke all on public.product_events from anon, authenticated;

-- Запись события. Список названий закрыт, размер пометок ограничен: лишнего сюда не положить.
create function public.track_event(p_name text, p_visitor text, p_props jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer set search_path = ''
as $f$
begin
  if p_name not in (
    'landing_view', 'guide_start', 'guide_complete', 'trial_start', 'signup_start', 'signup_complete',
    'app_open', 'chat_start', 'chat_reply', 'chat_rated', 'step_offered', 'step_taken', 'practice_start', 'practice_complete', 'journal_entry',
    'need_pick', 'room_view', 'room_join', 'room_create', 'psychologist_view', 'contact_request'
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

-- Кто может смотреть цифры: любой сотрудник (строка в public.admins). Роли сотрудников и то, кто из них
-- может что-то менять, описаны в 0015_admin_panel.sql.
create function public.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $f$ select exists (select 1 from public.admins where user_id = (select auth.uid())) $f$;
revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- Отчёт для сотрудников за последние p_days дней. Человек = браузер (visitor), а без него аккаунт.
-- «Полезное действие»: получил ответ собеседника, прошёл практику, сделал запись в дневнике,
-- вошёл в комнату или записался к психологу.
create function public.funnel_report(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer set search_path = ''
as $f$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
  v_useful text[] := array['chat_reply', 'practice_complete', 'journal_entry', 'room_join', 'contact_request'];
  v_result jsonb;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;

  with e as (
    select name, coalesce(visitor, user_id::text) as person, created_at,
           (created_at at time zone 'Asia/Almaty')::date as day
    from public.product_events
    where created_at >= v_since
  ),
  first_seen as (
    select person, min(day) as day0 from e group by person
  ),
  days as (
    select distinct person, day from e
  ),
  cohort as (
    select f.person, f.day0,
           exists (select 1 from days d where d.person = f.person and d.day = f.day0 + 1) as d1,
           exists (select 1 from days d where d.person = f.person and d.day between f.day0 + 1 and f.day0 + 7) as d7,
           exists (select 1 from days d where d.person = f.person and d.day > f.day0) as again
    from first_seen f
    -- Возвращение считаем только среди тех, кто делал что-то в самом приложении, а не просто открыл сайт.
    where exists (select 1 from e where e.person = f.person and e.name not in ('landing_view', 'guide_start', 'guide_complete', 'signup_start'))
  )
  select jsonb_build_object(
    'days', greatest(1, least(coalesce(p_days, 30), 365)),
    'steps', jsonb_build_object(
      'landing', (select count(distinct person) from e where name = 'landing_view'),
      'started', (select count(distinct person) from e where name in ('trial_start', 'signup_start')),
      'trial', (select count(distinct person) from e where name = 'trial_start'),
      'account', (select count(distinct person) from e where name = 'signup_complete'),
      'useful', (select count(distinct person) from e where name = any (v_useful)),
      'returned', (select count(*) from cohort where again)
    ),
    'north_star', (
      select count(distinct coalesce(visitor, user_id::text)) from public.product_events
      where created_at >= now() - interval '7 days' and name = any (v_useful)
    ),
    'retention', jsonb_build_object(
      'd1_base', (select count(*) from cohort where day0 <= (now() at time zone 'Asia/Almaty')::date - 1),
      'd1', (select count(*) from cohort where d1),
      'd7_base', (select count(*) from cohort where day0 <= (now() at time zone 'Asia/Almaty')::date - 7),
      'd7', (select count(*) from cohort where d7 and day0 <= (now() at time zone 'Asia/Almaty')::date - 7)
    ),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'people', people, 'total', total) order by total desc)
      from (select name, count(distinct person) as people, count(*) as total from e group by name) t
    ), '[]'::jsonb),
    -- Аудитории (ссылки /welcome?for=…): сколько людей пришло по каждой и сколько из них пошли дальше.
    'audiences', coalesce((
      select jsonb_agg(jsonb_build_object('aud', aud, 'landed', landed, 'started', started, 'account', account) order by landed desc)
      from (
        select l.aud, count(*) as landed,
               count(*) filter (where exists (select 1 from e where e.person = l.person and e.name in ('trial_start', 'signup_start'))) as started,
               count(*) filter (where exists (select 1 from e where e.person = l.person and e.name = 'signup_complete')) as account
        from (
          select coalesce(visitor, user_id::text) as person, min(props ->> 'aud') as aud
          from public.product_events
          where created_at >= v_since and name = 'landing_view' and props ? 'aud'
          group by 1
        ) l
        group by l.aud
      ) t
    ), '[]'::jsonb),
    -- Что людям нужно: какие потребности выбирают на главной.
    'needs', coalesce((
      select jsonb_agg(jsonb_build_object('need', need, 'people', people) order by people desc)
      from (
        select props ->> 'need' as need, count(distinct coalesce(visitor, user_id::text)) as people
        from public.product_events
        where created_at >= v_since and name = 'need_pick' and props ? 'need'
        group by 1
      ) t
    ), '[]'::jsonb),
    -- Оценки разговоров: 3 — помог, 2 — немного, 1 — нет.
    'ratings', jsonb_build_object(
      'yes', (select count(*) from public.product_events where created_at >= v_since and name = 'chat_rated' and props ->> 'value' = '3'),
      'some', (select count(*) from public.product_events where created_at >= v_since and name = 'chat_rated' and props ->> 'value' = '2'),
      'no', (select count(*) from public.product_events where created_at >= v_since and name = 'chat_rated' and props ->> 'value' = '1')
    ),
    -- Следующий шаг от собеседника: сколько раз предложен и сколько раз человек им воспользовался.
    'next_steps', coalesce((
      select jsonb_agg(jsonb_build_object('step', step, 'offered', offered, 'taken', taken) order by offered desc)
      from (
        select p.props ->> 'step' as step,
               count(*) filter (where p.name = 'step_offered') as offered,
               count(*) filter (where p.name = 'step_taken') as taken
        from public.product_events p
        where p.created_at >= v_since and p.name in ('step_offered', 'step_taken') and p.props ? 'step'
        group by 1
      ) t
    ), '[]'::jsonb),
    'practices', coalesce((
      select jsonb_agg(jsonb_build_object('game', game, 'started', started, 'completed', completed) order by started desc)
      from (
        select p.props ->> 'game' as game,
               count(*) filter (where p.name = 'practice_start') as started,
               count(*) filter (where p.name = 'practice_complete') as completed
        from public.product_events p
        where p.created_at >= v_since and p.name in ('practice_start', 'practice_complete') and p.props ? 'game'
        group by 1
      ) t
    ), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', day, 'people', people, 'useful', useful) order by day)
      from (
        select day, count(distinct person) as people,
               count(distinct person) filter (where name = any (v_useful)) as useful
        from e group by day
      ) t
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$f$;
revoke execute on function public.funnel_report(int) from public, anon;
grant execute on function public.funnel_report(int) to authenticated;
