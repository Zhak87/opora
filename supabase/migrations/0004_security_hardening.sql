-- Усиление защиты по итогам проверки безопасности (10.10.2026).
-- Политики личного плана: только для вошедших пользователей и с явной проверкой при изменении,
-- как у остальных таблиц. Поведение для пользователей не меняется.
drop policy if exists "own plans select" on public.personal_plans;
drop policy if exists "own plans insert" on public.personal_plans;
drop policy if exists "own plans update" on public.personal_plans;
drop policy if exists "own plans delete" on public.personal_plans;

create policy "own plans" on public.personal_plans
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Гостям (без входа) таблицы с личными данными не нужны вовсе: RLS и так ничего не отдаёт,
-- но лишний слой защиты не помешает.
revoke all on public.profiles, public.conversations, public.messages, public.journal_entries, public.personal_plans from anon;
