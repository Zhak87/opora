import { sendNotification } from "web-push";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { notificationMessages } from "@/i18n/notifications";
import { pushMessages } from "@/i18n/push";
import { dailyQuestions, pickForDay } from "@/lib/content";
import { esc, notificationEmailConfigured, sendEmail, siteUrl } from "@/lib/email";
import { pushConfig } from "@/lib/push-config";
import { validPushEndpoint } from "@/lib/push-device";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

type Job = {
  id: string;
  user_id: string;
  kind: "message" | "reminder" | "changed" | "booked" | "care" | "daily";
  href: string;
  expires_at: string;
  delivered_to: string[];
  created_at: string;
  push_done: boolean;
  email_done: boolean;
  expo_done: boolean;
};

type Admin = ReturnType<typeof createAdminClient>;

async function deliverPush(admin: Admin, job: Job, config: ReturnType<typeof pushConfig>) {
  if (job.push_done || !config) return { done: true, delivered: job.delivered_to };
  const { data: devices, error } = await admin.from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key, locale").eq("user_id", job.user_id);
  if (error) throw error;
  const delivered = new Set(job.delivered_to);
  const results = await Promise.all(devices.filter((device) => !delivered.has(device.id)).map(async (device) => {
    const ttl = Math.floor((Date.parse(job.expires_at) - Date.now()) / 1000);
    if (!validPushEndpoint(device.endpoint) || ttl <= 0) return true;
    const locale = isLocale(device.locale) ? device.locale : DEFAULT_LOCALE;
    const m = pushMessages[locale];
    try {
      await sendNotification({
        endpoint: device.endpoint,
        keys: { p256dh: device.p256dh, auth: device.auth_key },
      }, JSON.stringify({ title: m.title, body: m[job.kind], href: job.href, tag: job.id }), {
        vapidDetails: config,
        TTL: ttl,
        timeout: 8000,
        urgency: "high",
      });
      delivered.add(device.id);
      return true;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await admin.from("push_subscriptions").delete().eq("id", device.id).eq("user_id", job.user_id);
        return true;
      }
      return false;
    }
  }));
  return { done: results.every(Boolean), delivered: [...delivered] };
}

// Пуш в мобильное приложение через сервис Expo. Ежедневные материалы телефон напоминает сам, их не шлём.
const EXPO_SEND = "https://exp.host/--/api/v2/push/send";

async function deliverExpo(admin: Admin, job: Job) {
  if (job.expo_done || job.kind === "daily") return true;
  const ttl = Math.floor((Date.parse(job.expires_at) - Date.now()) / 1000);
  if (ttl <= 0) return true;
  const { data: devices, error } = await admin.from("expo_push_tokens").select("token, platform, locale").eq("user_id", job.user_id);
  if (error) throw error;
  if (!devices.length) return true;
  const messages = devices.map((device) => {
    const m = pushMessages[isLocale(device.locale) ? device.locale : DEFAULT_LOCALE];
    return { to: device.token, title: m.title, body: m[job.kind], data: { url: job.href, tag: job.id }, sound: "default", priority: "high", ttl, channelId: "default" };
  });
  const token = process.env.EXPO_ACCESS_TOKEN;
  const res = await fetch(EXPO_SEND, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(messages),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!res?.ok) return false;
  // Телефон удалил приложение или отозвал разрешение: адрес больше не нужен.
  const body = (await res.json().catch(() => ({}))) as { data?: { status: string; details?: { error?: string } }[] };
  const gone = (body.data ?? []).flatMap((ticket, i) => (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ? [devices[i].token] : []));
  if (gone.length) await admin.from("expo_push_tokens").delete().in("token", gone);
  return true;
}

async function deliverEmail(admin: Admin, job: Job) {
  const { data: preference, error } = await admin.from("notification_email_preferences")
    .select("locale, enabled_at").eq("user_id", job.user_id).maybeSingle();
  if (error) throw error;
  if (!preference || (job.kind !== "reminder" && Date.parse(job.created_at) < Date.parse(preference.enabled_at))) return;
  const { data, error: userError } = await admin.auth.admin.getUserById(job.user_id);
  if (userError) throw userError;
  if (!data.user?.email || data.user.is_anonymous || Date.parse(job.expires_at) <= Date.now()) return;

  const locale = isLocale(preference.locale) ? preference.locale : DEFAULT_LOCALE;
  const m = pushMessages[locale];
  const link = new URL("/login", siteUrl());
  link.searchParams.set("next", job.href);
  const settings = new URL("/login", siteUrl());
  settings.searchParams.set("next", "/notifications");
  const paragraphs = [m[job.kind]];
  if (job.kind === "daily") {
    paragraphs.push(`${notificationMessages[locale].question} — ${pickForDay(dailyQuestions(locale))}`);
  }
  const text = [...paragraphs, `${m.emailLink}: ${link}`, `${m.emailSettings}: ${settings}`].join("\n\n");
  try {
    await sendEmail({
      to: data.user.email,
      subject: `${m.title} · ${m[job.kind]}`,
      html: paragraphs.map((line) => `<p>${esc(line)}</p>`).join("") +
        `<p><a href="${esc(link.href)}">${esc(m.emailLink)}</a></p><p><a href="${esc(settings.href)}">${esc(m.emailSettings)}</a></p>`,
      text,
      idempotencyKey: `notification/${job.id}`,
      signal: AbortSignal.timeout(5000),
    });
  } finally {
    await new Promise((resolve) => setTimeout(resolve, 550));
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response(null, { status: 401 });
  const config = pushConfig();
  const emailConfigured = notificationEmailConfigured();
  // Пуш в приложение через Expo ключей не требует, поэтому очередь разбираем всегда.
  if (!adminConfigured()) return Response.json({ enabled: false });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_push_jobs");
  if (error) return Response.json({ error: "Could not claim push jobs" }, { status: 503 });
  const jobs = data as Job[];
  const pushResults = Promise.allSettled(jobs.map((job) => deliverPush(admin, job, config)));
  const expoResults = Promise.allSettled(jobs.map((job) => deliverExpo(admin, job)));
  const emailDone = new Set<string>();
  const emailDeadline = Date.now() + 40_000;
  for (const job of jobs) {
    if (job.email_done || !emailConfigured) emailDone.add(job.id);
    else if (Date.now() < emailDeadline) {
      try {
        await deliverEmail(admin, job);
        emailDone.add(job.id);
      } catch {
        console.warn("Notification email waiting to retry", job.id);
      }
    }
  }
  const expo = await expoResults;
  const results = await Promise.all((await pushResults).map(async (result, index) => {
    const job = jobs[index];
    const push = result.status === "fulfilled" ? result.value : { done: job.push_done, delivered: job.delivered_to };
    const expoDone = expo[index].status === "fulfilled" ? (expo[index] as PromiseFulfilledResult<boolean>).value : job.expo_done;
    const complete = push.done && emailDone.has(job.id) && expoDone;
    const table = admin.from("push_jobs");
    const update = complete
      ? await table.delete().eq("id", job.id)
      : await table.update({ push_done: push.done, email_done: emailDone.has(job.id), expo_done: expoDone, delivered_to: push.delivered }).eq("id", job.id);
    return complete && !update.error;
  }));
  const retrying = results.filter((complete) => !complete).length;
  if (retrying) console.warn("Notification jobs waiting to retry", retrying);
  return Response.json({ processed: jobs.length, retrying });
}
