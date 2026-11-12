"use server";

import { getLocale } from "@/i18n/server";
import { notificationEmailConfigured } from "@/lib/email";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isGuest } from "@/lib/trial";

export async function setNotificationEmail(enabled: boolean) {
  if (typeof enabled !== "boolean" || !adminConfigured() || (enabled && !notificationEmailConfigured())) return false;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || !claims.email || isGuest(claims)) return false;

  const preferences = createAdminClient().from("notification_email_preferences");
  const { error } = enabled
    ? await preferences.upsert({ user_id: claims.sub, locale: await getLocale() }, { onConflict: "user_id" })
    : await preferences.delete().eq("user_id", claims.sub);
  return !error;
}
