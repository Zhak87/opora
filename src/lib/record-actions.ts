"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { getSession, UUID_RE } from "@/lib/sessions";
import { closeConsultRooms } from "@/lib/consult/server";
import { NOTE_FIELDS, NOTE_TEMPLATES, type NoteField, type NoteTemplate } from "@/lib/records";
import { getLocale } from "@/i18n/server";
import { recordMessages } from "@/i18n/record";

type State = { ok?: string; error?: string } | undefined;

async function authed() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/welcome");
  return { supabase, user, m: recordMessages[await getLocale()] };
}

const text = (v: unknown, max: number) => {
  const s = typeof v === "string" ? v.trim().slice(0, max) : "";
  return s || null;
};
const dateOf = (v: FormDataEntryValue | null) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : null);

export type NoteInput = {
  session: string;
  template: NoteTemplate;
  topic: string;
  state: number | null;
  fields: Partial<Record<NoteField, string>>;
  hypotheses: string;
  nextQuestions: string;
  summaryDraft: string;
};

// Личная запись психолога и черновик итога. Сохраняется сама, пока психолог печатает.
// Клиенту отсюда ничего не уходит: для этого есть отдельное действие shareSummary.
export async function saveSessionNote(input: NoteInput): Promise<{ ok: boolean }> {
  const { supabase, user } = await authed();
  if (!input || !UUID_RE.test(String(input.session))) return { ok: false };
  const s = await getSession(supabase, input.session);
  if (!s || s.psychologist_id !== user.id) return { ok: false };
  const fields: Partial<Record<NoteField, string>> = {};
  for (const k of NOTE_FIELDS) {
    const v = text(input.fields?.[k], 6000);
    if (v) fields[k] = v;
  }
  const state = Number.isInteger(input.state) && input.state! >= 0 && input.state! <= 10 ? input.state : null;
  const { error } = await supabase.from("session_notes").upsert({
    session_id: s.id,
    psychologist_id: user.id,
    client_id: s.client_id,
    template: (NOTE_TEMPLATES as readonly string[]).includes(input.template) ? input.template : "free",
    topic: text(input.topic, 300),
    client_state: state,
    fields,
    hypotheses: text(input.hypotheses, 4000),
    next_questions: text(input.nextQuestions, 4000),
    summary_draft: text(input.summaryDraft, 4000),
    updated_at: new Date().toISOString(),
  });
  return { ok: !error };
}

// Завершить встречу, ничего не отправляя клиенту.
export async function finishSession(_: State, formData: FormData): Promise<State> {
  const { supabase, m } = await authed();
  const id = String(formData.get("session") ?? "");
  if (!UUID_RE.test(id)) return { error: m.errors.generic };
  const { error } = await supabase.rpc("finish_session", { p_session: id });
  if (error) return { error: m.errors.generic };
  await closeConsultRooms(id);
  revalidatePath("/pro", "layout");
  revalidatePath("/care", "layout");
  return { ok: m.finish.done };
}

// «Поделиться с клиентом»: единственный путь, которым итог попадает к клиенту.
export async function shareSummary(session: string, summary: string): Promise<State> {
  const { supabase, m } = await authed();
  if (!UUID_RE.test(String(session))) return { error: m.errors.generic };
  const body = text(summary, 4000);
  if (!body) return { error: m.errors.emptySummary };
  const { error } = await supabase.rpc("share_summary", { p_session: session, p_summary: body });
  if (error) return { error: m.errors.generic };
  await supabase.from("session_notes").update({ summary_draft: body }).eq("session_id", session);
  await closeConsultRooms(session);
  await supabase.from("consult_drafts").update({ published_at: new Date().toISOString() }).eq("session_id", session);
  revalidatePath("/pro", "layout");
  revalidatePath("/care", "layout");
  return { ok: m.summary.sharedNow };
}

/* ---------- Задания ---------- */

export async function assignTask(_: State, formData: FormData): Promise<State> {
  const { supabase, m } = await authed();
  const client = String(formData.get("client") ?? "");
  const session = String(formData.get("session") ?? "") || null;
  if (!UUID_RE.test(client) || (session && !UUID_RE.test(session))) return { error: m.errors.generic };
  const title = text(formData.get("title"), 200);
  if (!title) return { error: m.errors.emptyTask };
  const { error } = await supabase.rpc("assign_task", {
    p_client: client,
    p_title: title,
    p_details: text(formData.get("details"), 4000),
    p_due: dateOf(formData.get("due")),
    p_session: session,
  });
  if (error) return { error: /too many/.test(error.message) ? m.errors.tooMany : m.errors.generic };
  revalidatePath("/pro", "layout");
  revalidatePath("/care", "layout");
  return { ok: m.tasks.assigned };
}

export async function cancelTask(formData: FormData) {
  const { supabase } = await authed();
  const id = String(formData.get("task") ?? "");
  if (!UUID_RE.test(id)) return;
  await supabase.rpc("update_task", { p_task: id, p_title: "-", p_cancel: true });
  revalidatePath("/pro", "layout");
  revalidatePath("/care", "layout");
}

// Клиент: «выполнено» (или вернуть в работу) и, по желанию, как это было.
export async function setTaskDone(_: State, formData: FormData): Promise<State> {
  const { supabase, m } = await authed();
  const id = String(formData.get("task") ?? "");
  if (!UUID_RE.test(id)) return { error: m.errors.generic };
  const { error } = await supabase.rpc("set_task_done", {
    p_task: id,
    p_done: formData.get("done") === "1",
    p_feedback: text(formData.get("feedback"), 2000),
  });
  if (error) return { error: m.errors.generic };
  revalidatePath("/pro", "layout");
  revalidatePath("/care", "layout");
  return { ok: " " };
}

// Сообщение в ветке задания: от клиента или от психолога.
export async function replyTask(_: State, formData: FormData): Promise<State> {
  const { supabase, m } = await authed();
  const id = String(formData.get("task") ?? "");
  const body = text(formData.get("body"), 2000);
  if (!UUID_RE.test(id)) return { error: m.errors.generic };
  if (!body) return { error: m.errors.emptyReply };
  const { error } = await supabase.rpc("reply_task", { p_task: id, p_body: body });
  if (error) return { error: m.errors.generic };
  revalidatePath("/pro", "layout");
  revalidatePath("/care", "layout");
  return { ok: " " };
}
