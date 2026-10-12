import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  const target = ok ? (type === "recovery" ? "/reset" : next) : "/login?link=expired";
  return NextResponse.redirect(new URL(target, origin));
}

// Только адрес внутри сайта: «//evil.com» и «/\evil.com» браузер понял бы как другой сайт.
function safeNext(value: string | null) {
  if (!value || !/^\/(?![\/\\])/.test(value) || /[\u0000-\u001f]/.test(value)) return "/";
  return value;
}
