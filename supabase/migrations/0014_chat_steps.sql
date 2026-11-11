-- Раздел 4.1 стратегии: собеседник предлагает следующий шаг, а человек оценивает разговор.
-- step: какой шаг собеседник предложил в этом ответе (код практики, rooms, specialists или journal).
-- rating: помог ли разговор (3 — да, 2 — немного, 1 — нет).
alter table public.messages add column step text check (step ~ '^[a-z0-9-]{1,24}$');
alter table public.conversations add column rating smallint check (rating between 1 and 3);
