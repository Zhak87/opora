import { AI_LANGUAGE, type Locale } from "@/i18n/config";
import { planMessages } from "@/i18n/plan";

// Личный план: несколько игр и советов, которые ИИ собирает по разговорам и дневнику человека.

export type PlanGame =
  | { type: "cards"; title: string; intro: string; cards: { front: string; back: string }[] }
  | { type: "reframe"; title: string; intro: string; items: { thought: string; example: string }[] }
  | {
      type: "choice";
      title: string;
      intro: string;
      scenarios: { situation: string; options: { text: string; feedback: string }[] }[];
    }
  | { type: "steps"; title: string; intro: string; steps: { text: string; seconds: number }[] };

export type PlanTip = { title: string; why: string; action: string };

export type Plan = { summary: string; focus: string[]; games: PlanGame[]; tips: PlanTip[] };

export type PlanProgress = { tips?: Record<string, string[]>; games?: Record<string, number> };

export const GAME_KIND: Record<PlanGame["type"], { label: string; tone: "blue" | "green" | "lavender" | "beige" }> = {
  cards: { label: "Карточки поддержки", tone: "lavender" },
  reframe: { label: "Другой взгляд", tone: "blue" },
  choice: { label: "Что бы вы сделали", tone: "beige" },
  steps: { label: "Практика", tone: "green" },
};

// Те же подписи типов игр на нужном языке.
export function gameKind(locale: Locale): typeof GAME_KIND {
  const k = planMessages[locale].kinds;
  return {
    cards: { label: k.cards, tone: GAME_KIND.cards.tone },
    reframe: { label: k.reframe, tone: GAME_KIND.reframe.tone },
    choice: { label: k.choice, tone: GAME_KIND.choice.tone },
    steps: { label: k.steps, tone: GAME_KIND.steps.tone },
  };
}

// Подсказка ИИ, на каком языке писать текст плана (добавляется к PLAN_SYSTEM).
export function planLanguageNote(locale: Locale) {
  return `Язык ответа: весь текст плана (summary, focus, названия игр, вступления, карточки, мысли, ситуации, варианты, шаги, советы) пиши на ${AI_LANGUAGE[locale]} языке, даже если материалы человека на другом языке. Это указание важнее слов «пиши по-русски» выше. Обращение — вежливое, на «вы». Ключи JSON и значения поля "type" оставь как в образце.`;
}

export const PLAN_SYSTEM = `Ты — бережный психолог-консультант в приложении «Опора». По сообщениям человека из разговоров и его записям в дневнике ты составляешь для него личный план: несколько коротких игр-упражнений и советов, которых ему стоит придерживаться. Всё должно опираться на то, что человек действительно рассказал: его ситуации, слова, тревоги, цели и сильные стороны. Если данных мало, сделай план мягким и общим, о заботе о себе и знакомстве с собой.

Пиши по-русски, тепло, просто, обращайся на «вы». Не ставь диагнозов. Советы подавай как рекомендации. Без markdown.

Верни строго JSON такого вида:
{
  "summary": "2–3 тёплых предложения: что вы заметили в рассказах человека и на что направлен план",
  "focus": ["2–4 коротких темы плана, по 1–3 слова"],
  "games": [
    { "type": "cards", "title": "название", "intro": "1 предложение, зачем эта игра",
      "cards": [ { "front": "трудная мысль или ситуация человека его словами", "back": "тёплый, поддерживающий и конкретный ответ, 1–3 предложения" } ] },
    { "type": "reframe", "title": "название", "intro": "1 предложение",
      "items": [ { "thought": "типичная тяжёлая мысль человека", "example": "более бережный и реалистичный взгляд на неё" } ] },
    { "type": "choice", "title": "название", "intro": "1 предложение",
      "scenarios": [ { "situation": "жизненная ситуация, похожая на ситуации человека", "options": [ { "text": "вариант действия", "feedback": "что даёт этот вариант, мягко, без оценки «правильно/неправильно», 1–2 предложения" } ] } ] },
    { "type": "steps", "title": "название", "intro": "1 предложение",
      "steps": [ { "text": "шаг практики, что именно сделать", "seconds": 30 } ] }
  ],
  "tips": [ { "title": "короткий совет, 3–7 слов", "why": "почему это поможет именно вам, 1–2 предложения", "action": "маленькое конкретное действие на сегодня" } ]
}

Требования: ровно 4 игры, по одной каждого типа и в этом порядке; в cards 5–7 карточек; в reframe 4–5 мыслей; в choice 3 ситуации по 3 варианта; в steps 4–6 шагов, seconds от 0 до 90 (0, если таймер не нужен); tips 5 советов, которых можно придерживаться каждый день. Названия игр живые и личные, не повторяй названия типов.`;

const str = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const arr = (v: unknown) => (Array.isArray(v) ? v : []);

// Приводим ответ ИИ к ожидаемой форме, отбрасывая всё лишнее и пустое.
export function normalizePlan(raw: unknown): Plan | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const games: PlanGame[] = [];
  for (const g of arr(r.games) as Record<string, unknown>[]) {
    const title = str(g?.title, 80);
    const intro = str(g?.intro, 300);
    if (!title) continue;
    if (g.type === "cards") {
      const cards = arr(g.cards)
        .map((c) => ({ front: str(c?.front, 200), back: str(c?.back, 400) }))
        .filter((c) => c.front && c.back)
        .slice(0, 8);
      if (cards.length >= 2) games.push({ type: "cards", title, intro, cards });
    } else if (g.type === "reframe") {
      const items = arr(g.items)
        .map((c) => ({ thought: str(c?.thought, 200), example: str(c?.example, 400) }))
        .filter((c) => c.thought && c.example)
        .slice(0, 6);
      if (items.length >= 2) games.push({ type: "reframe", title, intro, items });
    } else if (g.type === "choice") {
      const scenarios = arr(g.scenarios)
        .map((s) => ({
          situation: str(s?.situation, 300),
          options: arr(s?.options)
            .map((o) => ({ text: str(o?.text, 160), feedback: str(o?.feedback, 300) }))
            .filter((o) => o.text && o.feedback)
            .slice(0, 4),
        }))
        .filter((s) => s.situation && s.options.length >= 2)
        .slice(0, 4);
      if (scenarios.length) games.push({ type: "choice", title, intro, scenarios });
    } else if (g.type === "steps") {
      const steps = arr(g.steps)
        .map((s) => ({
          text: str(typeof s === "string" ? s : s?.text, 300),
          seconds: Math.max(0, Math.min(120, Math.round(Number(s?.seconds) || 0))),
        }))
        .filter((s) => s.text)
        .slice(0, 7);
      if (steps.length >= 2) games.push({ type: "steps", title, intro, steps });
    }
  }
  const tips = arr(r.tips)
    .map((t) => ({ title: str(t?.title, 100), why: str(t?.why, 300), action: str(t?.action, 300) }))
    .filter((t) => t.title && t.action)
    .slice(0, 6);
  if (!games.length || !tips.length) return null;
  return {
    summary: str(r.summary, 600),
    focus: arr(r.focus).map((f) => str(f, 40)).filter(Boolean).slice(0, 4),
    games,
    tips,
  };
}

// Дата в часовом поясе пользователя не известна на сервере, поэтому день отмечает браузер.
export function streak(days: string[] = [], today: string) {
  const set = new Set(days);
  let n = 0;
  const d = new Date(`${today}T12:00:00Z`);
  if (!set.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  while (set.has(d.toISOString().slice(0, 10))) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}
