// Главная «по потребностям» (разделы 9–13 стратегии, пирамида Маслоу): человек выбирает не раздел,
// а то, что ему сейчас нужно, и получает три подходящих шага. Порядок идёт снизу пирамиды вверх:
// отдых и безопасность, близость, уважение к себе, поиск себя.
export const NEEDS = ["rest", "ground", "together", "worth", "self"] as const;
export type Need = (typeof NEEDS)[number];

export type NeedItem =
  | { kind: "game"; slug: "breath" | "garden" | "light" | "grounding" | "bubbles" | "strengths" | "jar" | "letter" | "values" | "what-if" | "wheel" }
  | { kind: "place"; to: "rooms" | "specialists" }
  | { kind: "talk" };

export const NEED_ITEMS: Record<Need, NeedItem[]> = {
  rest: [{ kind: "game", slug: "breath" }, { kind: "game", slug: "garden" }, { kind: "game", slug: "light" }],
  ground: [{ kind: "game", slug: "grounding" }, { kind: "game", slug: "bubbles" }, { kind: "talk" }],
  together: [{ kind: "place", to: "rooms" }, { kind: "talk" }, { kind: "place", to: "specialists" }],
  worth: [{ kind: "game", slug: "strengths" }, { kind: "game", slug: "jar" }, { kind: "game", slug: "letter" }],
  self: [{ kind: "game", slug: "values" }, { kind: "game", slug: "what-if" }, { kind: "game", slug: "wheel" }],
};

export const isNeed = (v: unknown): v is Need => typeof v === "string" && (NEEDS as readonly string[]).includes(v);

// С чего начать: по сегодняшней отметке настроения (1–5), а без неё с отдыха.
export function needForMood(mood?: number | null): Need {
  if (!mood) return "rest";
  if (mood <= 2) return "ground";
  if (mood === 3) return "rest";
  return "self";
}

// Аудитории из стратегии (раздел 9): отдельные слова на странице входа по ссылке /welcome?for=…
// step: молодые взрослые 18–30, share: женщины 25–35 в период перемен.
export const AUDIENCES = ["step", "share"] as const;
export type Audience = (typeof AUDIENCES)[number];
export const isAudience = (v: unknown): v is Audience => typeof v === "string" && (AUDIENCES as readonly string[]).includes(v);
