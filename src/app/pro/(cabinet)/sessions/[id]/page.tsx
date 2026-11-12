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
import { BackIcon, SparkIcon } from "@/components/icons";
import { listNotes, listReports } from "@/lib/analytics";
import { analyticsMessages } from "@/i18n/analytics";
import { NotesPanel } from "@/components/analytics/Notes";
import { JoinCard } from "@/components/consult/JoinCard";
import { ConsultSummary } from "@/components/consult/ConsultSummary";
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
        {s.status === "scheduled" && s.format === "online" && <JoinCard session={s} href={`/pro/sessions/${s.id}/call`} tz={tz} locale={locale} />}
        {s.status !== "cancelled" && (past || s.status === "completed") && (
          <Card className="p-6 sm:p-7">
            <ConsultSummary
              session={s.id}
              draft={draftRow ? normalizeDraft(draftRow.body) : null}
              summary={s.summary ?? ""}
              tasks={s.tasks ?? ""}
              completed={s.status === "completed"}
              ai={consultAiEnabled()}
              hasTranscript={transcript.length > 0}
              autoGenerate={sp.after === "1"}
              keepNote={draftRow ? cm.draft.keep(dateFmt(draftRow.expires_at)) : null}
            />
            {draftRow?.published_at && <p className="mt-3 text-xs text-sage-deep">{cm.draft.published(dateFmt(draftRow.published_at))}</p>}
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
        {client && (
          <Card className="p-6 sm:p-7">
            <NotesPanel notes={notes} client={s.client_id} session={s.id} locale={locale} tz={tz} />
          </Card>
        )}
      </div>
    </>
  );
}
