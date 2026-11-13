"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/sessions";
import { closeConsultRooms } from "@/lib/consult/server";

// Отметки рабочего дня психолога: оплата вручную, «клиент не пришёл», пауза в работе с клиентом.
// Права проверяет база (supabase/migrations/0021_cabinet_today.sql).

async function authed() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/welcome");
  return supabase;
}

export async function setSessionPaid(formData: FormData) {
  const supabase = await authed();
  const id = String(formData.get("session") ?? "");
  if (!UUID_RE.test(id)) return;
  await supabase.rpc("set_session_paid", { p_session: id, p_paid: formData.get("paid") === "1" });
  revalidatePath("/pro", "layout");
  revalidatePath("/care", "layout");
}

export async function setSessionNoShow(formData: FormData) {
  const supabase = await authed();
  const id = String(formData.get("session") ?? "");
  if (!UUID_RE.test(id)) return;
  const { error } = await supabase.rpc("set_session_no_show", { p_session: id, p_no_show: formData.get("no_show") === "1" });
  if (!error) await closeConsultRooms(id);
  revalidatePath("/pro", "layout");
  revalidatePath("/care", "layout");
}

export async function setClientPaused(formData: FormData) {
  const supabase = await authed();
  const id = String(formData.get("link") ?? "");
  if (!UUID_RE.test(id)) return;
  await supabase.rpc("set_client_paused", { p_link: id, p_paused: formData.get("paused") === "1" });
  revalidatePath("/pro", "layout");
}
