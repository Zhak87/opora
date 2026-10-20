"use server";

import { requireUser } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { careChatMessages as chatMessages } from "@/i18n/care-chat";
import { UUID_RE } from "@/lib/sessions";
import type { CareMessage } from "@/lib/care-chat";

// Переписка с психологом. Права проверяет база: писать можно только участнику открытой связи.

export async function sendCareMessage(to: string, body: string): Promise<{ message?: CareMessage; error?: string }> {
  const { supabase, user } = await requireUser();
  const m = chatMessages[await getLocale()];
  const text = body.trim().slice(0, 4000);
  if (!user || !UUID_RE.test(to) || !text) return { error: m.failed };
  const { data: id, error } = await supabase.rpc("send_care_message", { p_to: to, p_body: text });
  if (error) return { error: /too many/.test(error.message) ? m.tooMany : /forbidden/.test(error.message) ? m.closed : m.failed };
  const { data } = await supabase
    .from("care_messages")
    .select("id, psychologist_id, client_id, sender_id, body, created_at, read_at")
    .eq("id", id as string)
    .maybeSingle();
  return data ? { message: data as CareMessage } : { error: m.failed };
}

export async function markCareRead(peer: string) {
  if (!UUID_RE.test(peer)) return;
  const { supabase } = await requireUser();
  await supabase.rpc("mark_care_read", { p_with: peer });
}
