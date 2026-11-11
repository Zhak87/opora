-- Практики по документу «Игры» (2026-11-11): «как вы сейчас» до и после, полезность и повторы.
-- Новое событие practice_feel: { game, before 1–5, after 1–5, useful 1–3, sec } — только цифры, без текстов.

create or replace function public.track_event(p_name text, p_visitor text, p_props jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer set search_path = ''
as $f$
begin
  if p_name not in (
    'landing_view', 'guide_start', 'guide_complete', 'trial_start', 'signup_start', 'signup_complete',
    'app_open', 'chat_start', 'chat_reply', 'chat_rated', 'step_offered', 'step_taken', 'practice_start', 'practice_complete', 'journal_entry',
    'need_pick', 'room_view', 'room_join', 'room_create', 'psychologist_view', 'contact_request', 'practice_feel'
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

-- Отчёт по практикам для сотрудников: начали, прошли, сколько людей вернулось повторно,
-- среднее «как вы» до и после, полезность и среднее время.
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
             count(*) filter (where g.name = 'practice_start') as started,
             count(*) filter (where g.name = 'practice_complete') as completed,
             count(distinct g.person) filter (where g.name = 'practice_start') as people,
             (select count(*) from (
                select s.person from (
                  select coalesce(p.visitor, p.user_id::text) as person
                  from public.product_events p
                  where p.created_at >= v_since and p.name = 'practice_start' and p.props ->> 'game' = g.game
                ) s group by s.person having count(*) >= 2
              ) r) as repeaters,
             round(avg((g.props ->> 'before')::numeric) filter (where g.name = 'practice_feel' and g.props ->> 'before' ~ '^[1-5]$'), 2) as before,
             round(avg((g.props ->> 'after')::numeric) filter (where g.name = 'practice_feel' and g.props ->> 'after' ~ '^[1-5]$'), 2) as after,
             count(*) filter (where g.name = 'practice_feel' and g.props ->> 'useful' = '3') as useful_yes,
             count(*) filter (where g.name = 'practice_feel' and g.props ->> 'useful' = '2') as useful_some,
             count(*) filter (where g.name = 'practice_feel' and g.props ->> 'useful' = '1') as useful_no,
             round(avg((g.props ->> 'sec')::numeric) filter (where g.name = 'practice_feel' and g.props ->> 'sec' ~ '^[0-9]{1,5}$')) as seconds
      from (
        select p.name, p.props, p.props ->> 'game' as game, coalesce(p.visitor, p.user_id::text) as person
        from public.product_events p
        where p.created_at >= v_since and p.name in ('practice_start', 'practice_complete', 'practice_feel') and p.props ? 'game'
      ) g
      group by g.game
    ) t
  ), '[]'::jsonb);
end;
$f$;
revoke execute on function public.practice_report(int) from public, anon;
grant execute on function public.practice_report(int) to authenticated;

-- Память о практиках: что человек прошёл и к чему пришёл. Нужна, чтобы собеседник учитывал это в разговоре,
-- а на странице практик было видно «Моё небо» (звезда за каждое прохождение). Видит и удаляет только сам человек.
create table public.practice_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game text not null check (game ~ '^[a-z0-9-]{1,24}$'),
  feel_before smallint check (feel_before between 1 and 5),
  feel_after smallint check (feel_after between 1 and 5),
  useful smallint check (useful between 1 and 3),
  summary text check (char_length(summary) <= 1200),
  created_at timestamptz not null default now()
);
create index practice_runs_user_created_idx on public.practice_runs (user_id, created_at desc);
alter table public.practice_runs enable row level security;
create policy "own practice runs" on public.practice_runs
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
