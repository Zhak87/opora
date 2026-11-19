-- Продление видеовстречи психологом: разговор не должен обрываться ровно по расписанию.
-- Меняется только конец встречи: номер видеокомнаты (video_epoch) и напоминания от этого не меняются,
-- поэтому звонок продолжается без переподключения. Пересечение со следующей встречей психолога
-- не даст ограничение sessions_no_overlap.

create function public.extend_session(p_session uuid, p_minutes int)
returns timestamptz
language plpgsql security definer set search_path = ''
as $f$
declare
  me uuid := auth.uid();
  x public.sessions;
  new_end timestamptz;
begin
  if p_minutes is null or p_minutes < 5 or p_minutes > 60 then raise exception 'bad minutes'; end if;
  select * into x from public.sessions where id = p_session for update;
  if x.id is null or x.psychologist_id is distinct from me then raise exception 'forbidden'; end if;
  if not public.psy_active(me) then raise exception 'forbidden'; end if;
  if x.status <> 'scheduled' or x.format <> 'online' then raise exception 'not scheduled'; end if;
  if x.starts_at > now() + interval '15 minutes' then raise exception 'not started'; end if;
  -- Пока комната открыта (до 30 минут после конца): продлеваем от конца или от «сейчас», если конец уже прошёл.
  if now() > x.ends_at + interval '30 minutes' then raise exception 'ended'; end if;
  new_end := greatest(x.ends_at, now()) + make_interval(mins => p_minutes);
  -- Одна встреча — не дольше 4 часов.
  if new_end - x.starts_at > interval '4 hours' then raise exception 'too long'; end if;
  update public.sessions set ends_at = new_end, updated_at = now() where id = p_session;
  perform public.log_event('session.extended', x.client_id, x.psychologist_id,
    jsonb_build_object('session', p_session, 'from', x.ends_at, 'to', new_end));
  return new_end;
end;
$f$;

revoke execute on function public.extend_session(uuid, int) from public, anon;
grant execute on function public.extend_session(uuid, int) to authenticated;
