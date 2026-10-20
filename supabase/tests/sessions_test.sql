-- Расписание и запись (pgTAP). Запуск: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'psy@test.local', '{"name":"Анна"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'c1@test.local', '{"name":"Клара"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'c2@test.local', '{"name":"Карл"}');
-- Опубликованный психолог: каждый день с 10:00 до 13:00, сеанс 50 минут + 10 минут перерыв, запись за 0 часов.
insert into public.psychologists (user_id, slug, full_name, status, specializations, education, booking_notice_hours, timezone)
values ('00000000-0000-0000-0000-0000000000a1', 'pgtap-anna-s', 'Анна', 'approved', '{anxiety}', '[{"institution":"X"}]', 0, 'Asia/Almaty');
insert into public.availability (psychologist_id, weekday, start_min, end_min)
select '00000000-0000-0000-0000-0000000000a1', d, 600, 780 from generate_series(1, 7) d;

select pg_temp.act_as_anon();
select ok((select count(*) from public.free_slots('00000000-0000-0000-0000-0000000000a1', 3)) >= 6, 'гость видит свободные окна опубликованного психолога');
select throws_ok($$ select * from public.sessions $$, '42501', null, 'гость не видит записи');

-- Слот завтра в 10:00 по Алматы
create temp table t as select ((now() at time zone 'Asia/Almaty')::date + 1 + time '10:00') at time zone 'Asia/Almaty' as slot;
grant select on t to authenticated, anon;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok($$ select public.book_session('00000000-0000-0000-0000-0000000000a1', (select slot from t) + interval '7 minutes') $$,
  'P0001', 'slot taken', 'нельзя записаться не на начало окна');
select isnt(public.book_session('00000000-0000-0000-0000-0000000000a1', (select slot from t), 'online', '{wellbeing}', 'test'), null, 'клиент записался из каталога');
select is((select status from public.client_links), 'pending', 'запись из каталога создаёт заявку');
select ok(not exists (select 1 from public.free_slots('00000000-0000-0000-0000-0000000000a1', 3) where starts_at = (select slot from t)), 'занятое окно пропало из свободных');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
select throws_ok($$ select public.book_session('00000000-0000-0000-0000-0000000000a1', (select slot from t)) $$, 'P0001', 'slot taken', 'второй клиент не займёт то же время');
select is((select count(*)::int from public.sessions), 0, 'клиент 2 не видит чужую запись');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'), 0, 'клиент 2 не видит другого клиента');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select is((select name from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'), 'Клара', 'психолог видит имя записавшегося');
select ok(not public.can_view('00000000-0000-0000-0000-0000000000c1', 'wellbeing'), 'до принятия заявки данные клиента закрыты');
select lives_ok(format('select public.accept_request(%L)', (select id from public.client_links where client_id = '00000000-0000-0000-0000-0000000000c1')), 'психолог принимает заявку');
select ok(public.can_view('00000000-0000-0000-0000-0000000000c1', 'wellbeing'), 'после принятия согласие действует');
select throws_ok(
  $$ insert into public.sessions (psychologist_id, client_id, starts_at, ends_at) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', now(), now() + interval '1 hour') $$,
  '42501', null, 'напрямую записи не создаются');
select throws_ok(
  $$ select public.create_session('00000000-0000-0000-0000-0000000000c1', (select slot from t) + interval '20 minutes') $$,
  '23P01', null, 'наложение встреч запрещено базой');
select lives_ok($$ select public.create_session('00000000-0000-0000-0000-0000000000c1', (select slot from t) + interval '1 day') $$, 'психолог назначает встречу клиенту');
select throws_ok($$ select public.complete_session((select id from public.sessions order by starts_at limit 1), 'итоги', '') $$, 'P0001', 'not started', 'будущую встречу нельзя завершить');
select throws_ok($$ select public.create_session('00000000-0000-0000-0000-0000000000c2', (select slot from t) + interval '2 day') $$, 'P0001', 'forbidden', 'нельзя назначить встречу не своему клиенту');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select lives_ok(format('select public.reschedule_session(%L, %L)', (select id from public.sessions order by starts_at limit 1), (select slot from t) + interval '1 hour'), 'клиент переносит встречу на свободное окно');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
select throws_ok(format('select public.cancel_session(%L)', (select id from public.sessions limit 1)), 'P0001', 'forbidden', 'чужую встречу не отменить');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select public.end_link((select id from public.client_links limit 1));
select is((select count(*)::int from public.sessions where status = 'scheduled'), 0, 'отвязка отменяет будущие встречи');

select * from finish();
rollback;
