import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getMsg } from "@/i18n/server";
import { guideMessages } from "@/i18n/guide";
import { Story } from "@/components/guide/Story";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMsg(guideMessages)).metaTitle };
}

// Знакомство открыто всем: гость после него создаёт аккаунт, а вошедший выбирает первый шаг.
export default async function GuidePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return <Story authed={Boolean(data?.claims)} />;
}
