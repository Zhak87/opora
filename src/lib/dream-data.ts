import type { SupabaseClient } from "@supabase/supabase-js";
import { isDreamer, isMood, type DreamEmotion, type DreamPanel, type DreamReflection, type DreamType, type Dreamer, type EmotionMark } from "@/lib/dreams";

// Чтение снов для страниц. Права проверяет база: человек видит только свои сны.

export const DREAM_BUCKET = "dreams";
const URL_TTL = 60 * 60 * 6;

export type Dream = {
  id: string;
  date: string;
  title: string;
  text: string;
  type: DreamType;
  vividness: number | null;
  dayContext: string;
  emotions: EmotionMark[];
  emotionsAfter: DreamEmotion[];
  dreamer: Dreamer;
  status: "draft" | "storyboard" | "comic" | "complete";
  similarity: number | null;
  reflection: DreamReflection | null;
  answers: string[];
  notes: string;
  panels: DreamPanel[];
};

type PanelRow = {
  id: string;
  position: number;
  scene: string;
  caption: string;
  mood: string;
  added: unknown;
  softened: boolean;
  skipped: boolean;
  status: DreamPanel["status"];
  image_path: string | null;
};

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export async function signPanels(supabase: SupabaseClient, rows: PanelRow[]): Promise<DreamPanel[]> {
  const paths = rows.map((r) => r.image_path).filter((p): p is string => Boolean(p));
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from(DREAM_BUCKET).createSignedUrls(paths, URL_TTL);
    for (const item of data ?? []) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return rows.map((r) => ({
    id: r.id,
    position: r.position,
    scene: r.scene,
    caption: r.caption,
    mood: isMood(r.mood) ? r.mood : "night",
    added: strings(r.added),
    softened: r.softened,
    skipped: r.skipped,
    status: r.status,
    url: r.image_path ? urls.get(r.image_path) ?? null : null,
  }));
}

export const PANEL_COLUMNS = "id, position, scene, caption, mood, added, softened, skipped, status, image_path";

export async function loadDream(supabase: SupabaseClient, id: string): Promise<Dream | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [{ data: d }, { data: panels }] = await Promise.all([
    supabase
      .from("dreams")
      .select("id, dream_date, title, text, dream_type, vividness, day_context, emotions, emotions_after, dreamer, status, similarity, reflection, answers, notes")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("dream_panels").select(PANEL_COLUMNS).eq("dream_id", id).order("position"),
  ]);
  if (!d) return null;
  const reflection = d.reflection as { noticed?: unknown; questions?: unknown } | null;
  return {
    id: d.id,
    date: d.dream_date,
    title: d.title,
    text: d.text,
    type: d.dream_type,
    vividness: d.vividness,
    dayContext: d.day_context ?? "",
    emotions: Array.isArray(d.emotions) ? (d.emotions as EmotionMark[]) : [],
    emotionsAfter: strings(d.emotions_after) as DreamEmotion[],
    dreamer: isDreamer(d.dreamer) ? d.dreamer : "mint",
    status: d.status,
    similarity: d.similarity,
    reflection: reflection ? { noticed: typeof reflection.noticed === "string" ? reflection.noticed : "", questions: strings(reflection.questions) } : null,
    answers: strings(d.answers),
    notes: d.notes ?? "",
    panels: await signPanels(supabase, (panels ?? []) as PanelRow[]),
  };
}

export type DreamCard = {
  id: string;
  date: string;
  title: string;
  excerpt: string;
  type: DreamType;
  emotions: DreamEmotion[];
  status: Dream["status"];
  cover: string | null;
  mood: DreamPanel["mood"];
};

export async function listDreams(supabase: SupabaseClient): Promise<DreamCard[]> {
  const { data: dreams } = await supabase
    .from("dreams")
    .select("id, dream_date, title, text, dream_type, emotions, status")
    .order("dream_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(120);
  if (!dreams?.length) return [];
  const { data: panels } = await supabase
    .from("dream_panels")
    .select("dream_id, position, mood, image_path")
    .in("dream_id", dreams.map((d) => d.id))
    .order("position");
  const first = new Map<string, { mood: string; image_path: string | null }>();
  for (const p of panels ?? []) {
    const seen = first.get(p.dream_id);
    if (!seen || (!seen.image_path && p.image_path)) first.set(p.dream_id, p);
  }
  const paths = [...first.values()].map((p) => p.image_path).filter((p): p is string => Boolean(p));
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from(DREAM_BUCKET).createSignedUrls(paths, URL_TTL);
    for (const item of data ?? []) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return dreams.map((d) => {
    const p = first.get(d.id);
    return {
      id: d.id,
      date: d.dream_date,
      title: d.title,
      excerpt: String(d.text).slice(0, 140),
      type: d.dream_type,
      emotions: (Array.isArray(d.emotions) ? (d.emotions as EmotionMark[]) : []).map((e) => e.emotion),
      status: d.status,
      cover: p?.image_path ? urls.get(p.image_path) ?? null : null,
      mood: isMood(p?.mood) ? p.mood : "night",
    };
  });
}

// Дневные лимиты на человека (скользящие сутки). Разбор сна — каждый раз, когда Опи собирает
// сценарий (новый сон или «Собрать заново»); кадр — каждая нарисованная картинка.
// Гостю пробного доступа хватает на один сон. Сохранить сон в дневник можно без лимита.
const num = (v: string | undefined, d: number) => Math.max(0, Number.isFinite(Number(v)) && v !== undefined && v !== "" ? Number(v) : d);
export const PANELS_PER_DAY = num(process.env.DREAM_PANELS_PER_DAY, 12);
export const BOARDS_PER_DAY = num(process.env.DREAM_BOARDS_PER_DAY, 5);
export const GUEST_PANELS = 4;
export const GUEST_BOARDS = 2;
export const BOARD_MARK = "storyboard";

export type DreamLimits = { boards: number; boardsMax: number; panels: number; panelsMax: number };

export async function dreamLimits(supabase: SupabaseClient, guest: boolean): Promise<DreamLimits> {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data } = await supabase.from("dream_generations").select("provider").gte("created_at", since).limit(500);
  const rows = data ?? [];
  const boardsUsed = rows.filter((r) => r.provider === BOARD_MARK).length;
  const boardsMax = guest ? GUEST_BOARDS : BOARDS_PER_DAY;
  const panelsMax = guest ? GUEST_PANELS : PANELS_PER_DAY;
  return {
    boards: Math.max(0, boardsMax - boardsUsed),
    boardsMax,
    panels: Math.max(0, panelsMax - (rows.length - boardsUsed)),
    panelsMax,
  };
}

export async function panelsLeft(supabase: SupabaseClient, guest: boolean) {
  return (await dreamLimits(supabase, guest)).panels;
}
