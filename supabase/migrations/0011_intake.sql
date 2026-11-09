-- Анкета «Расскажите о себе» (протокол от 23.10.2026): ответы помогают подстроить разговор под человека.
-- Хранится в профиле; доступ — по существующей политике "own profile" (только сам человек).
alter table public.profiles add column if not exists intake jsonb;

alter table public.profiles drop constraint if exists profiles_intake_size;
alter table public.profiles
  add constraint profiles_intake_size check (intake is null or pg_column_size(intake) < 8192);
