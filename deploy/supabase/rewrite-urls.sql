-- Меняет ссылки на файлы облачного Supabase на свой домен во всех текстовых колонках схемы public.
-- psql -v old=https://xxx.supabase.co -v new=https://myopora.kz
select set_config('opora.old', :'old', false), set_config('opora.new', :'new', false);
do $$
declare r record; o text := current_setting('opora.old'); n text := current_setting('opora.new');
begin
  for r in select table_name, column_name from information_schema.columns
           where table_schema = 'public' and data_type in ('text', 'character varying', 'jsonb') loop
    if (select data_type from information_schema.columns where table_schema='public' and table_name=r.table_name and column_name=r.column_name) = 'jsonb' then
      execute format('update public.%I set %I = replace(%I::text, %L, %L)::jsonb where %I::text like %L',
        r.table_name, r.column_name, r.column_name, o, n, r.column_name, '%' || o || '%');
    else
      execute format('update public.%I set %I = replace(%I, %L, %L) where %I like %L',
        r.table_name, r.column_name, r.column_name, o, n, r.column_name, '%' || o || '%');
    end if;
  end loop;
end $$;
