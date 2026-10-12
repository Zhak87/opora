import { NextResponse } from "next/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { checkUnsubscribeToken } from "@/lib/email";

export const runtime = "nodejs";

// Отключает письма дня по подписанной ссылке, без входа в аккаунт.
// POST — из формы на странице /email/unsubscribe и для отписки в один клик из почтового приложения.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const u = url.searchParams.get("u") ?? "";
  const t = url.searchParams.get("t") ?? "";
  const back = new URL("/email/unsubscribe", url);
  if (!checkUnsubscribeToken(u, t) || !adminConfigured()) {
    back.searchParams.set("status", "invalid");
    return NextResponse.redirect(back, 303);
  }
  await createAdminClient().from("courses").update({ email_daily: false }).eq("user_id", u);
  back.searchParams.set("status", "done");
  return NextResponse.redirect(back, 303);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = new URL("/email/unsubscribe", url);
  page.search = url.search;
  return NextResponse.redirect(page);
}
