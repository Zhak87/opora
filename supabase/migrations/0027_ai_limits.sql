-- Лимиты на ИИ, чтобы расходы на Gemini не выходили из-под контроля.
-- Счётчик запросов на человека в день (по времени Алматы) и общий потолок на весь сайт в день.

create table public.ai_usage (
  day date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('chat', 'tts', 'stt', 'ai')),
  n int not null default 0,
  primary key (day, kind, user_id)
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

-- Засчитывает один запрос, если человек и весь сайт ещё не упёрлись в лимит. true — можно звать ИИ.
create function public.ai_take(p_kind text, p_user_limit int, p_global_limit int)
returns boolean
language plpgsql volatile security definer set search_path = ''
as $f$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Almaty')::date;
  v_n int;
begin
  if v_uid is null or p_kind not in ('chat', 'tts', 'stt', 'ai') then return false; end if;
  if p_global_limit > 0 and coalesce((select sum(n) from public.ai_usage where day = v_day and kind = p_kind), 0) >= p_global_limit then
    return false;
  end if;
  insert into public.ai_usage as u (day, user_id, kind, n) values (v_day, v_uid, p_kind, 1)
  on conflict (day, kind, user_id) do update set n = u.n + 1 where u.n < p_user_limit
  returning n into v_n;
  return v_n is not null and v_n <= p_user_limit;
end;
$f$;
revoke execute on function public.ai_take(text, int, int) from public, anon;
grant execute on function public.ai_take(text, int, int) to authenticated;

-- Для сотрудников: сколько запросов к ИИ было по дням и видам и сколько людей упёрлись в лимит.
create function public.ai_usage_report(p_days int default 14)
returns table (day date, kind text, requests bigint, people bigint, top int)
language plpgsql stable security definer set search_path = ''
as $f$
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  return query
    select u.day, u.kind, sum(u.n)::bigint, count(*)::bigint, max(u.n)
      from public.ai_usage u
     where u.day >= (now() at time zone 'Asia/Almaty')::date - greatest(1, least(p_days, 90))
     group by u.day, u.kind order by u.day desc, u.kind;
end;
$f$;
revoke execute on function public.ai_usage_report(int) from public, anon;
grant execute on function public.ai_usage_report(int) to authenticated;
