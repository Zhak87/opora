import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { myPsychologist } from "@/lib/pro";
import { UUID_RE, getSession } from "@/lib/sessions";
import { cancelSession } from "@/lib/session-actions";
import { timeOf, toLocalInput, whenLabel } from "@/lib/time";
import { INTL } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { scheduleMessages } from "@/i18n/schedule";
import { proLabels, proMessages } from "@/i18n/pro";
import { common } from "@/i18n/common";
import { Card, Notice } from "@/components/ui";
import { Avatar } from "@/components/pro/bits";
import { ConfirmForm } from "@/components/ConfirmForm";
import { MoveSessionForm, NewSessionForm } from "@/components/schedule/ProForms";
import { BackIcon, ShieldIcon, SparkIcon } from "@/components/icons";
import { listNotes, listReports } from "@/lib/analytics";
import { analyticsMessages } from "@/i18n/analytics";
import { NotesPanel } from "@/components/analytics/Notes";
import { JoinCard } from "@/components/consult/JoinCard";
import { SessionRecord } from "@/components/record/SessionRecord";
import { TaskList } from "@/components/record/Tasks";
import { clientSessionNotes, listTasks, noteHasText } from "@/lib/records";
import { recordMessages } from "@/i18n/record";
import { cabinetMessages } from "@/i18n/cabinet";
import { NoShowToggle, PaidToggle } from "@/components/pro/Marks";
import { consultMessages } from "@/i18n/consult";
import { consultAiEnabled } from "@/lib/consult/server";
import { normalizeDraft, transcriptOf } from "@/lib/consult/assistant";
import { deleteConsultData } from "@/lib/consult/draft-actions";

export default async function ProSession({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ moved?: string; after?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID_RE.test(id)) notFound();
  const { supabase, user } = await requireUser();
  const s = await getSession(supabase, id);
  if (!s || s.psychologist_id !== user!.id) notFound();
  const locale = await getLocale();
  const m = scheduleMessages[locale];
  const me = (await myPsychologist(supabase, user!.id))!;
  const tz = me.timezone;
  const { data: client } = await supabase.from("profiles").select("name").eq("id", s.client_id).maybeSingle();
  const name = client?.name ?? proMessages[locale].clients.noName;
  const past = Date.parse(s.starts_at) < Date.now();
  // Заметки к этой встрече и вопросы из последней ИИ-сводки (если клиент разрешил аналитику — иначе RLS вернёт пусто).
  const [notes, [report]] = await Promise.all([listNotes(supabase, user!.id, s.client_id, s.id), listReports(supabase, user!.id, s.client_id, 1)]);
  const am = analyticsMessages[locale];
  const cm = consultMessages[locale];
  const [{ data: draftRow }, transcript, { data: link }] = await Promise.all([
    supabase.from("consult_drafts").select("body, published_at, expires_at").eq("session_id", s.id).maybeSingle(),
    transcriptOf(supabase, s.id),
    supabase.from("client_links").select("status").eq("psychologist_id", s.psychologist_id).eq("client_id", s.client_id).eq("status", "active").maybeSingle(),
  ]);
  // Три уровня записей: личные заметки по клиенту (эта встреча и прошлая), задания клиента.
  const rm = recordMessages[locale];
  const [sessionNotes, clientTasks] = await Promise.all([clientSessionNotes(supabase, user!.id, s.client_id, 20), listTasks(supabase, { psychologist: user!.id, client: s.client_id })]);
  const note = sessionNotes.find((n) => n.session_id === s.id) ?? null;
  const prevNote = sessionNotes.find((n) => n.session_id !== s.id && noteHasText(n)) ?? null;
  const openTasks = clientTasks.filter((t) => t.session_id !== s.id && (t.status === "open" || t.replies.length > 0)).slice(0, 5);
  const { count: hintCount } = await supabase.from("consult_ai_messages").select("id", { count: "exact", head: true }).eq("session_id", s.id);
  const dateFmt = (iso: string) => new Intl.DateTimeFormat(INTL[locale], { timeZone: tz, day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  const hasPrivate = Boolean(draftRow || transcript.length || hintCount);
  // Следующая встреча: по умолчанию через неделю в то же время.
  const nextDefault = toLocalInput(new Date(Date.parse(s.starts_at) + 7 * 86_400_000), tz);
  const showNext = s.status !== "cancelled" && (past || s.status === "completed") && Boolean(link);
  const reportDate = report && new Intl.DateTimeFormat(INTL[locale], { timeZone: tz, day: "numeric", month: "long" }).format(new Date(report.created_at));

  return (
    <>
      <Link href="/pro/schedule" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {common[locale].back}
      </Link>
      <header className="mb-8 flex items-center gap-4">
        <Avatar name={name} size={56} />
        <div>
          <p className="text-sm text-ink-soft">
            {m.pro.session} · {m.status[s.status]} · {proLabels[locale].formats[s.format]}
          </p>
          <h1 className="font-serif text-[28px] leading-tight text-ink sm:text-[34px]">{whenLabel(s.starts_at, tz, locale)}</h1>
          <p className="text-sm text-ink-faint">
            {timeOf(s.starts_at, tz, INTL[locale])}–{timeOf(s.ends_at, tz, INTL[locale])} ·{" "}
            {client ? (
              <Link href={`/pro/clients/${s.client_id}`} className="text-sky-deep hover:text-ink">
                {name}
              </Link>
            ) : (
              name
            )}
          </p>
        </div>
      </header>
      <div className="stagger space-y-5">
        {sp.moved && <Notice>{m.care.rescheduled}</Notice>}
        {s.status === "cancelled" && s.cancel_reason && <Notice tone="error">{s.cancel_reason}</Notice>}
        {s.late_cancel && (
          <Notice>
            <span data-late-cancel>
              {cabinetMessages[locale].attend.lateCancel}. {cabinetMessages[locale].attend.lateCancelHint(me.cancel_hours)}
            </span>
          </Notice>
        )}
        {(past ? s.status !== "cancelled" : false) || s.late_cancel ? (
          <div className="flex flex-wrap items-center gap-2" data-session-marks>
            <PaidToggle session={s} locale={locale} />
            {s.status !== "cancelled" && (!s.summary_shared_at || s.no_show) && <NoShowToggle session={s} locale={locale} />}
            {s.no_show && <span className="rounded-full bg-sand px-3 py-1 text-sm text-ink-soft" data-no-show-mark>{cabinetMessages[locale].attend.noShow}</span>}
          </div>
        ) : null}
        {s.status === "scheduled" && s.format === "online" && <JoinCard session={s} href={`/pro/sessions/${s.id}/call`} tz={tz} locale={locale} />}
        {s.status === "scheduled" && (prevNote || openTasks.length > 0) && (
          <Card className="space-y-4 p-6 sm:p-7">
            <div data-prep>
              <h2 className="text-[15px] font-medium text-ink">{rm.prep.title}</h2>
              {prevNote && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-faint">
                  <ShieldIcon className="h-3.5 w-3.5" /> {rm.prep.lock}
                </p>
              )}
            </div>
            {prevNote && (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {prevNote.topic && (
                  <div>
                    <dt className="text-xs text-ink-faint">{rm.prep.topic}</dt>
                    <dd className="text-ink">
                      {prevNote.topic}
                      {prevNote.client_state != null && <span className="text-ink-faint"> · {rm.prep.state} {prevNote.client_state}/10</span>}
                    </dd>
                  </div>
                )}
                {prevNote.next_questions && (
                  <div>
                    <dt className="text-xs text-ink-faint">{rm.prep.next}</dt>
                    <dd className="whitespace-pre-line text-ink">{prevNote.next_questions}</dd>
                  </div>
                )}
                {prevNote.hypotheses && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-ink-faint">{rm.prep.hypotheses}</dt>
                    <dd className="whitespace-pre-line text-ink">{prevNote.hypotheses}</dd>
                  </div>
                )}
              </dl>
            )}
            {openTasks.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-ink-faint">{rm.prep.tasks}</p>
                <TaskList tasks={openTasks} role="pro" me={user!.id} tz={tz} />
              </div>
            )}
          </Card>
        )}
        {s.status !== "cancelled" && !s.no_show && (past || s.status === "completed") && (
          <SessionRecord
            session={s.id}
            client={s.client_id}
            me={user!.id}
            tz={tz}
            note={note}
            shared={{ summary: s.summary, sharedAt: s.summary_shared_at, editedAt: s.summary_edited_at }}
            canFinish={s.status === "scheduled"}
            canAssign={Boolean(link)}
            tasks={clientTasks.filter((t) => t.session_id === s.id)}
            aiDraft={{
              draft: draftRow ? normalizeDraft(draftRow.body) : null,
              ai: consultAiEnabled(),
              hasTranscript: transcript.length > 0,
              autoGenerate: sp.after === "1",
              keepNote: draftRow ? cm.draft.keep(dateFmt(draftRow.expires_at)) : null,
            }}
          />
        )}
        {s.status !== "cancelled" && s.tasks && (
          <Card className="p-6 sm:p-7">
            <p className="text-xs uppercase tracking-[0.12em] text-sky-deep">{m.care.tasks}</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{s.tasks}</p>
          </Card>
        )}
        {transcript.length > 0 && (
          <Card className="p-6 sm:p-7">
            <details>
              <summary className="cursor-pointer text-[15px] font-medium text-ink">{cm.draft.showTranscript(transcript.length)}</summary>
              <ul className="mt-4 space-y-2 text-[14px] leading-relaxed">
                {transcript.map((l) => (
                  <li key={l.id}>
                    <span className={l.speaker === "client" ? "text-sky-deep" : "text-lilac-deep"}>{cm.draft.speakers[l.speaker]}:</span> {l.body}
                  </li>
                ))}
              </ul>
            </details>
          </Card>
        )}
        {hasPrivate && (
          <ConfirmForm action={deleteConsultData} question={cm.draft.deleteConfirm} hidden={{ session: s.id }}>
            <button className="text-sm text-ink-faint transition hover:text-[#c2453d]" data-delete-private>{cm.draft.deleteAll}</button>
          </ConfirmForm>
        )}
        {showNext && (
          <Card className="space-y-3 p-6 sm:p-7" >
            <h2 id="next" className="text-[15px] font-medium text-ink">{cm.quick.scheduleNext}</h2>
            <NewSessionForm clients={[{ id: s.client_id, name }]} tz={tz} minutes={Math.round((Date.parse(s.ends_at) - Date.parse(s.starts_at)) / 60_000)} formats={me.formats} defaultLocal={nextDefault} />
          </Card>
        )}
        {s.status === "scheduled" && (
          <Card className="space-y-5 p-6 sm:p-7">
            {s.video_url && (
              <a href={s.video_url} target="_blank" rel="noopener noreferrer" className="inline-block font-medium text-sky-deep underline">
                {m.care.video}
              </a>
            )}
            <MoveSessionForm session={s.id} tz={tz} value={toLocalInput(s.starts_at, tz)} />
            <ConfirmForm action={cancelSession} question={m.pro.cancelConfirm} hidden={{ session: s.id, back: "pro" }} className="flex flex-col gap-3 border-t border-line/60 pt-5 sm:flex-row sm:items-end">
              <label className="flex-1">
                <span className="mb-2 block text-sm text-ink-soft">{m.pro.reason}</span>
                <input name="reason" maxLength={500} className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-[15px] text-ink outline-none focus:border-lilac-deep/60 focus:ring-4 focus:ring-lilac-soft" />
              </label>
              <button className="h-11 rounded-full px-5 text-sm text-[#c2453d] transition hover:bg-[#ffeeec]">{m.pro.cancel}</button>
            </ConfirmForm>
          </Card>
        )}
        {report && report.report.questions.length > 0 && s.status !== "cancelled" && (
          <Card className="p-6 sm:p-7">
            <h2 className="mb-1 flex items-center gap-2 text-[15px] font-medium text-ink">
              <SparkIcon className="h-4 w-4 text-lilac-deep" /> {am.sessionPrep.title}
            </h2>
            <p className="mb-3 text-xs text-ink-faint">
              <Link href={`/pro/clients/${s.client_id}/insights?r=${report.id}`} className="hover:text-ink">
                {am.sessionPrep.from(reportDate!)}
              </Link>
            </p>
            <ol className="list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink marker:text-ink-faint">
              {report.report.questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          </Card>
        )}
        {client && notes.length > 0 && (
          <Card className="p-6 sm:p-7">
            <details>
              <summary className="cursor-pointer text-[15px] font-medium text-ink">{rm.legacyNotes}</summary>
              <div className="mt-4">
                <NotesPanel notes={notes} client={s.client_id} session={s.id} locale={locale} tz={tz} />
              </div>
            </details>
          </Card>
        )}
      </div>
    </>
  );
}
