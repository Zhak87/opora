import type { SupabaseClient } from "@supabase/supabase-js";

// Сохраняемое пространство практик: одна запись на человека и ключ (таблица practice_state, миграция 0029).
// Общее для сайта и приложения: сад, активный «следующий шаг», черновик «Банки мыслей», пройденные пути
// «Моих границ», история «Колеса жизни». Здесь только чтение и запись; оба клиента дополнительно держат
// локальную копию, чтобы ничего не терялось без сети или до применения миграции.

export type StateKey = "garden" | "step" | "thought-jar" | "boundaries" | "wheel" | "settings";

export type Stored<T> = { data: T; at: number };

export async function readState<T>(supabase: SupabaseClient, key: StateKey): Promise<Stored<T> | null> {
  try {
    const { data, error } = await supabase.from("practice_state").select("data, updated_at").eq("key", key).maybeSingle();
    if (error || !data) return null;
    return { data: data.data as T, at: new Date(data.updated_at as string).getTime() };
  } catch {
    return null;
  }
}

export async function writeState<T>(supabase: SupabaseClient, key: StateKey, data: T | null): Promise<boolean> {
  try {
    if (data === null) {
      const { error } = await supabase.from("practice_state").delete().eq("key", key);
      return !error;
    }
    const { error } = await supabase
      .from("practice_state")
      .upsert({ key, data, updated_at: new Date().toISOString() }, { onConflict: "user_id,key" });
    return !error;
  } catch {
    return false;
  }
}

// Какая копия свежее: локальная (была изменена без сети) или из аккаунта.
export function newer<T>(local: Stored<T> | null, remote: Stored<T> | null): Stored<T> | null {
  if (!local) return remote;
  if (!remote) return local;
  return local.at > remote.at ? local : remote;
}

/* ---------- Активный шаг: общий результат практик ---------- */

// Один активный шаг на аккаунт. Его создают «Банка мыслей», «Мои границы» и «Один шаг» в планировании;
// показывается на главной и в практиках. from — какая практика его предложила.
export type ActiveStep = { text: string; at: number; from?: string; when?: "today" | "tomorrow" | "week"; done?: number };

export function cleanStep(value: unknown): ActiveStep | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.text !== "string" || !v.text.trim()) return null;
  return {
    text: v.text.trim().slice(0, 300),
    at: typeof v.at === "number" ? v.at : Date.now(),
    from: typeof v.from === "string" ? v.from.slice(0, 24) : undefined,
    when: v.when === "today" || v.when === "tomorrow" || v.when === "week" ? v.when : undefined,
    done: typeof v.done === "number" ? v.done : undefined,
  };
}

/* ---------- Черновик «Банки мыслей» ---------- */

export type JarZone = "can" | "part" | "cant";
export type JarThought = { id: number; text: string; zone?: JarZone; released?: boolean };
export type JarDraft = { thoughts: JarThought[]; phase: "fill" | "sort" | "focus" | "step" | "release" | "done"; focus?: number; step?: string; at: number };

export function cleanJarDraft(value: unknown): JarDraft | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.thoughts)) return null;
  const thoughts = v.thoughts
    .filter((t): t is JarThought => !!t && typeof t === "object" && typeof (t as JarThought).text === "string" && typeof (t as JarThought).id === "number")
    .slice(0, 30)
    .map((t) => ({ id: t.id, text: t.text.slice(0, 200), zone: t.zone === "can" || t.zone === "part" || t.zone === "cant" ? t.zone : undefined, released: !!t.released }));
  const phases = ["fill", "sort", "focus", "step", "release", "done"] as const;
  const phase = phases.includes(v.phase as JarDraft["phase"]) ? (v.phase as JarDraft["phase"]) : "fill";
  if (!thoughts.length || phase === "done") return null;
  return { thoughts, phase, focus: typeof v.focus === "number" ? v.focus : undefined, step: typeof v.step === "string" ? v.step.slice(0, 300) : undefined, at: typeof v.at === "number" ? v.at : Date.now() };
}

/* ---------- «Мои границы»: какие концовки человек уже видел ---------- */

export type BoundariesProgress = { seen: Record<string, string[]> };

export function cleanBoundaries(value: unknown): BoundariesProgress {
  const seen: Record<string, string[]> = {};
  const raw = value && typeof value === "object" ? (value as { seen?: unknown }).seen : null;
  if (raw && typeof raw === "object")
    for (const [k, list] of Object.entries(raw as Record<string, unknown>))
      if (/^[a-z-]{1,24}$/.test(k) && Array.isArray(list)) seen[k] = list.filter((x): x is string => typeof x === "string").slice(0, 8);
  return { seen };
}

/* ---------- «Колесо жизни»: история оценок ---------- */

export type WheelHistory = { list: { at: number; scores: number[] }[] };

export function cleanWheel(value: unknown): WheelHistory {
  const raw = value && typeof value === "object" ? (value as { list?: unknown }).list : null;
  const list = Array.isArray(raw)
    ? raw
        .filter((x): x is { at: number; scores: number[] } => !!x && typeof x === "object" && typeof (x as { at: unknown }).at === "number" && Array.isArray((x as { scores: unknown }).scores))
        .map((x) => ({ at: x.at, scores: x.scores.slice(0, 12).map((n) => Math.max(0, Math.min(10, Math.round(Number(n) || 0)))) }))
        .slice(-24)
    : [];
  return { list };
}

/* ---------- Настройки практик ---------- */

export type PracticeSettings = { sound: boolean; haptics: boolean; motion: boolean };
export const DEFAULT_SETTINGS: PracticeSettings = { sound: true, haptics: true, motion: true };

export function cleanSettings(value: unknown): PracticeSettings {
  const v = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    sound: v.sound !== false,
    haptics: v.haptics !== false,
    motion: v.motion !== false,
  };
}
