-- Переписка и уведомления (pgTAP). Запуск: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'psy-chat@test.local', '{"name":"Анна"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'psy-other@test.local', '{"name":"Борис"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'c-chat@test.local', '{"name":"Клара"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'c-other@test.local', '{"name":"Карл"}');
insert into public.psychologists (user_id, slug, full_name, status, specializations, education, booking_notice_hours) values
  ('00000000-0000-0000-0000-0000000000b1', 'pgtap-chat-anna', 'Анна', 'approved', '{anxiety}', '[{"institution":"X"}]', 0),
  ('00000000-0000-0000-0000-0000000000b2', 'pgtap-chat-boris', 'Борис', 'approved', '{anxiety}', '[{"institution":"X"}]', 0);
insert into public.availability (psychologist_id, weekday, start_min, end_min)
select '00000000-0000-0000-0000-0000000000b1', d, 600, 780 from generate_series(1, 7) d;
insert into public.invites (psychologist_id, code) values ('00000000-0000-0000-0000-0000000000b1', 'pgtapchat01');

/* Клиент подключается по приглашению: психолог получает уведомление */
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select public.accept_invite('pgtapchat01', '{wellbeing}', 'test');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
select is((select count(*)::int from public.care_notifications where kind = 'link.created'), 1, 'психолог узнал о новом клиенте');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select is((select count(*)::int from public.care_notifications), 0, 'о своём действии уведомления нет');

/* Переписка */
select isnt(public.send_care_message('00000000-0000-0000-0000-0000000000b1', '  Здравствуйте!  '), null, 'клиент пишет своему психологу');
select is((select body from public.care_messages), 'Здравствуйте!', 'пробелы по краям убраны');
select throws_ok($$ select public.send_care_message('00000000-0000-0000-0000-0000000000b2', 'привет') $$, 'P0001', 'forbidden', 'нельзя писать чужому психологу');
select throws_ok($$ select public.send_care_message('00000000-0000-0000-0000-0000000000b1', '   ') $$, 'P0001', 'empty', 'пустое не отправить');
select throws_ok(
  $$ insert into public.care_messages (psychologist_id, client_id, sender_id, body) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d1', 'x') $$,
  '42501', null, 'напрямую сообщения не пишутся');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
select is((select unread from public.care_unread() where peer = '00000000-0000-0000-0000-0000000000d1'), 1, 'у психолога одно непрочитанное');
select is(public.mark_care_read('00000000-0000-0000-0000-0000000000d1'), 1, 'психолог прочитал');
select isnt((select read_at from public.care_messages limit 1), null, 'отметка о прочтении видна');
select lives_ok($$ select public.send_care_message('00000000-0000-0000-0000-0000000000d1', 'Добрый день') $$, 'психолог отвечает');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b2');
select is((select count(*)::int from public.care_messages), 0, 'чужой психолог переписку не видит');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d2');
select is((select count(*)::int from public.care_messages), 0, 'другой клиент переписку не видит');
select is((select count(*)::int from public.care_notifications), 0, 'и чужих уведомлений не видит');

/* Психолог назначает встречу — клиент получает уведомление */
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
select public.create_session('00000000-0000-0000-0000-0000000000d1', now() + interval '3 days');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
select is((select kind from public.care_notifications order by created_at desc limit 1), 'session.booked', 'клиент узнал о назначенной встрече');

/* После отвязки психолог больше не видит переписку, клиент — видит */
select public.end_link((select id from public.client_links limit 1));
select is((select count(*)::int from public.care_messages), 2, 'клиент сохраняет свою переписку');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
select is((select count(*)::int from public.care_messages), 0, 'после отвязки психолог переписку не видит');

select * from finish();
rollback;
