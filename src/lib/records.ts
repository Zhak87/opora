import type { SupabaseClient } from "@supabase/supabase-js";

// Записи по встрече в трёх уровнях (supabase/migrations/0020_session_records.sql):
// личная запись психолога, итог для клиента и задания с обратной связью.

export const NOTE_TEMPLATES = ["free", "cbt"] as const;
export type NoteTemplate = (typeof NOTE_TEMPLATES)[number];
// Поля шаблонов: свободная форма — одно поле, КПТ — как идёт сама сессия.
export const TEMPLATE_FIELDS = { free: ["body"], cbt: ["agenda", "homework", "thoughts", "feedback"] } as const;
export const NOTE_FIELDS = ["body", "agenda", "homework", "thoughts", "feedback"] as const;
export type NoteField = (typeof NOTE_FIELDS)[number];

export type SessionNote = {
  session_id: string;
  template: NoteTemplate;
  topic: string | null;
  client_state: number | null;
  fields: Partial<Record<NoteField, string>>;
  hypotheses: string | null;
  next_questions: string | null;
  summary_draft: string | null;
  updated_at: string;
};

export type TaskReply = { id: string; author_id: string; body: string; created_at: string };
export type Task = {
  id: string;
  psychologist_id: string;
  client_id: string;
  session_id: string | null;
  title: string;
  details: string | null;
  due_on: string | null;
  status: "open" | "done" | "cancelled";
  done_at: string | null;
  created_at: string;
  replies: TaskReply[];
};

const NOTE_COLUMNS = "session_id, template, topic, client_state, fields, hypotheses, next_questions, summary_draft, updated_at";

// Личная запись психолога по встрече. Клиенту база её не отдаёт.
export async function getSessionNote(supabase: SupabaseClient, session: string) {
  const { data } = await supabase.from("session_notes").select(NOTE_COLUMNS).eq("session_id", session).maybeSingle();
  return (data as SessionNote | null) ?? null;
}

// Личные записи по клиенту: для подготовки к встрече и для списка встреч в карточке.
export async function clientSessionNotes(supabase: SupabaseClient, psychologist: string, client: string, limit = 50) {
  const { data } = await supabase
    .from("session_notes")
    .select(NOTE_COLUMNS)
    .eq("psychologist_id", psychologist)
    .eq("client_id", client)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as SessionNote[];
}

export const noteHasText = (n: SessionNote | null | undefined) =>
  Boolean(n && (n.topic || n.hypotheses || n.next_questions || n.client_state != null || Object.values(n.fields ?? {}).some(Boolean)));

type TaskFilter = { psychologist?: string; client?: string; session?: string };

// Задания с ветками обратной связи. Кого показывать, решает база: клиент видит свои, психолог — назначенные им.
export async function listTasks(supabase: SupabaseClient, f: TaskFilter, limit = 100) {
  let q = supabase
    .from("assignments")
    .select("id, psychologist_id, client_id, session_id, title, details, due_on, status, done_at, created_at, replies:assignment_replies(id, author_id, body, created_at)")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "assignment_replies", ascending: true })
    .limit(limit);
  if (f.psychologist) q = q.eq("psychologist_id", f.psychologist);
  if (f.client) q = q.eq("client_id", f.client);
  if (f.session) q = q.eq("session_id", f.session);
  const { data } = await q;
  return (data ?? []) as Task[];
}
