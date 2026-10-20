-- Этап 3: личная переписка клиента и психолога, уведомления о событиях работы.
-- Сообщения пишутся и отмечаются прочитанными только через функции ниже.
-- Уведомления создаёт база сама, из журнала действий: каждый участник узнаёт о том, что сделал другой.

/* ---------- Переписка ---------- */

create table public.care_messages (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologists (user_id) on delete cascade,
  client_id uuid not null references auth.users (id) on delete cascade,
  link_id uuid references public.client_links (id) on delete set null,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id in (psychologist_id, client_id))
);
create index care_messages_pair_idx on public.care_messages (psychologist_id, client_id, created_at desc);
create index care_messages_unread_idx on public.care_messages (client_id, psychologist_id) where read_at is null;
alter table public.care_messages enable row level security;

-- Клиент всегда видит свою переписку. Психолог — только пока клиент с ним работает или ждёт ответа на заявку.
create policy "care messages client" on public.care_messages
  for select to authenticated
  using (client_id = (select auth.uid()));
create policy "care messages psychologist" on public.care_messages
  for select to authenticated
  using (psychologist_id = (select auth.uid()) and public.is_my_client_or_request(client_id));
revoke insert, update, delete on public.care_messages from anon, authenticated;

-- Отправить сообщение другому участнику открытой связи. p_to — клиент (для психолога) или психолог (для клиента).
create function public.send_care_message(p_to uuid, p_body text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  l public.client_links;
  body text := left(btrim(coalesce(p_body, '')), 4000);
  mid uuid;
begin
  if me is null then raise exception 'forbidden'; end if;
  if body = '' then raise exception 'empty'; end if;
  select * into l from public.client_links
   where status in ('pending', 'active')
     and ((psychologist_id = me and client_id = p_to) or (client_id = me and psychologist_id = p_to))
   limit 1;
  if l.id is null then raise exception 'forbidden'; end if;
  -- Не больше 30 сообщений за минуту от одного человека.
  if (select count(*) from public.care_messages where sender_id = me and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'too many';
  end if;
  insert into public.care_messages (psychologist_id, client_id, link_id, sender_id, body)
  values (l.psychologist_id, l.client_id, l.id, me, body)
  returning id into mid;
  return mid;
end;
$$;

-- Отметить прочитанными все сообщения от собеседника.
create function public.mark_care_read(p_with uuid)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  n int;
begin
  update public.care_messages
     set read_at = now()
   where read_at is null
     and sender_id = p_with
     and ((client_id = me and psychologist_id = p_with)
       or (psychologist_id = me and client_id = p_with and public.is_my_client_or_request(p_with)));
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Непрочитанные сообщения для меня, по собеседникам.
create function public.care_unread()
returns table (peer uuid, unread int)
language sql stable security definer set search_path = ''
as $$
  select case when m.client_id = (select auth.uid()) then m.psychologist_id else m.client_id end, count(*)::int
    from public.care_messages m
   where m.read_at is null
     and m.sender_id <> (select auth.uid())
     and (m.client_id = (select auth.uid())
       or (m.psychologist_id = (select auth.uid()) and public.is_my_client_or_request(m.client_id)))
   group by 1
$$;

/* ---------- Уведомления ---------- */

create table public.care_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- событие из журнала: session.booked, session.cancelled, link.requested и т. д.
  kind text not null,
  actor_id uuid,
  client_id uuid,
  psychologist_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index care_notifications_user_idx on public.care_notifications (user_id, created_at desc);
alter table public.care_notifications enable row level security;
create policy "care notifications own" on public.care_notifications
  for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.care_notifications from anon, authenticated;

-- Событие из журнала превращается в уведомление для второй стороны (не для того, кто действовал).
create function public.notify_from_audit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  target uuid;
  names jsonb;
begin
  if new.action not in (
    'link.requested', 'link.created', 'link.ended',
    'session.booked', 'session.rescheduled', 'session.cancelled', 'session.completed',
    'psychologist.reviewed'
  ) then
    return new;
  end if;
  -- Имена на момент события: после завершения работы психолог уже не видит профиль клиента,
  -- но уведомление о событии должно остаться понятным.
  names := jsonb_build_object(
    'client_name', (select p.name from public.profiles p where p.id = new.client_id),
    'psychologist_name', (select ps.full_name from public.psychologists ps where ps.user_id = new.psychologist_id)
  );
  foreach target in array array[new.client_id, new.psychologist_id] loop
    if target is not null and target is distinct from new.actor_id then
      insert into public.care_notifications (user_id, kind, actor_id, client_id, psychologist_id, details)
      values (target, new.action, new.actor_id, new.client_id, new.psychologist_id, new.details || jsonb_strip_nulls(names));
    end if;
  end loop;
  return new;
end;
$$;
create trigger audit_log_notify after insert on public.audit_log
  for each row execute function public.notify_from_audit();

create function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language sql security definer set search_path = ''
as $$
  update public.care_notifications
     set read_at = now()
   where user_id = (select auth.uid()) and read_at is null and (p_ids is null or id = any (p_ids))
$$;

revoke execute on function public.send_care_message(uuid, text) from public, anon;
revoke execute on function public.mark_care_read(uuid) from public, anon;
revoke execute on function public.care_unread() from public, anon;
revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
revoke execute on function public.notify_from_audit() from public, anon, authenticated;
