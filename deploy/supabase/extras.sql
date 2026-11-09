-- Запускается на облачной базе при переносе: выдаёт SQL, который воссоздаёт то, что лежит вне схемы public.
-- 1) свои триггеры на auth.users (например, создание профиля при регистрации)
select pg_get_triggerdef(t.oid) || ';'
from pg_trigger t
where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;
-- 2) правила доступа к файлам (storage.objects / storage.buckets)
select format('drop policy if exists %I on %I.%I; create policy %I on %I.%I as %s for %s to %s%s%s;',
  policyname, schemaname, tablename, policyname, schemaname, tablename, permissive, cmd,
  array_to_string(array(select quote_ident(r) from unnest(roles) r), ', '),
  case when qual is not null then ' using (' || qual || ')' else '' end,
  case when with_check is not null then ' with check (' || with_check || ')' else '' end)
from pg_policies
where schemaname = 'storage';
