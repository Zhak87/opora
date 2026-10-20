-- ИИ-аналитика и заметки психолога (pgTAP). Запуск: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a7', 'psy-ai@test.local', '{"name":"Анна"}'),
  ('00000000-0000-0000-0000-0000000000b7', 'psy-ai2@test.local', '{"name":"Борис"}'),
  ('00000000-0000-0000-0000-0000000000c7', 'c-ai@test.local', '{"name":"Клара"}');
insert into public.psychologists (user_id, slug, full_name, status, specializations, education) values
  ('00000000-0000-0000-0000-0000000000a7', 'pgtap-ai-anna', 'Анна', 'approved', '{anxiety}', '[{"institution":"X"}]'),
  ('00000000-0000-0000-0000-0000000000b7', 'pgtap-ai-boris', 'Борис', 'approved', '{anxiety}', '[{"institution":"X"}]');
insert into public.invites (psychologist_id, code) values ('00000000-0000-0000-0000-0000000000a7', 'pgtapai001');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c7');
insert into public.checkins (day, mood, note) values (current_date, 2, 'Тревожно');
insert into public.journal_entries (content) values ('Секретная запись дневника');
insert into public.conversations (id, title) values ('00000000-0000-0000-0000-00000000c0c7', 'Разговор');
insert into public.messages (conversation_id, role, content) values
  ('00000000-0000-0000-0000-00000000c0c7', 'user', 'Мне трудно уснуть'),
  ('00000000-0000-0000-0000-00000000c0c7', 'assistant', 'Ответ ИИ');
-- Разрешила самочувствие и разговоры с ИИ, но не аналитику и не дневник
select public.accept_invite('pgtapai001', '{wellbeing,ai_chats}', 'test');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a7');
select throws_ok($$ select public.client_ai_material('00000000-0000-0000-0000-0000000000c7', current_date - 30, current_date) $$,
  'P0001', 'forbidden', 'без согласия на аналитику материал не собрать');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c7');
select public.set_consent((select id from public.client_links limit 1), 'analytics', true);

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a7');
create temp table mat as select public.client_ai_material('00000000-0000-0000-0000-0000000000c7', current_date - 30, current_date) as j;
select is((select j->'scopes' from mat), '["wellbeing", "ai_chats"]'::jsonb, 'в материал вошли только разрешённые виды данных');
select is((select jsonb_array_length(j->'data'->'checkins') from mat), 1, 'отметки самочувствия есть');
select ok((select not (j->'data' ? 'journal') from mat), 'дневника нет — на него нет согласия');
select ok((select not (j->'data' ? 'goals') from mat), 'целей нет — на них нет согласия');
select is((select j->'data'->'ai_chats'->0->>'text' from mat), 'Мне трудно уснуть', 'из разговоров с ИИ — только слова клиента');
select is((select jsonb_array_length(j->'data'->'ai_chats') from mat), 1, 'ответы ИИ не попадают');
select throws_ok($$ select public.client_ai_material('00000000-0000-0000-0000-0000000000c7', current_date - 400, current_date) $$, 'P0001', 'bad period', 'не больше года');

select isnt(public.save_ai_report('00000000-0000-0000-0000-0000000000c7', current_date - 30, current_date, '{wellbeing}', 'test', '{"summary":"ok"}'), null, 'отчёт сохранён');
select throws_ok($$ insert into public.ai_reports (psychologist_id, client_id, period_from, period_to, scopes, report) values ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000c7', current_date, current_date, '{}', '{}') $$,
  '42501', null, 'напрямую отчёт не записать');
insert into public.psychologist_notes (client_id, kind, body) values ('00000000-0000-0000-0000-0000000000c7', 'hypothesis', 'Возможно, тревога связана с работой');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c7');
select is((select count(*)::int from public.psychologist_notes), 0, 'клиент не видит заметки психолога');
select is((select count(*)::int from public.ai_reports), 0, 'и отчёты тоже');
select ok(exists (select 1 from public.audit_log where action = 'analytics.generated'), 'клиент видит в журнале, что готовилась сводка');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b7');
select throws_ok($$ insert into public.psychologist_notes (client_id, body) values ('00000000-0000-0000-0000-0000000000c7', 'x') $$, '42501', null, 'чужой психолог не пишет заметки о клиенте');

-- Отзыв согласия на аналитику прячет и старые отчёты
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c7');
select public.set_consent((select id from public.client_links limit 1), 'analytics', false);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a7');
select is((select count(*)::int from public.ai_reports), 0, 'после отзыва согласия отчёты скрыты');

select * from finish();
rollback;
