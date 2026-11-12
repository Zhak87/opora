import { cookies } from "next/headers";
import { getLocale } from "@/i18n/server";
import { pushConfig } from "@/lib/push-config";
import { PUSH_DEVICE_COOKIE, removePushDevice, validPushEndpoint } from "@/lib/push-device";
import { UUID_RE } from "@/lib/sessions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isGuest } from "@/lib/trial";

async function registeredUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return isGuest(data?.claims) ? undefined : data?.claims?.sub;
}

export async function GET() {
  const userId = await registeredUserId();
  if (!userId) return new Response(null, { status: 401 });
  const id = (await cookies()).get(PUSH_DEVICE_COOKIE)?.value;
  if (!id || !UUID_RE.test(id) || !pushConfig()) return Response.json({ enabled: false });
  const { data, error } = await createAdminClient().from("push_subscriptions")
    .select("id").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) return new Response(null, { status: 503 });
  return Response.json({ enabled: Boolean(data) });
}

export async function POST(request: Request) {
  if (!pushConfig()) return new Response(null, { status: 503 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return new Response(null, { status: 415 });
  const userId = await registeredUserId();
  if (!userId) return new Response(null, { status: 401 });
  const body = await request.json().catch(() => null);
  const p256dh: unknown = body?.keys?.p256dh;
  const authKey: unknown = body?.keys?.auth;
  if (!validPushEndpoint(body?.endpoint) ||
      typeof p256dh !== "string" || !/^[\w-]{87}$/.test(p256dh) ||
      typeof authKey !== "string" || !/^[\w-]{22}$/.test(authKey)) {
    return new Response(null, { status: 400 });
  }
  const jar = await cookies();
  const previousId = jar.get(PUSH_DEVICE_COOKIE)?.value;
  const admin = createAdminClient();
  const { data, error } = await admin.from("push_subscriptions").upsert({
    endpoint: body.endpoint,
    user_id: userId,
    p256dh,
    auth_key: authKey,
    locale: await getLocale(),
  }, { onConflict: "endpoint" }).select("id").single();
  if (error) return new Response(null, { status: 503 });
  if (previousId && UUID_RE.test(previousId) && previousId !== data.id) {
    await admin.from("push_subscriptions").delete().eq("id", previousId).eq("user_id", userId);
  }
  jar.set(PUSH_DEVICE_COOKIE, data.id, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365,
  });
  return new Response(null, { status: 204 });
}

export async function DELETE() {
  const userId = await registeredUserId();
  if (!userId) return new Response(null, { status: 401 });
  try {
    await removePushDevice(userId);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
