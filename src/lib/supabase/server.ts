import { createServerClient } from "@supabase/ssr";
import { createClient as createTokenClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";

// Мобильное приложение входит в аккаунт на телефоне и присылает токен в заголовке Authorization.
// Тогда работаем от имени этого человека без куки: права, как и на сайте, проверяет база (RLS).
export async function bearerToken() {
  const header = (await headers()).get("authorization") ?? "";
  const match = /^Bearer\s+([A-Za-z0-9._-]+)$/.exec(header.trim());
  return match ? match[1] : null;
}

function claimsOf(token: string): { sub?: string; exp?: number; email?: string } {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

function tokenClient(token: string) {
  // Сессия только в памяти этого запроса: подпись токена проверит getClaims(), обновлять его будет телефон.
  const claims = claimsOf(token);
  const now = Math.floor(Date.now() / 1000);
  const session = JSON.stringify({
    access_token: token,
    refresh_token: "",
    token_type: "bearer",
    expires_at: claims.exp ?? now,
    expires_in: Math.max(0, (claims.exp ?? now) - now),
    user: { id: claims.sub ?? "", email: claims.email, aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "" },
  });
  return createTokenClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      storageKey: "opora-mobile",
      storage: { getItem: () => session, setItem: () => {}, removeItem: () => {} },
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function cookieClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Вызов из Server Component: куки обновит middleware.
          }
        },
      },
    },
  );
}

export async function createClient() {
  const token = await bearerToken();
  if (token) return tokenClient(token) as unknown as ReturnType<typeof cookieClient>;
  return cookieClient(await cookies());
}

// Быстрая проверка входа: подпись токена проверяется на месте, без отдельного запроса к серверу авторизации.
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const user = claims ? { id: claims.sub, email: (claims.email as string | undefined) ?? "" } : null;
  return { supabase, user };
}
