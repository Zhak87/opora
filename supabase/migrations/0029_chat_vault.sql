-- Замок на разговоры с ИИ: текст сообщений и названия разговоров хранятся зашифрованными
-- (enc1.…, ключ каждого человека выводит сервер из CHAT_ENCRYPTION_KEY, которого в базе нет).
-- База больше не может резать текст разговоров (left() по шифру его ломает), поэтому материал
-- для психолога отдаёт сообщения целиком, а сайт сам расшифровывает и укорачивает их.

comment on column public.messages.content is 'Зашифровано сервером (enc1.…), старые строки до перешифровки — открытым текстом';
comment on column public.conversations.title is 'Название; придуманное из первой реплики хранится зашифрованным (enc1.…)';

create or replace function public.client_ai_material(p_client uuid, p_from date, p_to date)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  result jsonb := '{}';
  scopes text[] := '{}';
begin
  if not public.can_view(p_client, 'analytics') then raise exception 'forbidden'; end if;
  if p_to < p_from or p_to - p_from > 366 then raise exception 'bad period'; end if;

  if public.can_view(p_client, 'wellbeing') then
    scopes := array_append(scopes, 'wellbeing');
    result := result || jsonb_build_object(
      'checkins', coalesce((select jsonb_agg(jsonb_build_object('day', c.day, 'mood', c.mood, 'energy', c.energy, 'calm', c.calm, 'sleep', c.sleep, 'feelings', c.feelings, 'note', c.note) order by c.day)
                              from public.checkins c where c.user_id = p_client and c.day between p_from and p_to), '[]'),
      'balance', coalesce((select jsonb_agg(jsonb_build_object('at', a.created_at::date, 'answers', a.answers, 'note', a.note) order by a.created_at)
                              from public.self_assessments a where a.user_id = p_client and a.created_at::date <= p_to
                               and a.created_at::date >= p_from - 90), '[]'));
  end if;
  if public.can_view(p_client, 'goals') then
    scopes := array_append(scopes, 'goals');
    result := result || jsonb_build_object('goals', coalesce((
      select jsonb_agg(jsonb_build_object('title', g.title, 'why', g.why, 'status', g.status, 'progress', g.progress,
               'steps', (select coalesce(jsonb_agg(jsonb_build_object('at', u.created_at::date, 'note', u.note, 'progress', u.progress) order by u.created_at), '[]')
                           from public.goal_updates u where u.goal_id = g.id and u.created_at::date between p_from and p_to)))
        from public.goals g where g.user_id = p_client), '[]'));
  end if;
  if public.can_view(p_client, 'journal') then
    scopes := array_append(scopes, 'journal');
    result := result || jsonb_build_object('journal', coalesce((
      select jsonb_agg(jsonb_build_object('at', j.created_at::date, 'kind', j.kind, 'text', left(j.content, 1500)) order by j.created_at)
        from (select * from public.journal_entries where user_id = p_client and created_at::date between p_from and p_to order by created_at desc limit 60) j), '[]'));
  end if;
  if public.can_view(p_client, 'ai_chats') then
    scopes := array_append(scopes, 'ai_chats');
    -- Только слова самого клиента: ответы ИИ-собеседника в материал не идут.
    result := result || jsonb_build_object('ai_chats', coalesce((
      select jsonb_agg(jsonb_build_object('at', m.created_at::date, 'text', m.content) order by m.created_at)
        from (select * from public.messages where user_id = p_client and role = 'user' and created_at::date between p_from and p_to order by created_at desc limit 120) m), '[]'));
  end if;
  -- Итоги встреч, которые психолог сам оставил клиенту, — тоже контекст.
  result := result || jsonb_build_object('sessions', coalesce((
    select jsonb_agg(jsonb_build_object('at', s.starts_at::date, 'status', s.status, 'summary', s.summary, 'tasks', s.tasks) order by s.starts_at)
      from public.sessions s where s.client_id = p_client and s.psychologist_id = me and s.starts_at::date between p_from and p_to), '[]'));

  perform public.log_event('client.viewed', p_client, me, jsonb_build_object('what', 'analytics'));
  return jsonb_build_object('scopes', to_jsonb(scopes), 'data', result);
end;
$$;
