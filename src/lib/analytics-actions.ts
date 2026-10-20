"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { AIError, generateJSON } from "@/lib/ai";
import {
  ANALYTICS_SYSTEM,
  NOTE_KINDS,
  REPORT_PERIODS,
  analyticsEnabled,
  analyticsLanguageNote,
  listReports,
  normalizeReport,
  providerName,
} from "@/lib/analytics";
import { UUID_RE } from "@/lib/sessions";
import { dayKey, addDays } from "@/lib/time";
import { getTimeZone } from "@/lib/tz";
import { getLocale } from "@/i18n/server";
import { analyticsMessages } from "@/i18n/analytics";
import { HOUR, tooMany } from "@/lib/rate-limit";

type State = { ok?: string; error?: string } | undefined;

async function authed() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/welcome");
  return { supabase, user, m: analyticsMessages[await getLocale()] };
}

type Material = {
  checkins?: unknown[];
  balance?: unknown[];
  goals?: { steps?: unknown[] }[];
  journal?: unknown[];
  ai_chats?: unknown[];
  sessions?: { summary?: string | null }[];
};

// Сколько в материале того, на что можно опереться. Пустые цели и встречи без итогов не считаем.
function amount(d: Material) {
  return (
    (d.checkins?.length ?? 0) +
    (d.balance?.length ?? 0) +
    (d.journal?.length ?? 0) +
    (d.ai_chats?.length ?? 0) +
    (d.goals ?? []).reduce((n, g) => n + 1 + (g.steps?.length ?? 0), 0) +
    (d.sessions ?? []).filter((s) => s.summary).length
  );
}

// Сводка для психолога. Материал собирает база по согласиям клиента; ИИ видит его без имени клиента.
export async function generateReport(_: State, formData: FormData): Promise<State> {
  const { supabase, user, m } = await authed();
  const client = String(formData.get("client") ?? "");
  if (!UUID_RE.test(client)) return { error: m.errors.generic };
  if (!analyticsEnabled()) return { error: m.errors.off };
  const days = Number(formData.get("period"));
  const period = (REPORT_PERIODS as readonly number[]).includes(days) ? days : 90;
  if (tooMany(`analytics:${user.id}`, 12, HOUR)) return { error: m.errors.tooMuch };

  const locale = await getLocale();
  const to = dayKey(new Date(), await getTimeZone());
  const from = addDays(to, -(period - 1));
  const { data, error } = await supabase.rpc("client_ai_material", { p_client: client, p_from: from, p_to: to });
  if (error || !data) return { error: /forbidden/.test(error?.message ?? "") ? m.errors.forbidden : m.errors.generic };
  const { scopes, data: material } = data as { scopes: string[]; data: Material };
  if (amount(material) < 3) return { error: m.errors.tooLittle };

  // Прошлая сводка даёт ИИ точку отсчёта для раздела «динамика».
  const [prev] = await listReports(supabase, user.id, client, 1);
  const content = [
    `Период: ${from} — ${to} (${period} дн.). Шкалы отметок 1–5, где 5 — лучше; колесо баланса 0–10.`,
    prev
      ? `Прошлая сводка (${prev.period_from} — ${prev.period_to}): ${prev.report.summary}\nТемы тогда: ${prev.report.themes.map((t) => t.title).join("; ")}`
      : "Прошлых сводок нет.",
    `Материалы клиента (JSON):\n${JSON.stringify(material).slice(0, 60_000)}`,
  ].join("\n\n");

  let report = null;
  try {
    report = normalizeReport(
      await generateJSON({ system: ANALYTICS_SYSTEM + "\n\n" + analyticsLanguageNote(locale), messages: [{ role: "user", content }], temperature: 0.3 }),
    );
  } catch (e) {
    console.error("analytics", e instanceof AIError ? e.message : e);
    return { error: m.errors.busy };
  }
  if (!report) return { error: m.errors.busy };

  const { data: id, error: saveError } = await supabase.rpc("save_ai_report", {
    p_client: client,
    p_from: from,
    p_to: to,
    p_scopes: scopes,
    p_provider: providerName(),
    p_report: report,
  });
  if (saveError || !id) return { error: /forbidden/.test(saveError?.message ?? "") ? m.errors.forbidden : m.errors.generic };
  revalidatePath(`/pro/clients/${client}`);
  redirect(`/pro/clients/${client}/insights?r=${id}`);
}

/* ---------- Заметки ---------- */

const kindOf = (v: FormDataEntryValue | null) => ((NOTE_KINDS as readonly string[]).includes(String(v)) ? String(v) : "note");
const bodyOf = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .trim()
    .slice(0, 8000);

function revalidateNotes(client: string, session: string | null) {
  revalidatePath(`/pro/clients/${client}`);
  if (session) revalidatePath(`/pro/sessions/${session}`);
}

export async function createNote(_: State, formData: FormData): Promise<State> {
  const { supabase, m } = await authed();
  const client = String(formData.get("client") ?? "");
  const session = String(formData.get("session") ?? "") || null;
  if (!UUID_RE.test(client) || (session && !UUID_RE.test(session))) return { error: m.errors.generic };
  const body = bodyOf(formData.get("body"));
  if (!body) return { error: m.errors.empty };
  const { error } = await supabase.from("psychologist_notes").insert({ client_id: client, session_id: session, kind: kindOf(formData.get("kind")), body });
  if (error) return { error: m.errors.generic };
  revalidateNotes(client, session);
  return { ok: " " };
}

export async function updateNote(_: State, formData: FormData): Promise<State> {
  const { supabase, m } = await authed();
  const id = String(formData.get("note") ?? "");
  if (!UUID_RE.test(id)) return { error: m.errors.generic };
  const body = bodyOf(formData.get("body"));
  if (!body) return { error: m.errors.empty };
  const { data, error } = await supabase
    .from("psychologist_notes")
    .update({ body, kind: kindOf(formData.get("kind")), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("client_id, session_id")
    .maybeSingle();
  if (error || !data) return { error: m.errors.generic };
  revalidateNotes(data.client_id, data.session_id);
  return { ok: " " };
}

export async function deleteNote(formData: FormData) {
  const { supabase } = await authed();
  const id = String(formData.get("note") ?? "");
  if (!UUID_RE.test(id)) return;
  const { data } = await supabase.from("psychologist_notes").delete().eq("id", id).select("client_id, session_id").maybeSingle();
  if (data) revalidateNotes(data.client_id, data.session_id);
}
