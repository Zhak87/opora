import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/pro";

// Черновик анкеты психолога: создаётся один раз, адрес профиля подбирается по имени.
export async function ensurePsychologist(supabase: SupabaseClient, userId: string, name: string) {
  const { data: own } = await supabase.from("psychologists").select("user_id").eq("user_id", userId).maybeSingle();
  if (own) return true;
  const base = slugify(name) || "psy";
  for (let i = 0; i < 4; i++) {
    const slug = (i === 0 && base.length >= 3 ? base : `${base}-${randomBytes(2).toString("hex")}`).slice(0, 40);
    const { error } = await supabase.from("psychologists").insert({ user_id: userId, slug, full_name: name });
    if (!error) return true;
    if (error.code !== "23505") return false;
  }
  return false;
}
