"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { canManage, isRole, staffRole } from "@/lib/admin";

const UUID = /^[0-9a-f-]{36}$/i;
const back = (formData: FormData, note?: string) => {
  const to = String(formData.get("back") || "/admin/users");
  const safe = to.startsWith("/admin/users") ? to : "/admin/users";
  redirect(note ? `${safe}${safe.includes("?") ? "&" : "?"}note=${note}` : safe);
};

// Назначить или снять роль сотрудника. Право проверяет база: admin_set_role пустит только владельца.
export async function setRole(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/welcome");
  const target = String(formData.get("user"));
  const role = String(formData.get("role"));
  if (!UUID.test(target) || !isRole(role)) back(formData, "error");
  const { error } = await supabase.rpc("admin_set_role", { p_user: target, p_role: role });
  revalidatePath("/admin", "layout");
  back(formData, error ? (error.message.includes("self") ? "self" : "error") : "role");
}

// Заблокировать или разблокировать вход. Сотрудников блокирует только владелец, себя заблокировать нельзя.
// Блокировка закрывает вход и продление сеанса; уже открытый сеанс доживает до часа.
export async function setBlocked(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/welcome");
  const target = String(formData.get("user"));
  const block = formData.get("block") === "1";
  const role = await staffRole(supabase);
  if (!UUID.test(target) || !canManage(role) || !adminConfigured()) back(formData, "error");
  if (target === user.id) back(formData, "self");
  const admin = createAdminClient();
  const { data: staff } = await admin.from("admins").select("role").eq("user_id", target).maybeSingle();
  if (staff && role !== "developer") back(formData, "error");
  const { error } = await admin.auth.admin.updateUserById(target, { ban_duration: block ? "876000h" : "none" });
  if (!error) await supabase.rpc("admin_log", { p_action: block ? "admin.block" : "admin.unblock", p_user: target });
  revalidatePath("/admin", "layout");
  back(formData, error ? "error" : block ? "blocked" : "unblocked");
}
