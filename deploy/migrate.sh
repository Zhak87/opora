#!/usr/bin/env bash
# Применяет к своей базе новые файлы supabase/migrations (их кладёт сюда выкладка, папка migrations/).
# Что уже применено, записано в таблице public.opora_migrations. Каждый файл идёт одной транзакцией:
# если в нём ошибка, база остаётся как была, а выкладка останавливается.
set -euo pipefail
cd "$(dirname "$0")"
q() { ./dc.sh exec -T db psql -v ON_ERROR_STOP=1 -q -U postgres -d postgres "$@"; }

if [ "$(q -tAc "select to_regclass('public.opora_migrations') is not null")" != "t" ]; then
  q -c "create table public.opora_migrations (name text primary key, applied_at timestamptz not null default now());
        alter table public.opora_migrations enable row level security;
        revoke all on public.opora_migrations from anon, authenticated;"
  # Своя база перенесена из облака вместе со всеми изменениями до 0011 включительно: отмечаем их как применённые.
  for f in migrations/*.sql; do
    n=$(basename "$f")
    if [[ "$n" < "0012" ]]; then q -c "insert into public.opora_migrations (name) values ('$n')"; fi
  done
fi

for f in migrations/*.sql; do
  n=$(basename "$f")
  if [ "$(q -tAc "select count(*) from public.opora_migrations where name = '$n'")" = "0" ]; then
    echo "Изменение базы: $n"
    { cat "$f"; printf '\ninsert into public.opora_migrations (name) values (%s);\n' "'$n'"; } | q -1
  fi
done
echo "База в актуальном состоянии"
