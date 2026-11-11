import { NextResponse } from "next/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { TRIAL_KEEP_HOURS } from "@/lib/trial";

export const runtime = "nodejs";
export const maxDuration = 60;

// Удаляет гостевые аккаунты, чьё пробное время закончилось больше суток назад и которые так и не стали
// обычными. Вместе с аккаунтом каскадно удаляются разговоры и записи гостя.
// Запускается раз в час (deploy/docker-compose.yml, служба cron) с Authorization: Bearer CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 503 });

  const admin = createAdminClient();
  const before = Date.now() - TRIAL_KEEP_HOURS * 3_600_000;
  const report = { checked: 0, deleted: 0, failed: 0 };
  const stale: string[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 500 });
    if (error) return NextResponse.json({ error: error.message, ...report }, { status: 500 });
    for (const u of data.users) {
      if (!u.is_anonymous) continue;
      report.checked++;
      // Гость без отметки о сроке (не должно быть) считается по дате создания.
      const until = Date.parse((u.app_metadata as { trial_until?: string })?.trial_until ?? u.created_at);
      if (until < before) stale.push(u.id);
    }
    if (data.users.length < 500) break;
  }
  for (const id of stale) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) report.failed++;
    else report.deleted++;
  }
  return NextResponse.json(report);
}
