-- Настройки голоса собеседника: голос, тон, скорость, автоозвучка.
alter table public.profiles add column if not exists voice jsonb;
