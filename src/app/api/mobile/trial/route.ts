import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { clientIp, tooMany } from "@/lib/rate-limit";
import { track } from "@/lib/track";
import { TRIAL_MINUTES, isGuest, trialUntil } from "@/lib/trial";

const DAY = 24 * 60 * 60 * 1000;
const STARTS_PER_DAY = 6;

// Пробный доступ в приложении: телефон сам входит анонимно, а срок 20 минут ставит сервер служебным ключом,
// как startTrial на сайте. Повторный вызов возвращает уже поставленный срок и не продлевает его.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims || !isGuest(claims)) return NextResponse.json({ error: "guest required" }, { status: 403 });
  const already = trialUntil(claims);
  if (already) return NextResponse.json({ until: new Date(already).toISOString() });
  if (!adminConfigured()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if (tooMany(`trial:${clientIp(request)}`, STARTS_PER_DAY, DAY)) return NextResponse.json({ error: "busy" }, { status: 429 });

  const until = new Date(Date.now() + TRIAL_MINUTES * 60_000).toISOString();
  const { error } = await createAdminClient().auth.admin.updateUserById(String(claims.sub), { app_metadata: { trial_until: until } });
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  await track("trial_start", { via: "app" });
  return NextResponse.json({ until });
}
