import type { SupabaseClient } from "@supabase/supabase-js";

// Бюджет ИИ в комнатах. Перед каждым запросом к ИИ сервер атомарно резервирует расход в базе
// (функция room_ai_reserve, миграция 0030): на весь сервис, на комнату и на человека, за сутки по Алматы.
// Если хоть один лимит исчерпан — запроса нет, ИИ молчит, а человеческий чат работает как обычно.
// После ответа резерв поправляется на фактический расход (room_ai_settle).
//
// Настройка без изменения кода (значения в долларах, токенах, секундах голоса, числе ответов):
//   ROOMS_AI_LIMITS='{"all":{"usd":0.3},"user":{"replies":20}}'
//   ROOMS_AI_PRICES='{"in":0.25,"out":1.5,"ttsIn":1,"ttsOut":20}'   — цены за 1 млн токенов, $
export type Scope = { usd?: number; tokens?: number; tts_sec?: number; replies?: number };
export type Limits = { all: Scope; room: Scope; user: Scope };

export const DEFAULT_LIMITS: Limits = {
  // ≈ $9 в месяц на все комнаты при полном расходе каждый день
  all: { usd: 0.3, tokens: 1_000_000, tts_sec: 600, replies: 1500 },
  room: { usd: 0.08, tokens: 250_000, tts_sec: 180, replies: 300 },
  user: { usd: 0.02, tokens: 50_000, tts_sec: 60, replies: 25 },
};

// Цены Gemini (платный тариф, $ за 1 млн токенов): gemini-3.1-flash-lite — 0.25 / 1.50,
// gemini-3.1-flash-tts — 1.00 за текст / 20.00 за звук, звук = 25 токенов в секунду.
export const DEFAULT_PRICES = { in: 0.25, out: 1.5, ttsIn: 1, ttsOut: 20, audioTokensPerSec: 25 };

function parse<T>(raw: string | undefined, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function limits(): Limits {
  const custom = parse<Partial<Limits>>(process.env.ROOMS_AI_LIMITS, {});
  return {
    all: { ...DEFAULT_LIMITS.all, ...custom.all },
    room: { ...DEFAULT_LIMITS.room, ...custom.room },
    user: { ...DEFAULT_LIMITS.user, ...custom.user },
  };
}

export function prices() {
  return { ...DEFAULT_PRICES, ...parse<Partial<typeof DEFAULT_PRICES>>(process.env.ROOMS_AI_PRICES, {}) };
}

// Стоимость в миллионных долях доллара.
export function textCost(inputTokens: number, outputTokens: number) {
  const p = prices();
  return Math.ceil(inputTokens * p.in + outputTokens * p.out);
}

export function ttsCost(chars: number, seconds: number) {
  const p = prices();
  return Math.ceil(Math.ceil(chars / 3.5) * p.ttsIn + seconds * p.audioTokensPerSec * p.ttsOut);
}

// Русская речь ≈ 14 символов в секунду.
export const speechSeconds = (chars: number) => Math.max(1, Math.round((chars / 14) * 10) / 10);

export type Spend = { tokens: number; tts_sec: number; replies: number; cost_micro: number };

export async function reserve(db: SupabaseClient, room: string, user: string | null, s: Spend) {
  const { data, error } = await db.rpc("room_ai_reserve", {
    p_room: room,
    p_user: user,
    p_tokens: s.tokens,
    p_tts_sec: s.tts_sec,
    p_replies: s.replies,
    p_cost_micro: s.cost_micro,
    p_limits: limits(),
  });
  if (error) {
    // Без проверки бюджета денег не тратим: если база не ответила, ИИ молчит.
    console.error("rooms budget:", error.message);
    return false;
  }
  return data === true;
}

export async function settle(db: SupabaseClient, room: string, user: string | null, delta: Spend) {
  if (!delta.tokens && !delta.tts_sec && !delta.replies && !delta.cost_micro) return;
  const { error } = await db.rpc("room_ai_settle", {
    p_room: room,
    p_user: user,
    p_tokens: Math.round(delta.tokens),
    p_tts_sec: delta.tts_sec,
    p_replies: delta.replies,
    p_cost_micro: Math.round(delta.cost_micro),
  });
  if (error) console.error("rooms budget settle:", error.message);
}
