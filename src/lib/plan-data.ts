import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan, PlanProgress } from "./plan";

export type StoredPlan = { id: string; plan: Plan; progress: PlanProgress; created_at: string };

export async function latestPlan(supabase: SupabaseClient): Promise<StoredPlan | null> {
  const { data } = await supabase
    .from("personal_plans")
    .select("id, plan, progress, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as StoredPlan | null) ?? null;
}
