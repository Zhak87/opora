// Подсказки помощника психолога: формат карточек и защита от повторов.
// Чистый модуль без Next.js: его же копирует мобильное приложение (scripts/sync-shared.mjs).

export type HintType = "question" | "notice" | "offer" | "care";
export type HintItem = { type: HintType; text: string; quote?: string; why?: string };

export const HINT_TYPES: HintType[] = ["care", "question", "notice", "offer"];

// Готовые вопросы помощнику одной кнопкой.
export const ASK_PRESETS = ["next", "missing", "offer", "recap"] as const;
export type AskPreset = (typeof ASK_PRESETS)[number];

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

export function normalizeHints(raw: unknown, max = 3): HintItem[] {
  const list = Array.isArray((raw as { items?: unknown })?.items) ? (raw as { items: unknown[] }).items : Array.isArray(raw) ? raw : [];
  const out: HintItem[] = [];
  for (const x of list) {
    const o = (x ?? {}) as Record<string, unknown>;
    const type = HINT_TYPES.includes(o.type as HintType) ? (o.type as HintType) : "notice";
    const text = clip(o.text, 220);
    if (!text) continue;
    const quote = clip(o.quote, 160) || undefined;
    const why = clip(o.why, 200) || undefined;
    out.push({ type, text, quote, why });
    if (out.length >= max) break;
  }
  // Сигнал о безопасности всегда первым.
  return out.sort((a, b) => Number(b.type === "care") - Number(a.type === "care"));
}

export const encodeHints = (items: HintItem[]) => JSON.stringify({ v: 2, items });

// Старые подсказки хранились текстом («• наблюдение», «? вопрос») — показываем и их.
export function parseHints(body: string): HintItem[] {
  if (body.startsWith("{")) {
    try {
      return normalizeHints(JSON.parse(body), 6);
    } catch {}
  }
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (l.startsWith("?") ? { type: "question" as const, text: l.slice(1).trim() } : { type: "notice" as const, text: l.replace(/^[•\-]\s*/, "") }));
}

// Похожесть по словам: «основа» слова — первые 5 букв, короткие служебные слова не считаются.
function stems(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/ё/g, "е")
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length > 3)
      .map((w) => w.slice(0, 5)),
  );
}

export function similar(a: string, b: string) {
  const x = stems(a);
  const y = stems(b);
  if (!x.size || !y.size) return 0;
  let common = 0;
  for (const w of x) if (y.has(w)) common++;
  return common / Math.min(x.size, y.size);
}

// Убирает подсказки, которые по смыслу повторяют уже показанные (и друг друга).
export function dropRepeats(items: HintItem[], seen: string[], threshold = 0.6) {
  const kept: HintItem[] = [];
  for (const it of items) {
    const all = [...seen, ...kept.map((k) => k.text)];
    if (all.some((s) => similar(s, it.text) >= threshold)) continue;
    kept.push(it);
  }
  return kept;
}
