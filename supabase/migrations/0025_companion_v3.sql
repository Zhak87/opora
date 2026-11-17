-- Собеседник v3 (документ «ИИ-собеседник v3»): служебные метки ответа и выводы в дневнике.
-- meta у ответа собеседника: {scale: true} — кнопки 0–10, {save: "…"} — вывод для дневника,
-- {route: {focus, phase, intent, score, practice, risk}} — скрытая запись маршрутизатора для аналитики.
alter table public.messages add column if not exists meta jsonb
  check (meta is null or (jsonb_typeof(meta) = 'object' and pg_column_size(meta) < 4096));

-- Новый вид записи дневника: «Вывод» из разговора, сохраняется по кнопке, собеседник помнит последние выводы.
alter table public.journal_entries drop constraint if exists journal_entries_kind_check;
alter table public.journal_entries add constraint journal_entries_kind_check
  check (kind in ('thought', 'event', 'gratitude', 'goal', 'feeling', 'insight'));
