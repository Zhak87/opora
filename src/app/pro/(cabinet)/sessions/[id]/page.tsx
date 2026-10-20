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
import { MoveSessionForm, SummaryForm } from "@/components/schedule/ProForms";
import { BackIcon, SparkIcon } from "@/components/icons";
import { listNotes, listReports } from "@/lib/analytics";
import { analyticsMessages } from "@/i18n/analytics";
import { NotesPanel } from "@/components/analytics/Notes";

export default async function ProSession({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ moved?: string }> }) {
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
        {s.status !== "cancelled" && (past || s.status === "completed") && (
          <Card className="p-6 sm:p-7">
            <SummaryForm session={s.id} summary={s.summary ?? ""} tasks={s.tasks ?? ""} completed={s.status === "completed"} />
          </Card>
        )}
        {s.status === "scheduled" && (
          <Card className="space-y-5 p-6 sm:p-7">
            <MoveSessionForm session={s.id} tz={tz} value={toLocalInput(s.starts_at, tz)} />
            <ConfirmForm action={cancelSession} question={m.pro.cancelConfirm} hidden={{ session: s.id, back: "pro" }} className="flex flex-col gap-3 border-t border-line/60 pt-5 sm:flex-row sm:items-end">
              <label className="flex-1">
                <span className="mb-2 block text-sm text-ink-soft">{m.pro.reason}</span>
                <input name="reason" maxLength={500} className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-[15px] text-ink outline-none focus:border-sky focus:ring-4 focus:ring-mist" />
              </label>
              <button className="h-11 rounded-full px-5 text-sm text-[#a0614f] transition hover:bg-[#fbf1ec]">{m.pro.cancel}</button>
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
