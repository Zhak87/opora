import type { SupabaseClient } from "@supabase/supabase-js";
import { PROGRAM_FIELDS, type Program, type Screening } from "./program";

// Текущая программа «Пять шагов»: идущая, а если её нет — последняя пройденная. До миграции 0026 просто null.
export async function currentProgram(supabase: SupabaseClient): Promise<Program | null> {
  try {
    const { data } = await supabase
      .from("programs")
      .select(PROGRAM_FIELDS)
      .in("status", ["active", "done"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as Program | null) ?? null;
  } catch {
    return null;
  }
}

export async function myScreenings(supabase: SupabaseClient, limit = 40): Promise<Screening[]> {
  try {
    const { data } = await supabase
      .from("screenings")
      .select("id, kind, answers, score, step, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    return Array.isArray(data) ? (data as Screening[]) : [];
  } catch {
    return [];
  }
}

// Для психолога: null — нет согласия «Самочувствие» или связь закрыта.
export type ClientProgram = Pick<Program, "status" | "step" | "goal" | "wish" | "guided" | "progress" | "started_at" | "finished_at">;
export async function clientProgram(supabase: SupabaseClient, client: string) {
  const [p, s] = await Promise.all([
    supabase.rpc("client_program", { p_client: client }),
    supabase.rpc("client_screenings", { p_client: client }),
  ]);
  if (p.error || s.error) return null;
  return {
    program: ((p.data ?? []) as ClientProgram[])[0] ?? null,
    screenings: (s.data ?? []) as (Pick<Screening, "kind" | "score" | "step" | "created_at"> & { item9?: number | null })[],
  };
}
