import { NextResponse } from "next/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { emailSendingEnabled, renderSessionReminder, sendEmail, siteUrl } from "@/lib/email";
import { whenLabel } from "@/lib/time";
import { isLocale, type Locale } from "@/i18n/config";

export const runtime = "nodejs";
export const maxDuration = 60;

// Напоминания о встречах с психологом на ближайшие сутки — клиенту и специалисту, по одному письму.
// Запускается Vercel Cron раз в день (vercel.json) с Authorization: Bearer CRON_SECRET.
// Пока отправка писем не включена (emailSendingEnabled), только считает письма и ничего не отмечает.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 503 });

  const dry = !emailSendingEnabled() || new URL(req.url).searchParams.get("dry") === "1";
  const admin = createAdminClient();
  const now = Date.now();
  const { data: sessions, error } = await admin
    .from("sessions")
    .select("id, psychologist_id, client_id, starts_at")
    .eq("status", "scheduled")
    .is("reminded_at", null)
    .gte("starts_at", new Date(now + 30 * 60_000).toISOString())
    .lt("starts_at", new Date(now + 26 * 3_600_000).toISOString())
    .order("starts_at")
    .limit(40);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const report = { dry, sessions: sessions?.length ?? 0, sent: 0, failed: 0 };
  for (const s of sessions ?? []) {
    const [{ data: psy }, { data: client }, { data: psyUser }, { data: clientUser }] = await Promise.all([
      admin.from("psychologists").select("full_name, timezone").eq("user_id", s.psychologist_id).maybeSingle(),
      admin.from("profiles").select("name").eq("id", s.client_id).maybeSingle(),
      admin.auth.admin.getUserById(s.psychologist_id),
      admin.auth.admin.getUserById(s.client_id),
    ]);
    const tz = psy?.timezone ?? "Asia/Almaty";
    const letters = [
      { user: clientUser?.user, name: client?.name, peer: psy?.full_name ?? "", link: `${siteUrl()}/care` },
      { user: psyUser?.user, name: psy?.full_name, peer: client?.name ?? "", link: `${siteUrl()}/pro/sessions/${s.id}` },
    ];
    let ok = true;
    for (const l of letters) {
      if (!l.user?.email) continue;
      const raw = (l.user.user_metadata?.consent as { locale?: string } | undefined)?.locale;
      const locale: Locale = raw && isLocale(raw) ? raw : "ru";
      const when = `${whenLabel(s.starts_at, tz, locale)} (${tz})`;
      try {
        if (!dry) {
          await sendEmail({ to: l.user.email, ...renderSessionReminder({ locale, name: l.name, peer: l.peer, when, link: l.link }) });
          await new Promise((r) => setTimeout(r, 600));
        }
        report.sent++;
      } catch (e) {
        console.error("session reminder", s.id, e);
        report.failed++;
        ok = false;
      }
    }
    if (!dry && ok) await admin.from("sessions").update({ reminded_at: new Date().toISOString() }).eq("id", s.id);
  }
  return NextResponse.json(report);
}
