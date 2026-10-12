import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasConsent } from "@/lib/consent";

const PUBLIC_PATHS = ["/welcome", "/demo", "/login", "/signup", "/forgot", "/auth", "/privacy", "/terms"];

export async function updateSession(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl;

  // Supabase мог вернуть человека на любой адрес сайта: с кодом входа или с ошибкой ссылки.
  if (searchParams.get("code") && !pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }
  if ((searchParams.get("error_code") || searchParams.get("error")) && pathname !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?link=expired";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && !isPublic && !path.startsWith("/api")) {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && ["/welcome", "/demo", "/login", "/signup"].includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Кто зарегистрировался до появления согласия (или до новой версии политики), подтверждает его один раз.
  if (user && !isPublic && !hasConsent(user)) {
    if (path.startsWith("/api")) {
      if (path !== "/api/demo") return withCookies(NextResponse.json({ error: "consent required" }, { status: 403 }), response);
    } else if (path !== "/consent" && path !== "/reset") {
      const url = request.nextUrl.clone();
      url.pathname = "/consent";
      url.search = "";
      return withCookies(NextResponse.redirect(url), response);
    }
  }

  return response;
}

// Обновлённые куки входа переносятся в ответ-перенаправление, иначе сессия потеряется.
function withCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}
