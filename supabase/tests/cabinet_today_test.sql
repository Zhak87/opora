-- Оплата вручную, «не пришёл», пауза клиента и поздняя отмена (pgTAP). Запуск: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'psy@test.local', '{"name":"Анна"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'c1@test.local', '{"name":"Клара"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'c2@test.local', '{"name":"Карл"}');
insert into public.psychologists (user_id, slug, full_name, status, specializations, education, cancel_hours) values
  ('00000000-0000-0000-0000-0000000000a1', 'pgtap-anna-t', 'Анна', 'approved', '{anxiety}', '[{"institution":"X"}]', 24);
insert into public.client_links (id, psychologist_id, client_id, status, source, activated_at) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'active', 'invite', now());
insert into public.sessions (id, psychologist_id, client_id, starts_at, ends_at) values
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', now() - interval '2 hours', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', now() + interval '3 hours', now() + interval '4 hours'),
  ('00000000-0000-0000-0000-00000000e003', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', now() + interval '3 days', now() + interval '3 days 1 hour');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok($$ select public.set_session_paid('00000000-0000-0000-0000-00000000e001', true) $$, 'P0001', 'forbidden', 'клиент не может отметить оплату сам');
select throws_ok($$ select public.set_session_no_show('00000000-0000-0000-0000-00000000e001', false) $$, 'P0001', 'forbidden', 'клиент не может менять отметку «не пришёл»');
select throws_ok($$ select public.set_client_paused('00000000-0000-0000-0000-00000000f001', true) $$, 'P0001', 'forbidden', 'клиент не может поставить паузу');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ select public.set_session_paid('00000000-0000-0000-0000-00000000e001', true) $$, 'психолог отмечает оплату');
select ok((select payment_status = 'paid' and paid_at is not null from public.sessions where id = '00000000-0000-0000-0000-00000000e001'), 'встреча оплачена');
select public.set_session_paid('00000000-0000-0000-0000-00000000e001', false);
select is((select payment_status from public.sessions where id = '00000000-0000-0000-0000-00000000e001'), 'none', 'отметку оплаты можно снять');
select throws_ok($$ select public.set_session_no_show('00000000-0000-0000-0000-00000000e002', true) $$, 'P0001', 'not started', '«не пришёл» нельзя поставить до начала встречи');
select public.set_session_no_show('00000000-0000-0000-0000-00000000e001', true);
select ok((select no_show and status = 'completed' from public.sessions where id = '00000000-0000-0000-0000-00000000e001'), '«не пришёл» закрывает встречу');
select public.set_client_paused('00000000-0000-0000-0000-00000000f001', true);
select ok((select paused_at is not null and status = 'active' from public.client_links where id = '00000000-0000-0000-0000-00000000f001'), 'пауза не разрывает связь');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select public.cancel_session('00000000-0000-0000-0000-00000000e002');
select ok((select late_cancel from public.sessions where id = '00000000-0000-0000-0000-00000000e002'), 'отмена клиентом за 3 часа — поздняя');
select public.cancel_session('00000000-0000-0000-0000-00000000e003');
select ok((select not late_cancel and status = 'cancelled' from public.sessions where id = '00000000-0000-0000-0000-00000000e003'), 'отмена за 3 дня — обычная');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c2');
select is((select count(*) from public.sessions), 0::bigint, 'посторонний не видит встречи');

select * from finish();
rollback;
