-- Записи по встрече в трёх уровнях (pgTAP). Запуск: npx supabase test db
-- T15: клиент не получает личную запись психолога. T16: итог без «Поделиться» клиент не видит и не получает уведомления.
-- T17: исправленный итог приходит с пометкой «изменено». T18: обратная связь по заданию живёт в ветке задания, а не в чате.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.as_owner() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'psy@test.local', '{"name":"Анна"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'psy2@test.local', '{"name":"Борис"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'c1@test.local', '{"name":"Клара"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'c2@test.local', '{"name":"Карл"}');
insert into public.psychologists (user_id, slug, full_name, status, specializations, education) values
  ('00000000-0000-0000-0000-0000000000a1', 'pgtap-anna-r', 'Анна', 'approved', '{anxiety}', '[{"institution":"X"}]'),
  ('00000000-0000-0000-0000-0000000000a2', 'pgtap-boris-r', 'Борис', 'approved', '{anxiety}', '[{"institution":"X"}]');
insert into public.client_links (psychologist_id, client_id, status, source, activated_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'active', 'invite', now()),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c2', 'active', 'invite', now());
-- Встреча с Кларой час назад и встреча с Карлом два часа назад.
insert into public.sessions (id, psychologist_id, client_id, starts_at, ends_at) values
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', now() - interval '1 hour', now() - interval '10 minutes'),
  ('00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c2', now() - interval '3 hours', now() - interval '2 hours');
delete from public.care_notifications;

/* ---------- Личная запись ---------- */
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ insert into public.session_notes (session_id, client_id, topic, client_state, hypotheses, summary_draft)
  values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000c1', 'Тревога перед работой', 4, 'Гипотеза: перфекционизм', 'Черновик итога') $$,
  'психолог сохраняет личную запись');
select throws_ok($$ insert into public.session_notes (session_id, client_id, topic)
  values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000c2', 'x') $$,
  '42501', null, 'запись нельзя привязать к чужому клиенту встречи');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select is((select count(*) from public.session_notes), 0::bigint, 'T15: клиент не видит личную запись психолога');
select is((select summary from public.sessions where id = '00000000-0000-0000-0000-00000000e001'), null, 'T16: черновик итога клиенту не виден');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select is((select count(*) from public.session_notes), 0::bigint, 'другой психолог не видит чужую запись');

/* ---------- Завершение без отправки ---------- */
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok($$ select public.finish_session('00000000-0000-0000-0000-00000000e001') $$, 'P0001', 'forbidden', 'клиент не может завершить встречу');
select throws_ok($$ select public.share_summary('00000000-0000-0000-0000-00000000e001', 'сам себе') $$, 'P0001', 'forbidden', 'клиент не может написать итог');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ select public.finish_session('00000000-0000-0000-0000-00000000e001') $$, 'психолог завершает встречу');
select pg_temp.as_owner();
select is((select count(*) from public.care_notifications where user_id = '00000000-0000-0000-0000-0000000000c1'), 0::bigint,
  'T16: завершение без «Поделиться» не уведомляет клиента');

/* ---------- Поделиться и исправить ---------- */
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$ select public.share_summary('00000000-0000-0000-0000-00000000e001', '   ') $$, 'P0001', 'empty', 'пустым итогом поделиться нельзя');
select lives_ok($$ select public.share_summary('00000000-0000-0000-0000-00000000e001', 'Сегодня мы говорили о тревоге.') $$, 'психолог делится итогом');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select is((select summary from public.sessions where id = '00000000-0000-0000-0000-00000000e001'), 'Сегодня мы говорили о тревоге.', 'клиент видит итог после «Поделиться»');
select is((select count(*) from public.care_notifications where kind = 'summary.shared'), 1::bigint, 'клиент получил уведомление об итоге');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select public.share_summary('00000000-0000-0000-0000-00000000e001', 'Сегодня мы говорили о тревоге и сне.');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select ok((select summary = 'Сегодня мы говорили о тревоге и сне.' and summary_edited_at is not null from public.sessions where id = '00000000-0000-0000-0000-00000000e001'),
  'T17: клиент видит последнюю версию с отметкой об изменении');

/* ---------- Задания ---------- */
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
select throws_ok($$ select public.assign_task('00000000-0000-0000-0000-0000000000c1', 'Чужое задание') $$, 'P0001', 'forbidden', 'нельзя назначить задание чужому клиенту');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$ select public.assign_task('00000000-0000-0000-0000-0000000000c1', 'x', null, null, '00000000-0000-0000-0000-00000000e002') $$,
  'P0001', 'forbidden', 'задание нельзя привязать к встрече другого клиента');
create temp table task as select public.assign_task('00000000-0000-0000-0000-0000000000c1', 'Дневник мыслей', 'Три записи за неделю', current_date + 7, '00000000-0000-0000-0000-00000000e001') as id;
grant select on task to authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
select is((select count(*) from public.assignments), 0::bigint, 'другой клиент не видит чужое задание');
select throws_ok($$ select public.set_task_done((select id from task), true, 'не моё') $$, 'P0001', 'forbidden', 'другой клиент не может отметить чужое задание');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok($$ update public.assignments set title = 'взлом' $$, '42501', null, 'клиент не может править задание напрямую');
select lives_ok($$ select public.set_task_done((select id from task), true, 'Было непросто, но получилось') $$, 'клиент отмечает выполнение и пишет обратную связь');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is((select body from public.assignment_replies where assignment_id = (select id from task)), 'Было непросто, но получилось', 'T18: обратная связь лежит в ветке задания');
select is((select count(*) from public.care_messages), 0::bigint, 'T18: в общий чат ничего не попало');
select is((select count(*) from public.care_notifications where kind = 'task.done'), 1::bigint, 'психолог получил одно уведомление о выполнении');

select public.update_task((select id from task), 'x', null, null, true);
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select is((select count(*) from public.assignments), 0::bigint, 'снятое задание клиент больше не видит');

select * from finish();
rollback;
