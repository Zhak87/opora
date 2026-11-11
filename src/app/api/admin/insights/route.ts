import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { aiConfigured, generateJSON } from "@/lib/ai";
import { HOUR, tooMany } from "@/lib/rate-limit";
import { getLocale } from "@/i18n/server";
import { LOCALE_NAMES } from "@/i18n/config";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `Ты продуктовый аналитик сервиса психологической самопомощи «Опора» (Казахстан): ИИ-собеседник, практики, комнаты с людьми и психологи. Стадия: проверка продукта, платежей пока нет. Главная метрика: люди, которые за неделю сделали хотя бы одно полезное действие.
Тебе дают только сводные цифры (никаких личных данных). Разбери их для владельца, который не аналитик: коротко, простыми словами, без терминов и без воды.
Правила: опирайся только на цифры из данных и называй их; если данных мало (десятки людей и меньше), прямо скажи, что выводы предварительные; не выдумывай причин, которых из цифр не видно, а предлагай, что проверить; действия должны быть конкретными и выполнимыми за неделю.
Ответь строго JSON: {"summary": "2–3 предложения о главном", "good": ["что работает, до 3 пунктов"], "problems": ["где теряются люди или что тревожит, до 4 пунктов"], "actions": ["что сделать на этой неделе, до 4 пунктов"]}.`;

const list = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").map((x) => x.slice(0, 400)).slice(0, max) : []);

// Разбор цифр через ИИ. В запрос уходят только сводные числа из отчётов: без имён, почты и текстов.
export async function POST() {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [{ data: overview, error }, { data: funnel }] = await Promise.all([
    supabase.rpc("admin_overview"),
    supabase.rpc("funnel_report", { p_days: 30 }),
  ]);
  if (error || !overview) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!aiConfigured()) return NextResponse.json({ error: "no-ai" }, { status: 503 });
  if (tooMany(`insights:${user.id}`, 12, HOUR)) return NextResponse.json({ error: "busy" }, { status: 429 });

  // Ленту событий и разбивку по дням не отправляем: для выводов хватает итогов.
  const { feed: _feed, ...now } = overview as Record<string, unknown>;
  const { daily: _daily, ...month } = (funnel ?? {}) as Record<string, unknown>;
  void _feed;
  void _daily;
  try {
    const raw = (await generateJSON({
      system: `${SYSTEM}\nПиши на языке: ${LOCALE_NAMES[await getLocale()]}.`,
      messages: [{ role: "user", content: `Сейчас и всего:\n${JSON.stringify(now)}\n\nВоронка за 30 дней:\n${JSON.stringify(month)}` }],
      maxTokens: 2048,
      temperature: 0.4,
    })) as Record<string, unknown>;
    return NextResponse.json({
      summary: typeof raw.summary === "string" ? raw.summary.slice(0, 900) : "",
      good: list(raw.good, 3),
      problems: list(raw.problems, 4),
      actions: list(raw.actions, 4),
    });
  } catch (e) {
    console.error("[admin insights]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
