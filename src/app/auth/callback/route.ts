import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { siteOrigin } from "@/lib/site-origin";
import { track } from "@/lib/track";

function nextFrom(redirectTo: string | null) {
  if (!redirectTo) return null;
  try {
    return new URL(redirectTo, "http://x").searchParams.get("next");
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Ссылки из писем своей базы несут адрес возврата целиком в redirect_to (шаблоны supabase/templates)
  const next = safeNext(searchParams.get("next") ?? nextFrom(searchParams.get("redirect_to")));

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }
  // Почта подтверждена: аккаунт создан (обычная регистрация или гость сохранил свой пробный доступ).
  if (ok && (type === "signup" || type === "email" || type === "email_change")) {
    await track("signup_complete", { via: type === "email_change" ? "trial" : "form" });
  }

  // Если ссылка устарела, адрес «куда вернуться» не теряем: после входа человек попадёт туда же.
  const expired = next === "/" ? "/login?link=expired" : `/login?link=expired&next=${encodeURIComponent(next)}`;
  const target = ok ? (type === "recovery" ? "/reset" : next) : expired;
  return NextResponse.redirect(new URL(target, siteOrigin(request.headers)));
}
