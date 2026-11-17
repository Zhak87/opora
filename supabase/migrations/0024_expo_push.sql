-- Пуш-уведомления в мобильное приложение через сервис Expo.
-- Телефон после входа сообщает свой адрес (Expo push token); уведомления идут из той же очереди push_jobs,
-- что и браузерные пуши и письма, третьим каналом. Один телефон — один владелец: при входе другого
-- человека адрес переходит к нему, при выходе удаляется.

create table public.expo_push_tokens (
  token text primary key check (token ~ '^(Exponent|Expo)PushToken\[[A-Za-z0-9_-]+\]$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  locale text not null check (locale in ('ru', 'kk', 'en')),
  updated_at timestamptz not null default now()
);
create index expo_push_tokens_user_idx on public.expo_push_tokens (user_id);
alter table public.expo_push_tokens enable row level security;
revoke all on public.expo_push_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.expo_push_tokens to service_role;

create function public.register_expo_push(p_token text, p_platform text, p_locale text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  -- Гостям пробного доступа пуши не нужны: через 20 минут аккаунт исчезнет.
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return; end if;
  insert into public.expo_push_tokens (token, user_id, platform, locale)
    values (p_token, auth.uid(), p_platform, p_locale)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, locale = excluded.locale, updated_at = now();
end;
$$;
revoke execute on function public.register_expo_push(text, text, text) from public, anon;
grant execute on function public.register_expo_push(text, text, text) to authenticated;

create function public.forget_expo_push(p_token text)
returns void language sql security definer set search_path = ''
as $$
  delete from public.expo_push_tokens where token = p_token and user_id = auth.uid();
$$;
revoke execute on function public.forget_expo_push(text) from public, anon;
grant execute on function public.forget_expo_push(text) to authenticated;

alter table public.push_jobs add column expo_done boolean not null default false;
