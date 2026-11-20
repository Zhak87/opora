-- Аудит игр и практик (19.11.2026).
-- 1) practice_state: личное сохраняемое пространство практик, общее для сайта и приложения:
--    сад (сцена и рост), активный «следующий шаг», черновик «Банки мыслей», пройденные пути «Моих границ»,
--    история «Колеса жизни». Видит и меняет только сам человек; при удалении аккаунта удаляется.
-- 2) Новые события практик (только цифры, без текстов): открыл, начал, дошёл до результата (practice_complete),
--    закончил свободную сессию, вышел (с активным временем), начал заново.
-- 3) practice_report v2: воронка по каждой практике, активное время, возвраты в течение 7 дней, полезность.

create table if not exists public.practice_state (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9-]{1,32}$'),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 200000),
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.practice_state enable row level security;
drop policy if exists "own practice state" on public.practice_state;
create policy "own practice state" on public.practice_state
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.practice_state to authenticated;

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
    'dream_saved', 'dream_storyboard', 'dream_panel', 'dream_reflect', 'dream_similarity',
    'practice_open', 'practice_session_end', 'practice_exit', 'practice_restart'
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

-- Отчёт по практикам для сотрудников.
-- opened — открыли экран; started — нажали «Начать»; completed — дошли до результата практики
-- (одинаково на сайте и в приложении: игра сообщила свой итог); sessions — завершили свободную сессию;
-- exits — вышли, не дойдя до результата; restarts — начали заново в том же заходе;
-- active_sec — среднее активное время за заход (вкладка/приложение на экране);
-- returned_7d — сколько людей вернулись к этой практике в течение 7 дней после предыдущего старта.
create or replace function public.practice_report(p_days int default 30)
returns jsonb
language plpgsql stable
security definer set search_path = ''
as $f$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(t) order by t.started desc)
    from (
      select g.game,
             count(*) filter (where g.name = 'practice_open') as opened,
             count(*) filter (where g.name = 'practice_start') as started,
             count(*) filter (where g.name = 'practice_complete') as completed,
             count(*) filter (where g.name = 'practice_session_end') as sessions,
             count(*) filter (where g.name = 'practice_exit' and coalesce(g.props ->> 'done', '0') = '0') as exits,
             count(*) filter (where g.name = 'practice_restart') as restarts,
             count(distinct g.person) filter (where g.name = 'practice_start') as people,
             (select count(*) from (
                select s.person from (
                  select coalesce(p.visitor, p.user_id::text) as person
                  from public.product_events p
                  where p.created_at >= v_since and p.name = 'practice_start' and p.props ->> 'game' = g.game
                ) s group by s.person having count(*) >= 2
              ) r) as repeaters,
             (select count(distinct x.person) from (
                select coalesce(p.visitor, p.user_id::text) as person, p.created_at,
                       lag(p.created_at) over (partition by coalesce(p.visitor, p.user_id::text) order by p.created_at) as prev
                from public.product_events p
                where p.created_at >= v_since - interval '7 days' and p.name = 'practice_start' and p.props ->> 'game' = g.game
              ) x where x.prev is not null and x.created_at >= v_since
                    and x.created_at - x.prev > interval '1 hour' and x.created_at - x.prev <= interval '7 days') as returned_7d,
             round(avg((g.props ->> 'sec')::numeric) filter (where g.name = 'practice_exit' and g.props ->> 'sec' ~ '^[0-9]{1,5}$')) as active_sec,
             round(avg((g.props ->> 'before')::numeric) filter (where g.name = 'practice_feel' and g.props ->> 'before' ~ '^[1-5]$'), 2) as before,
             round(avg((g.props ->> 'after')::numeric) filter (where g.name = 'practice_feel' and g.props ->> 'after' ~ '^[1-5]$'), 2) as after,
             count(*) filter (where g.name = 'practice_feel' and g.props ->> 'useful' = '3') as useful_yes,
             count(*) filter (where g.name = 'practice_feel' and g.props ->> 'useful' = '2') as useful_some,
             count(*) filter (where g.name = 'practice_feel' and g.props ->> 'useful' = '1') as useful_no,
             round(avg((g.props ->> 'sec')::numeric) filter (where g.name = 'practice_feel' and g.props ->> 'sec' ~ '^[0-9]{1,5}$')) as seconds
      from (
        select p.name, p.props, p.props ->> 'game' as game, coalesce(p.visitor, p.user_id::text) as person
        from public.product_events p
        where p.created_at >= v_since
          and p.name in ('practice_open', 'practice_start', 'practice_complete', 'practice_session_end', 'practice_exit', 'practice_restart', 'practice_feel')
          and p.props ? 'game'
      ) g
      group by g.game
    ) t
  ), '[]'::jsonb);
end;
$f$;
revoke execute on function public.practice_report(int) from public, anon;
grant execute on function public.practice_report(int) to authenticated;
