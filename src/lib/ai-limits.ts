import type { SupabaseClient } from "@supabase/supabase-js";

// Дневные лимиты на ИИ (миграция 0027): на человека и на весь сайт. Считает база, поэтому лимит
// переживает перезапуск сервера. Числа можно поменять без кода: AI_LIMITS='{"chat":{"user":80}}'.
export type AIKind = "chat" | "tts" | "stt" | "ai";
type Limit = { user: number; guest: number; global: number };

const DEFAULTS: Record<AIKind, Limit> = {
  // Ответы собеседника: живой разговор на час–полтора в день.
  chat: { user: 60, guest: 15, global: 3000 },
  // Озвучка — самое дорогое: остальное читает голос телефона или браузера.
  tts: { user: 20, guest: 3, global: 400 },
  // Распознавание голоса.
  stt: { user: 60, guest: 10, global: 2000 },
  // Разовые задачи: план, курс, сны, итог для психолога, черновики.
  ai: { user: 20, guest: 3, global: 600 },
};

function limits(): Record<AIKind, Limit> {
  try {
    const custom = JSON.parse(process.env.AI_LIMITS || "{}") as Partial<Record<AIKind, Partial<Limit>>>;
    return Object.fromEntries(
      (Object.keys(DEFAULTS) as AIKind[]).map((k) => [k, { ...DEFAULTS[k], ...(custom[k] ?? {}) }]),
    ) as Record<AIKind, Limit>;
  } catch {
    return DEFAULTS;
  }
}

// guest: пробный доступ (анонимный аккаунт без почты). true — можно звать ИИ (запрос засчитан). Если база недоступна или миграции ещё нет, не мешаем работе.
export async function takeAI(supabase: SupabaseClient, kind: AIKind, guest = false): Promise<boolean> {
  const l = limits()[kind];
  const { data, error } = await supabase.rpc("ai_take", { p_kind: kind, p_user_limit: guest ? l.guest : l.user, p_global_limit: l.global });
  if (error) {
    console.error(`[ai-limits] ${kind}`, error.message);
    return true;
  }
  if (data === false) console.warn(`[ai-limits] ${kind} limit reached`);
  return data !== false;
}
