import { sendNotification } from "web-push";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { pushMessages } from "@/i18n/push";
import { pushConfig } from "@/lib/push-config";
import { validPushEndpoint } from "@/lib/push-device";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

type Job = {
  id: string;
  user_id: string;
  kind: "message" | "reminder" | "changed" | "booked";
  href: string;
  expires_at: string;
  delivered_to: string[];
};

async function deliver(admin: ReturnType<typeof createAdminClient>, job: Job, config: NonNullable<ReturnType<typeof pushConfig>>) {
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
  const query = admin.from("push_jobs");
  const { error: updateError } = results.every(Boolean)
    ? await query.delete().eq("id", job.id)
    : await query.update({ delivered_to: [...delivered] }).eq("id", job.id);
  if (updateError) throw updateError;
  return results.every(Boolean);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response(null, { status: 401 });
  const config = pushConfig();
  if (!config) return Response.json({ enabled: false });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_push_jobs");
  if (error) return Response.json({ error: "Could not claim push jobs" }, { status: 503 });
  const jobs = data as Job[];
  const results = await Promise.allSettled(jobs.map((job) => deliver(admin, job, config)));
  const retrying = results.filter((result) => result.status === "rejected" || !result.value).length;
  if (retrying) console.warn("Push jobs waiting to retry", retrying);
  return Response.json({ processed: jobs.length, retrying });
}
