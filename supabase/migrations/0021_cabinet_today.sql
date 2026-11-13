-- Рабочий день психолога: ручная отметка оплаты, «клиент не пришёл», пауза в работе с клиентом,
-- срок бесплатной отмены и пометка поздней отмены.
-- Онлайн-оплаты здесь нет: психолог сам отмечает, что встреча оплачена (перевод, наличные).

alter table public.sessions
  add column paid_at timestamptz,
  add column no_show boolean not null default false,
  -- Клиент отменил позже срока бесплатной отмены, который задал психолог.
  add column late_cancel boolean not null default false;

alter table public.psychologists
  add column cancel_hours int not null default 24 check (cancel_hours between 0 and 168);

alter table public.client_links
  add column paused_at timestamptz;

-- Психолог отмечает оплату вручную (или снимает отметку).
create function public.set_session_paid(p_session uuid, p_paid boolean)
returns void
language plpgsql security definer set search_path = ''
as $f$
declare
  x public.sessions;
begin
  select * into x from public.sessions where id = p_session for update;
  if x.id is null or x.psychologist_id is distinct from auth.uid() or not public.psy_active(auth.uid()) then raise exception 'forbidden'; end if;
  update public.sessions
     set payment_status = case when p_paid then 'paid' else 'none' end,
         paid_at = case when p_paid then now() else null end,
         updated_at = now()
   where id = p_session;
end;
$f$;

-- «Клиент не пришёл»: встреча закрывается без итогов. Отметку можно снять.
create function public.set_session_no_show(p_session uuid, p_no_show boolean)
returns void
language plpgsql security definer set search_path = ''
as $f$
declare
  x public.sessions;
begin
  select * into x from public.sessions where id = p_session for update;
  if x.id is null or x.psychologist_id is distinct from auth.uid() or not public.psy_active(auth.uid()) then raise exception 'forbidden'; end if;
  if x.status = 'cancelled' then raise exception 'cancelled'; end if;
  if x.starts_at > now() then raise exception 'not started'; end if;
  update public.sessions set no_show = p_no_show, status = 'completed', updated_at = now() where id = p_session;
  if x.status = 'scheduled' then
    perform public.log_event('session.finished', x.client_id, x.psychologist_id, jsonb_build_object('session', p_session));
  end if;
end;
$f$;

-- Пауза в работе с клиентом: связь и доступы остаются, клиент просто уходит из списка активных.
create function public.set_client_paused(p_link uuid, p_paused boolean)
returns void
language plpgsql security definer set search_path = ''
as $f$
declare
  l public.client_links;
begin
  select * into l from public.client_links where id = p_link for update;
  if l.id is null or l.psychologist_id is distinct from auth.uid() or l.status <> 'active' then raise exception 'forbidden'; end if;
  update public.client_links set paused_at = case when p_paused then now() else null end where id = p_link;
end;
$f$;

-- Отмена: если клиент отменяет позже срока бесплатной отмены, встреча помечается как поздняя отмена.
create or replace function public.cancel_session(p_session uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $f$
declare
  me uuid := auth.uid();
  x public.sessions;
  hours int;
begin
  select * into x from public.sessions where id = p_session for update;
  if x.id is null or (x.client_id is distinct from me and x.psychologist_id is distinct from me) then raise exception 'forbidden'; end if;
  if x.status <> 'scheduled' then return; end if;
  select cancel_hours into hours from public.psychologists where user_id = x.psychologist_id;
  update public.sessions
     set status = 'cancelled', cancelled_by = me, cancel_reason = nullif(left(trim(p_reason), 500), ''),
         late_cancel = (me = x.client_id and x.starts_at - now() < make_interval(hours => coalesce(hours, 0))),
         updated_at = now()
   where id = p_session;
  perform public.log_event('session.cancelled', x.client_id, x.psychologist_id, jsonb_build_object('session', p_session, 'at', x.starts_at));
end;
$f$;

revoke execute on function public.set_session_paid(uuid, boolean) from public, anon;
revoke execute on function public.set_session_no_show(uuid, boolean) from public, anon;
revoke execute on function public.set_client_paused(uuid, boolean) from public, anon;
revoke execute on function public.cancel_session(uuid, text) from public, anon;
