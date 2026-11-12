import "server-only";
import { cookies } from "next/headers";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { UUID_RE } from "@/lib/sessions";

export const PUSH_DEVICE_COOKIE = "opora-push-device";

export async function removePushDevice(userId: string) {
  const jar = await cookies();
  const id = jar.get(PUSH_DEVICE_COOKIE)?.value;
  if (id && UUID_RE.test(id) && adminConfigured()) {
    const { error } = await createAdminClient().from("push_subscriptions").delete().eq("id", id).eq("user_id", userId);
    if (error) throw new Error("Unable to remove push subscription");
  }
  jar.delete(PUSH_DEVICE_COOKIE);
}

export function validPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.username || url.password || url.hash) return false;
    return url.hostname === "fcm.googleapis.com" ||
      url.hostname === "updates.push.services.mozilla.com" ||
      url.hostname === "push.apple.com" ||
      url.hostname.endsWith(".push.apple.com") ||
      url.hostname.endsWith(".notify.windows.com");
  } catch {
    return false;
  }
}
