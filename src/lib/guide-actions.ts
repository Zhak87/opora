"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { chatMessages } from "@/i18n/chat";
import { track } from "@/lib/track";
import { GUIDE_COOKIE, GUIDE_DESTINATIONS, type GuideDestination } from "@/lib/guide";

// Человек досмотрел или пропустил знакомство: запоминаем это и ведём туда, куда он выбрал.
export async function finishGuide(formData: FormData) {
  const raw = String(formData.get("to") || "/");
  const to: GuideDestination = (GUIDE_DESTINATIONS as readonly string[]).includes(raw) ? (raw as GuideDestination) : "/";

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/welcome");

  (await cookies()).set(GUIDE_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 365 * 2, sameSite: "lax" });
  const meta = data.claims.user_metadata as { guide?: string } | undefined;
  if (!meta?.guide) {
    // Если отметку не удалось сохранить, знакомство всё равно не повторится на этом устройстве: есть кука.
    await supabase.auth.updateUser({ data: { guide: new Date().toISOString() } }).catch(() => null);
  }

  if (to === "talk") {
    await track("chat_start");
    const t = chatMessages[await getLocale()];
    const { data: conversation } = await supabase
      .from("conversations")
      .insert({ mode: "talk", topic: null, title: t.newConversation })
      .select("id")
      .single();
    redirect(conversation ? `/talk/${conversation.id}` : "/talk");
  }
  redirect(to);
}
