-- Проверка правил доступа для психологов и клиентов (pgTAP).
-- Запуск на локальной копии: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- Действовать от имени пользователя (как это делает API Supabase).
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
create function pg_temp.reset() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'psy-a@test.local', '{"name":"Анна"}'),
  ('00000000-0000-0000-0000-00000000000b', 'psy-b@test.local', '{"name":"Борис"}'),
  ('00000000-0000-0000-0000-00000000000c', 'client@test.local', '{"name":"Клара"}'),
  ('00000000-0000-0000-0000-00000000000d', 'admin@test.local', '{"name":"Админ"}');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-00000000000d');

/* Анкета */
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.psychologists (user_id, slug, full_name, status) values ('00000000-0000-0000-0000-00000000000a', 'pgtap-anna', '', 'approved');
select is((select status from public.psychologists where user_id = '00000000-0000-0000-0000-00000000000a'), 'draft', 'новая анкета всегда черновик, даже если прислать approved');

update public.psychologists set status = 'approved' where user_id = '00000000-0000-0000-0000-00000000000a';
select is((select status from public.psychologists where user_id = '00000000-0000-0000-0000-00000000000a'), 'draft', 'сам себе статус approved не поставить');

select throws_ok($$ select public.submit_psychologist() $$, 'P0001', 'incomplete', 'неполную анкету не отправить на проверку');

update public.psychologists
   set full_name = 'Анна Петрова', specializations = '{anxiety}', education = '[{"institution":"КазНУ","degree":"Психолог","year":2015}]'
 where user_id = '00000000-0000-0000-0000-00000000000a';
select is(public.submit_psychologist(), 'pending', 'полная анкета уходит на проверку');
select throws_ok($$ select public.review_psychologist('00000000-0000-0000-0000-00000000000a', 'approved') $$, 'P0001', 'forbidden', 'психолог не может одобрить себя');

select pg_temp.act_as_anon();
select is((select count(*)::int from public.psychologists where user_id = '00000000-0000-0000-0000-00000000000a'), 0, 'гость не видит анкету на проверке');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select lives_ok($$ select public.review_psychologist('00000000-0000-0000-0000-00000000000a', 'approved', 'Документы проверены') $$, 'администратор одобряет');

select pg_temp.act_as_anon();
select is((select slug from public.psychologists where user_id = '00000000-0000-0000-0000-00000000000a'), 'pgtap-anna', 'гость видит опубликованную анкету');
select throws_ok($$ insert into public.invites (psychologist_id, code) values ('00000000-0000-0000-0000-00000000000a', 'guestcode1') $$, '42501', null, 'гость не создаёт приглашения');

-- Психолог B: черновик, без проверки
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
insert into public.psychologists (user_id, slug, full_name) values ('00000000-0000-0000-0000-00000000000b', 'pgtap-boris', 'Борис');
insert into public.invites (code) values ('borisinvite1');
select is((select count(*)::int from public.invite_info('borisinvite1')), 0, 'приглашение непроверенного специалиста не работает');

/* Приглашение и подключение */
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.invites (code, label) values ('annainvite01', 'Instagram');
select is((select count(*)::int from public.invites), 1, 'психолог видит только свои приглашения');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.invites), 0, 'клиент не видит чужие приглашения');
select throws_ok(
  $$ insert into public.client_links (psychologist_id, client_id) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c') $$,
  '42501', null, 'связь нельзя создать напрямую, только через приглашение');
select isnt(public.accept_invite('annainvite01', '{wellbeing,journal}', 'test'), null, 'клиент принимает приглашение');
select is((select count(*)::int from public.consent_grants where revoked_at is null), 2, 'выданы два согласия');
select throws_ok($$ select public.accept_invite('nosuchcode1', '{}', 'test') $$, 'P0001', 'invalid invite', 'неверная ссылка отклоняется');

/* Доступ психологов */
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select ok(public.can_view('00000000-0000-0000-0000-00000000000c', 'journal'), 'психолог A видит дневник по согласию');
select ok(not public.can_view('00000000-0000-0000-0000-00000000000c', 'goals'), 'без согласия цели не видны');
select is((select name from public.profiles where id = '00000000-0000-0000-0000-00000000000c'), 'Клара', 'психолог видит имя своего клиента');
select lives_ok($$ select public.log_client_view('00000000-0000-0000-0000-00000000000c') $$, 'просмотр карточки пишется в журнал');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select ok(not public.can_view('00000000-0000-0000-0000-00000000000c', 'journal'), 'чужой психолог B не видит данные клиента');
select is((select count(*)::int from public.client_links), 0, 'B не видит чужие связи');
select is((select count(*)::int from public.consent_grants), 0, 'B не видит чужие согласия');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000c'), 0, 'B не видит профиль чужого клиента');
select throws_ok($$ select public.log_client_view('00000000-0000-0000-0000-00000000000c') $$, 'P0001', 'forbidden', 'B не может открыть карточку');

/* Отзыв согласия и отвязка */
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select throws_ok(
  format('select public.set_consent(%L, %L, true)', (select id from public.client_links limit 1), 'goals'),
  'P0001', 'forbidden', 'согласие выдаёт только сам клиент');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select public.set_consent((select id from public.client_links limit 1), 'journal', false);
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select ok(not public.can_view('00000000-0000-0000-0000-00000000000c', 'journal'), 'после отзыва дневник сразу недоступен');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select ok((select count(*) from public.audit_log where client_id = '00000000-0000-0000-0000-00000000000c') >= 4, 'клиент видит журнал действий со своими данными');
select public.end_link((select id from public.client_links limit 1));
select is((select count(*)::int from public.consent_grants where revoked_at is null), 0, 'после отвязки все согласия отозваны');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select ok(not public.can_view('00000000-0000-0000-0000-00000000000c', 'wellbeing'), 'после отвязки психолог ничего не видит');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000c'), 0, 'после отвязки имя клиента скрыто');

/* Изменение квалификации у опубликованной анкеты */
update public.psychologists set full_name = 'Анна Иванова' where user_id = '00000000-0000-0000-0000-00000000000a';
select is((select status from public.psychologists where user_id = '00000000-0000-0000-0000-00000000000a'), 'pending', 'смена сведений о квалификации отправляет анкету на повторную проверку');

select pg_temp.reset();
select * from finish();
rollback;
