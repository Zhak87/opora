import "server-only";
import { adminConfigured } from "@/lib/supabase/admin";

export function pushConfig() {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT || process.env.NEXT_PUBLIC_SITE_URL;
  if (!publicKey || !privateKey || !subject || !process.env.CRON_SECRET || !adminConfigured()) return null;
  return { publicKey, privateKey, subject };
}
