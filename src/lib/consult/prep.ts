import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/config";
import { INTL } from "@/i18n/config";
import { careMessages } from "@/i18n/care";
import { listNotes, listReports } from "@/lib/analytics";
import { myClients } from "@/lib/pro";
import type { Session } from "@/lib/sessions";
import type { PrepData } from "@/components/consult/AssistantPanel";
import { pastAgreements } from "./assistant";
import { consultAiEnabled } from "./server";

// Подготовка к встрече для психолога: прошлые договорённости, его заметки, вопросы из последней сводки
// и список того, чем клиент разрешил делиться. Всё — с правами психолога, в пределах согласий клиента.
export async function buildPrep(supabase: SupabaseClient, s: Session, locale: Locale, tz: string): Promise<PrepData> {
  const fmt = (iso: string) => new Intl.DateTimeFormat(INTL[locale], { timeZone: tz, day: "numeric", month: "long" }).format(new Date(iso));
  const [agreements, notes, [report], clients] = await Promise.all([
    pastAgreements(supabase, s),
    listNotes(supabase, s.psychologist_id, s.client_id),
    listReports(supabase, s.psychologist_id, s.client_id, 1),
    myClients(supabase, s.psychologist_id),
  ]);
  const scopes = clients.find((c) => c.link.client_id === s.client_id)?.scopes ?? [];
  const titles = careMessages[locale].scopes;
  return {
    client: s.client_id,
    ai: consultAiEnabled(),
    agreements: agreements.map((a) => ({ date: fmt(a.starts_at), summary: a.summary, tasks: a.tasks })),
    notes: notes.slice(0, 6).map((n) => ({ date: fmt(n.created_at), body: n.body.slice(0, 1200) })),
    questions: report?.report.questions ?? [],
    materials: scopes.map((sc) => titles[sc].title),
  };
}
