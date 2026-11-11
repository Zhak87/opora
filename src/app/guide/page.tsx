import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getMsg } from "@/i18n/server";
import { guideMessages } from "@/i18n/guide";
import { Story } from "@/components/guide/Story";
import { publicMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const guide = await getMsg(guideMessages);
  return publicMetadata("/guide", guide.metaTitle, guide.metaDescription);
}

// Знакомство открыто всем: гость после него создаёт аккаунт, а вошедший выбирает первый шаг.
export default async function GuidePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return <Story authed={Boolean(data?.claims)} />;
}
