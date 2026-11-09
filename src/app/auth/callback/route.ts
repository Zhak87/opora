import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { siteOrigin } from "@/lib/site-origin";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
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

  // Если ссылка устарела, адрес «куда вернуться» не теряем: после входа человек попадёт туда же.
  const expired = next === "/" ? "/login?link=expired" : `/login?link=expired&next=${encodeURIComponent(next)}`;
  const target = ok ? (type === "recovery" ? "/reset" : next) : expired;
  return NextResponse.redirect(new URL(target, siteOrigin(request.headers)));
}
