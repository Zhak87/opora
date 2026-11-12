import { NextResponse } from "next/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { sessionEmailsEnabled, renderSessionReminder, sendEmail, siteUrl, type SessionNoticeKind } from "@/lib/email";
import { whenLabel } from "@/lib/time";
import { isLocale, type Locale } from "@/i18n/config";

export const runtime = "nodejs";
export const maxDuration = 120;

// Подтверждения и напоминания о встречах с психологом. Запускается каждые 10 минут (deploy/docker-compose.yml, служба cron)
// с Authorization: Bearer CRON_SECRET. Что отправлять, решается заново на каждом запуске:
//   • подтверждение записи, переноса, отмены — по событиям журнала за последние 6 часов;
//   • напоминание за сутки и за час — по текущему времени встречи.
// Перед отправкой письмо «занимает» ключ в session_notifications (встреча, вид, получатель, время).
// Повторный или параллельный запуск того же ключа ничего не отправит. После переноса у напоминаний новый ключ
// (новое время), а старые просто не наступят. Если письмо не ушло, ключ освобождается до следующего запуска.
// Заодно удаляет просроченные расшифровки, подсказки и черновики (purge_consult_data).
// Пока Resend не настроен (или SESSION_EMAILS=off), только считает письма и ничего не отмечает.

type Letter = { session: string; kind: SessionNoticeKind; slot: string; at: string };
type Row = { id: string; psychologist_id: string; client_id: string; starts_at: string; status: string; format: string };

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 503 });

  const dry = !sessionEmailsEnabled() || new URL(req.url).searchParams.get("dry") === "1";
  const admin = createAdminClient();
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();

  const { data: purged } = await admin.rpc("purge_consult_data");

  // Подтверждения по журналу событий.
  const { data: events, error: evError } = await admin
    .from("audit_log")
    .select("at, action, details")
    .in("action", ["session.booked", "session.rescheduled", "session.cancelled"])
    .gte("at", iso(now - 6 * 3_600_000))
    .order("at")
    .limit(200);
  if (evError) return NextResponse.json({ error: "audit read failed" }, { status: 500 });
  const letters: Letter[] = [];
  for (const e of events ?? []) {
    const d = (e.details ?? {}) as { session?: string; at?: string };
    if (!d.session || !d.at) continue;
    if (Date.parse(d.at) < now && e.action !== "session.cancelled") continue;
    letters.push({ session: d.session, kind: e.action.split(".")[1] as SessionNoticeKind, slot: e.at, at: d.at });
  }

  // Напоминания: за сутки (если до встречи больше двух часов) и за час.
  const { data: soon, error } = await admin
    .from("sessions")
    .select("id, starts_at")
    .eq("status", "scheduled")
    .gt("starts_at", iso(now))
    .lte("starts_at", iso(now + 24 * 3_600_000))
    .order("starts_at")
    .limit(200);
  if (error) return NextResponse.json({ error: "sessions read failed" }, { status: 500 });
  for (const s of soon ?? []) {
    const left = Date.parse(s.starts_at) - now;
    if (left > 2 * 3_600_000) letters.push({ session: s.id, kind: "remind24", slot: s.starts_at, at: s.starts_at });
    else if (left <= 70 * 60_000) letters.push({ session: s.id, kind: "remind1", slot: s.starts_at, at: s.starts_at });
  }

  const ids = [...new Set(letters.map((l) => l.session))];
  const { data: rows } = ids.length
    ? await admin.from("sessions").select("id, psychologist_id, client_id, starts_at, status, format").in("id", ids)
    : { data: [] as Row[] };
  const byId = new Map((rows as Row[]).map((r) => [r.id, r]));
  const people = new Map<string, { email?: string; locale: Locale; name: string; tz: string | null }>();
  async function person(id: string, psychologist: boolean) {
    const key = `${psychologist ? "p" : "c"}:${id}`;
    if (people.has(key)) return people.get(key)!;
    const [{ data: u }, { data: prof }] = await Promise.all([
      admin.auth.admin.getUserById(id),
      psychologist
        ? admin.from("psychologists").select("full_name, timezone").eq("user_id", id).maybeSingle()
        : admin.from("profiles").select("name, timezone").eq("id", id).maybeSingle(),
    ]);
    const raw = (u?.user?.user_metadata?.consent as { locale?: string } | undefined)?.locale;
    const p = prof as { full_name?: string; name?: string; timezone?: string | null } | null;
    const info = { email: u?.user?.email, locale: raw && isLocale(raw) ? raw : ("ru" as Locale), name: p?.full_name ?? p?.name ?? "", tz: p?.timezone ?? null };
    people.set(key, info);
    return info;
  }

  const report = { dry, purged, letters: 0, sent: 0, skipped: 0, failed: 0 };
  for (const l of letters) {
    const s = byId.get(l.session);
    if (!s) continue;
    // Напоминания — только пока встреча в силе и не перенесена на другое время.
    if (l.kind.startsWith("remind") && (s.status !== "scheduled" || s.starts_at !== l.slot)) continue;
    const psy = await person(s.psychologist_id, true);
    const client = await person(s.client_id, false);
    const tzPsy = psy.tz ?? "Asia/Almaty";
    const pairs = [
      { to: s.client_id, who: client, peer: psy.name, tz: client.tz ?? tzPsy, link: s.status === "scheduled" ? `${siteUrl()}/care/sessions/${s.id}` : `${siteUrl()}/care` },
      { to: s.psychologist_id, who: psy, peer: client.name, tz: tzPsy, link: `${siteUrl()}/pro/sessions/${s.id}` },
    ];
    for (const p of pairs) {
      if (!p.who.email) continue;
      report.letters++;
      const key = { session_id: s.id, kind: l.kind, recipient: p.to, slot: l.slot };
      if (dry) {
        const { count } = await admin.from("session_notifications").select("session_id", { count: "exact", head: true }).match(key);
        if (count) report.skipped++;
        else report.sent++;
        continue;
      }
      const { data: claimed } = await admin
        .from("session_notifications")
        .upsert(key, { onConflict: "session_id,kind,recipient,slot", ignoreDuplicates: true })
        .select("session_id");
      if (!claimed?.length) {
        report.skipped++;
        continue;
      }
      const when = `${whenLabel(l.at, p.tz, p.who.locale)} (${p.tz})`;
      try {
        await sendEmail({
          to: p.who.email,
          ...renderSessionReminder({
            locale: p.who.locale,
            name: p.who.name,
            peer: p.peer,
            when,
            link: p.link,
            kind: l.kind,
            join: s.format === "online" && s.status === "scheduled",
          }),
        });
        report.sent++;
        await new Promise((r) => setTimeout(r, 600));
      } catch {
        console.error("session notice failed", l.kind);
        report.failed++;
        await admin.from("session_notifications").delete().match(key);
      }
    }
  }
  return NextResponse.json(report);
}
