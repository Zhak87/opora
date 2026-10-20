import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_LANGUAGE, type Locale } from "@/i18n/config";
import { aiConfigured } from "./ai";
import type { NoteKind } from "@/i18n/analytics";

// ИИ-аналитика для психолога. Материал собирает база (client_ai_material) только из того, на что клиент
// дал согласие; ИИ возвращает структурированную сводку, где наблюдения отделены от предположений.
// Это вспомогательный инструмент: без диагнозов, решения принимает специалист.

// Включается отдельно от ИИ-собеседника: данные клиентов можно отправлять только провайдеру,
// который не обучается на них (платный тариф). AI_ANALYTICS=on ставится, когда это так.
export function analyticsEnabled() {
  return aiConfigured() && process.env.AI_ANALYTICS === "on";
}

export const providerName = () => ((process.env.AI_PROVIDER ?? "gemini") === "openai" ? process.env.OPENAI_MODEL || "openai" : "gemini");

export type Basis = "fact" | "assumption";
export type Confidence = "low" | "medium" | "high";
export type Insight = { title: string; detail: string; basis: Basis; confidence: Confidence; evidence: string[] };
export type Report = {
  summary: string;
  wellbeing: { state: string; trend: "better" | "worse" | "stable" | "unclear" };
  themes: Insight[];
  concerns: Insight[];
  needs: Insight[];
  dynamics: string;
  questions: string[];
  recommendations: string[];
  limitations: string;
};
export type StoredReport = {
  id: string;
  period_from: string;
  period_to: string;
  scopes: string[];
  provider: string | null;
  report: Report;
  created_at: string;
};

export { REPORT_PERIODS, NOTE_KINDS, type NoteKind } from "@/i18n/analytics";

export const ANALYTICS_SYSTEM = `Ты — ассистент психолога в приложении «Опора». Тебе дают материалы клиента, которыми он разрешил делиться со своим психологом: отметки самочувствия (шкалы 1–5, где 5 — лучше), колесо баланса (0–10), цели, записи дневника, его собственные сообщения ИИ-собеседнику, итоги встреч. Подготовь для психолога рабочую сводку перед встречей.

Правила:
- Никаких диагнозов, названий расстройств и медицинских терминов о состоянии клиента. Не оценивай риски как врач. Если в материалах есть слова о желании умереть, причинить себе вред или о насилии — вынеси это первым пунктом в concerns с basis "fact" и цитатой, без интерпретаций.
- Чётко разделяй: basis "fact" — то, что прямо есть в данных (цифры, слова клиента); basis "assumption" — твоя гипотеза. Для каждого пункта укажи confidence: low, medium или high. Если данных мало, так и скажи и ставь low.
- evidence — 1–3 коротких подтверждения из материалов: дата и цифра или короткая цитата клиента (до 20 слов). Не выдумывай того, чего нет в данных.
- Пиши кратко, профессионально и бережно, без оценок личности. Рекомендации — идеи для психолога, а не указания клиенту.
- Если передана прошлая сводка, в dynamics опиши, что изменилось по сравнению с ней.

Верни строго JSON:
{
  "summary": "3–5 предложений: главное за период",
  "wellbeing": { "state": "1–2 предложения о текущем самочувствии по отметкам", "trend": "better | worse | stable | unclear" },
  "themes": [ { "title": "основная тема", "detail": "1–2 предложения", "basis": "fact | assumption", "confidence": "low | medium | high", "evidence": ["..."] } ],
  "concerns": [ ...повторяющиеся переживания, тот же формат... ],
  "needs": [ ...потребности и цели клиента, тот же формат... ],
  "dynamics": "как менялось состояние по неделям или месяцам, 2–4 предложения",
  "questions": ["вопрос, который стоит обсудить на встрече"],
  "recommendations": ["идея для работы психолога"],
  "limitations": "чего не хватает в данных и почему выводы неполные"
}
themes, concerns, needs — по 0–5 пунктов, questions — 3–6, recommendations — 2–5.`;

export function analyticsLanguageNote(locale: Locale) {
  return `Язык ответа: все тексты пиши на ${AI_LANGUAGE[locale]} языке, грамотно, даже если материалы на другом языке. По-казахски пиши только кириллицей. Ключи JSON и значения basis, confidence, trend оставь как в образце.`;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown, max: number, len: number) =>
  Array.isArray(v)
    ? v
        .map((x) => str(x, len))
        .filter(Boolean)
        .slice(0, max)
    : [];
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);

function insights(v: unknown): Insight[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return {
        title: str(o.title, 160),
        detail: str(o.detail, 600),
        basis: oneOf(o.basis, ["fact", "assumption"] as const, "assumption"),
        confidence: oneOf(o.confidence, ["low", "medium", "high"] as const, "low"),
        evidence: list(o.evidence, 3, 240),
      };
    })
    .filter((i) => i.title)
    .slice(0, 6);
}

// Ответ ИИ приводим к строгому виду: лишнее отбрасываем, длины ограничиваем.
export function normalizeReport(raw: unknown): Report | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const wb = (o.wellbeing ?? {}) as Record<string, unknown>;
  const report: Report = {
    summary: str(o.summary, 1500),
    wellbeing: { state: str(wb.state, 600), trend: oneOf(wb.trend, ["better", "worse", "stable", "unclear"] as const, "unclear") },
    themes: insights(o.themes),
    concerns: insights(o.concerns),
    needs: insights(o.needs),
    dynamics: str(o.dynamics, 1200),
    questions: list(o.questions, 8, 300),
    recommendations: list(o.recommendations, 6, 400),
    limitations: str(o.limitations, 800),
  };
  return report.summary ? report : null;
}

export async function listReports(supabase: SupabaseClient, psychologist: string, client: string, limit = 12) {
  const { data } = await supabase
    .from("ai_reports")
    .select("id, period_from, period_to, scopes, provider, report, created_at")
    .eq("psychologist_id", psychologist)
    .eq("client_id", client)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as StoredReport[];
}

export type Note = { id: string; kind: NoteKind; body: string; session_id: string | null; created_at: string; updated_at: string };

export async function listNotes(supabase: SupabaseClient, psychologist: string, client: string, session?: string) {
  let q = supabase
    .from("psychologist_notes")
    .select("id, kind, body, session_id, created_at, updated_at")
    .eq("psychologist_id", psychologist)
    .eq("client_id", client)
    .order("created_at", { ascending: false })
    .limit(100);
  if (session) q = q.eq("session_id", session);
  const { data } = await q;
  return (data ?? []) as Note[];
}
