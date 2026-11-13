import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasConsent } from "@/lib/consent";
import { safeNext } from "@/lib/safe-next";
import { VISITOR_COOKIE } from "@/lib/visitor";
import { closedForGuest, isGuest, trialOver } from "@/lib/trial";

const PUBLIC_PATHS = [
  "/welcome", "/guide", "/trial", "/login", "/signup", "/forgot", "/auth", "/privacy", "/terms", "/email", "/mascot",
  // Открытые страницы специалистов: профиль, приглашение по ссылке, страница «Для психологов».
  "/p", "/invite", "/pro/join", "/specialists",
];

// Что остаётся открытым гостю после окончания пробного времени.
const GUEST_ALWAYS = ["/trial", "/login", "/auth", "/privacy", "/terms"];

// Случайный номер браузера для аналитики воронки (src/lib/track.ts). Ставим его здесь, при первом же заходе,
// чтобы все шаги одного человека, включая самый первый, связались между собой.
export async function updateSession(request: NextRequest) {
  let visitor: string | null = null;
  if (!request.cookies.get(VISITOR_COOKIE)?.value && !request.nextUrl.pathname.startsWith("/api")) {
    visitor = crypto.randomUUID();
    request.cookies.set(VISITOR_COOKIE, visitor);
  }
  const response = await handle(request);
  if (visitor) response.cookies.set(VISITOR_COOKIE, visitor, { path: "/", maxAge: 60 * 60 * 24 * 365 * 2, sameSite: "lax", httpOnly: true });
  return response;
}

async function handle(request: NextRequest) {
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
    const next = safeNext(searchParams.get("next"));
    url.search = next === "/" ? "?link=expired" : `?link=expired&next=${encodeURIComponent(next)}`;
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

  // Гость (пробный доступ): комнаты закрыты, а когда 20 минут вышли, открыт только экран «Создать аккаунт».
  const guest = isGuest(user);
  if (guest) {
    const over = trialOver(user);
    const closed = closedForGuest(path);
    if (path.startsWith("/api")) {
      if (over || closed) return withCookies(NextResponse.json({ error: over ? "trial over" : "account required" }, { status: 403 }), response);
    } else if ((over && !GUEST_ALWAYS.some((p) => path === p || path.startsWith(p + "/"))) || closed || path === "/signup") {
      const url = request.nextUrl.clone();
      url.pathname = "/trial";
      url.search = closed && !over ? "?from=rooms" : "";
      return withCookies(NextResponse.redirect(url), response);
    }
  }

  // Гостю вход оставляем открытым: у него уже может быть свой аккаунт.
  if (user && ["/welcome", "/login", "/signup"].includes(path) && !(guest && path === "/login")) {
    return withCookies(NextResponse.redirect(new URL(safeNext(searchParams.get("next")), request.url)), response);
  }

  // Кто зарегистрировался до появления согласия (или до новой версии политики), подтверждает его один раз.
  if (user && !isPublic && !hasConsent(user)) {
    if (path.startsWith("/api")) {
      return withCookies(NextResponse.json({ error: "consent required" }, { status: 403 }), response);
    } else if (path !== "/consent" && path !== "/reset") {
      const url = request.nextUrl.clone();
      url.pathname = "/consent";
      url.search = "";
      return withCookies(NextResponse.redirect(url), response);
    }
  }

  // Психолог, открывший сайт заново (адрес, закладка, ссылка извне), попадает сразу в кабинет.
  // Переходы внутри сайта не трогаем: личное пространство с ИИ остаётся ему доступно по «Моё пространство».
  if (user && !guest && path === "/" && ["none", "cross-site"].includes(request.headers.get("sec-fetch-site") ?? "")) {
    const { count } = await supabase.from("psychologists").select("user_id", { count: "exact", head: true }).eq("user_id", user.sub);
    if (count) return withCookies(NextResponse.redirect(new URL("/pro", request.url)), response);
  }

  return response;
}

// Обновлённые куки входа переносятся в ответ-перенаправление, иначе сессия потеряется.
function withCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}
