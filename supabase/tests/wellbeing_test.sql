-- Самочувствие, самооценка и цели (pgTAP). Запуск: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'psy-wb@test.local', '{"name":"Анна"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'psy-wb2@test.local', '{"name":"Борис"}'),
  ('00000000-0000-0000-0000-0000000000f1', 'c-wb@test.local', '{"name":"Клара"}');
insert into public.psychologists (user_id, slug, full_name, status, specializations, education) values
  ('00000000-0000-0000-0000-0000000000e1', 'pgtap-wb-anna', 'Анна', 'approved', '{anxiety}', '[{"institution":"X"}]'),
  ('00000000-0000-0000-0000-0000000000e2', 'pgtap-wb-boris', 'Борис', 'approved', '{anxiety}', '[{"institution":"X"}]');
insert into public.invites (psychologist_id, code) values ('00000000-0000-0000-0000-0000000000e1', 'pgtapwb001');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000f1');
insert into public.checkins (day, mood, energy, calm, sleep, feelings, note) values
  (current_date - 1, 2, 2, 1, 3, '{тревога}', 'Тяжёлый день'),
  (current_date, 4, 3, 3, 4, '{спокойствие}', null);
select throws_ok($$ insert into public.checkins (day, mood) values (current_date, 3) $$, '23505', null, 'одна отметка в день');
select throws_ok($$ insert into public.checkins (day, mood) values (current_date - 5, 9) $$, '23514', null, 'шкала 1–5');
insert into public.self_assessments (answers) values ('{"sleep":4,"work":6}');
insert into public.goals (title, why, progress) values ('Ложиться до 23:00', 'Высыпаться', 20);
insert into public.goal_updates (goal_id, note, progress) select id, 'Три дня подряд', 40 from public.goals;
select throws_ok(
  $$ insert into public.checkins (user_id, day, mood) values ('00000000-0000-0000-0000-0000000000e1', current_date, 3) $$,
  '42501', null, 'нельзя писать отметку за другого');

-- Подключается и разрешает только самочувствие
select public.accept_invite('pgtapwb001', '{wellbeing}', 'test');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
select is((select count(*)::int from public.checkins), 0, 'напрямую психолог отметки не видит');
select is((select count(*)::int from public.client_checkins('00000000-0000-0000-0000-0000000000f1')), 2, 'через функцию — видит по согласию');
select is((select count(*)::int from public.client_checkins('00000000-0000-0000-0000-0000000000f1', current_date)), 1, 'фильтр по периоду');
select is((select count(*)::int from public.client_assessments('00000000-0000-0000-0000-0000000000f1')), 1, 'самооценка входит в самочувствие');
select throws_ok($$ select * from public.client_goals('00000000-0000-0000-0000-0000000000f1') $$, 'P0001', 'forbidden', 'цели без согласия закрыты');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e2');
select throws_ok($$ select * from public.client_checkins('00000000-0000-0000-0000-0000000000f1') $$, 'P0001', 'forbidden', 'чужой психолог не видит самочувствие');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000f1');
select public.set_consent((select id from public.client_links limit 1), 'goals', true);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
select is((select title from public.client_goals('00000000-0000-0000-0000-0000000000f1')), 'Ложиться до 23:00', 'после согласия цели видны');
select is((select jsonb_array_length(updates) from public.client_goals('00000000-0000-0000-0000-0000000000f1')), 1, 'вместе с отметками прогресса');
update public.goals set progress = 100;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f1');
select is((select progress::int from public.goals), 20, 'психолог не может менять цели клиента');

select public.set_consent((select id from public.client_links limit 1), 'wellbeing', false);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
select throws_ok($$ select * from public.client_checkins('00000000-0000-0000-0000-0000000000f1') $$, 'P0001', 'forbidden', 'после отзыва согласия закрыто сразу');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000f1');
select is((select count(*)::int from public.checkins), 2, 'клиент свои отметки видит всегда');

select * from finish();
rollback;
