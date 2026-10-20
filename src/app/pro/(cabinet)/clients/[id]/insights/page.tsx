import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { myClients, myPsychologist } from "@/lib/pro";
import { listSessions } from "@/lib/sessions";
import { clientAssessments, clientCheckins, clientGoals } from "@/lib/wellbeing";
import { REPORT_PERIODS, analyticsEnabled, listReports, type StoredReport } from "@/lib/analytics";
import { addDays, dayKey, whenLabel } from "@/lib/time";
import { INTL } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { analyticsMessages } from "@/i18n/analytics";
import { proMessages } from "@/i18n/pro";
import { Card, Notice } from "@/components/ui";
import { GenerateForm } from "@/components/analytics/Forms";
import { CompareView, ReportView, Timeline, type TimelineEvent } from "@/components/analytics/Report";
import { BackIcon, SparkIcon } from "@/components/icons";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Insights({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ r?: string; p?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const period = (REPORT_PERIODS as readonly number[]).includes(Number(sp.p)) ? Number(sp.p) : 90;
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = analyticsMessages[locale];
  const client = (await myClients(supabase, user!.id)).find((c) => c.link.client_id === id && c.link.status === "active");
  if (!client) notFound();
  const me = (await myPsychologist(supabase, user!.id))!;
  const tz = me.timezone;
  const name = client.name ?? proMessages[locale].clients.noName;
  const allowed = client.scopes.includes("analytics");
  const enabled = analyticsEnabled();

  const today = dayKey(new Date(), tz);
  const from = addDays(today, 1 - period);
  const canWell = client.scopes.includes("wellbeing");
  const canGoals = client.scopes.includes("goals");
  const [reports, sessions, checkins, assessments, goals] = await Promise.all([
    allowed ? listReports(supabase, user!.id, id, 24) : ([] as StoredReport[]),
    listSessions(supabase, { psychologist: user!.id, client: id, from: `${from}T00:00:00Z` }),
    canWell ? clientCheckins(supabase, id, from) : null,
    canWell ? clientAssessments(supabase, id) : null,
    canGoals ? clientGoals(supabase, id) : null,
  ]);
  await Promise.all([
    checkins && supabase.rpc("log_client_view", { p_client: id, p_what: "wellbeing" }),
    goals && supabase.rpc("log_client_view", { p_client: id, p_what: "goals" }),
  ]);

  const day = (d: string) =>
    new Intl.DateTimeFormat(INTL[locale], { timeZone: d.length === 10 ? "UTC" : tz, day: "numeric", month: "short", year: "numeric" }).format(
      new Date(d.length === 10 ? `${d}T12:00:00Z` : d),
    );
  const current = reports.find((r) => r.id === sp.r) ?? reports[0];
  const previous = current ? reports[reports.indexOf(current) + 1] : undefined;
  const inPeriod = (iso: string) => dayKey(iso, tz) >= from;

  // Хронология: встречи, сводки, шаги по целям, колесо баланса и трудные дни (настроение 1–2).
  const events: TimelineEvent[] = [
    ...sessions
      .filter((s) => s.status !== "cancelled")
      .map((s) => ({
        at: s.starts_at,
        kind: "session" as const,
        text: s.summary?.slice(0, 160) || whenLabel(s.starts_at, tz, locale),
        href: `/pro/sessions/${s.id}`,
      })),
    ...reports
      .filter((r) => inPeriod(r.created_at))
      .map((r) => ({ at: r.created_at, kind: "report" as const, text: r.report.summary.slice(0, 160), href: `?r=${r.id}&p=${period}` })),
    ...(goals ?? []).flatMap((g) =>
      g.updates
        .filter((u) => inPeriod(u.at))
        .map((u) => ({ at: u.at, kind: "goal" as const, text: `${g.title}${u.note ? `: ${u.note}` : ""}${u.progress !== null ? ` · ${u.progress}%` : ""}` })),
    ),
    ...(assessments ?? []).filter((a) => inPeriod(a.created_at)).map((a) => ({ at: a.created_at, kind: "balance" as const, text: a.note || "—" })),
    ...(checkins ?? []).filter((c) => c.mood <= 2).map((c) => ({ at: `${c.day}T12:00:00Z`, kind: "checkin" as const, text: c.note || `${c.mood}/5` })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <Link href={`/pro/clients/${id}`} className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {name}
      </Link>
      <header className="mb-6">
        <p className="text-sm text-ink-soft">{name}</p>
        <h1 className="flex items-center gap-3 font-serif text-[30px] leading-tight text-ink sm:text-[36px]">
          <SparkIcon className="h-7 w-7 text-lilac-deep" /> {m.title}
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{m.lead}</p>
      </header>
      <p className="mb-6 rounded-2xl border border-[#e5dcc9] bg-[#fbf6ea] px-4 py-3 text-sm leading-relaxed text-[#7a6440]">{m.disclaimer}</p>

      <div className="stagger grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <Card className="p-6 sm:p-7">
            <h2 className="mb-4 text-[15px] font-medium text-ink">{m.generate.title}</h2>
            {!enabled ? (
              <Notice tone="error">{m.off}</Notice>
            ) : !allowed ? (
              <p className="text-sm text-ink-soft">{m.noConsent}</p>
            ) : (
              <GenerateForm client={id} period={period} />
            )}
          </Card>

          {current && (
            <Card className="p-6 sm:p-7">
              <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-serif text-[22px] text-ink">{m.report.period(day(current.period_from), day(current.period_to))}</h2>
                <p className="text-xs text-ink-faint">
                  {m.report.createdAt(day(current.created_at))} · {m.report.sources}: {current.scopes.map((s) => m.report.scopes[s] ?? s).join(", ") || "—"}
                </p>
              </div>
              <ReportView report={current.report} locale={locale} />
            </Card>
          )}

          {current && (
            <Card className="p-6 sm:p-7">
              <h2 className="mb-4 text-[15px] font-medium text-ink">{m.compare.title}</h2>
              <CompareView now={current} before={previous} locale={locale} dateLabel={day} />
            </Card>
          )}
        </div>

        <aside className="min-w-0 space-y-5">
          {allowed && (
            <Card className="p-6">
              <h2 className="mb-3 text-[15px] font-medium text-ink">
                {m.history.title} <span className="font-normal text-ink-faint">· {m.history.count(reports.length)}</span>
              </h2>
              {reports.length ? (
                <ul className="space-y-1">
                  {reports.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`?r=${r.id}&p=${period}`}
                        scroll={false}
                        aria-current={r === current ? "true" : undefined}
                        className={`block rounded-xl px-3 py-2 text-sm transition ${r === current ? "bg-lilac-soft/60 text-ink" : "text-ink-soft hover:bg-sand/50 hover:text-ink"}`}
                      >
                        {day(r.created_at)}
                        <span className="block text-xs text-ink-faint">{m.report.period(day(r.period_from), day(r.period_to))}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-faint">{m.history.empty}</p>
              )}
            </Card>
          )}
          <Card className="p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-[15px] font-medium text-ink">{m.timeline.title}</h2>
              <div className="flex rounded-full bg-sand/60 p-1" role="tablist">
                {REPORT_PERIODS.map((p) => (
                  <Link
                    key={p}
                    href={`?${current ? `r=${current.id}&` : ""}p=${p}`}
                    scroll={false}
                    role="tab"
                    aria-selected={p === period}
                    className={`rounded-full px-2.5 py-1 text-xs transition ${p === period ? "bg-paper text-ink shadow-soft" : "text-ink-soft hover:text-ink"}`}
                  >
                    {m.generate.periods[p]}
                  </Link>
                ))}
              </div>
            </div>
            <Timeline events={events} locale={locale} dateLabel={day} />
          </Card>
        </aside>
      </div>
    </>
  );
}
