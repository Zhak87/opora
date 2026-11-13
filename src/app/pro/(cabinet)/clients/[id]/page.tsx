import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { SCOPES, auditFor, myClients, myPsychologist } from "@/lib/pro";
import { listSessions } from "@/lib/sessions";
import { clientAssessments, clientCheckins, clientGoals, periodRange, toPeriod } from "@/lib/wellbeing";
import { wellbeingMessages } from "@/i18n/wellbeing";
import { BalancePanel, GoalList, TrendPanel } from "@/components/wellbeing/Panels";
import { scheduleMessages } from "@/i18n/schedule";
import { SessionList } from "@/components/schedule/SessionList";
import { NewSessionForm } from "@/components/schedule/ProForms";
import { acceptRequest, declineRequest } from "@/lib/session-actions";
import { endLink } from "@/lib/pro-actions";
import { setClientPaused } from "@/lib/cabinet-actions";
import { cabinetMessages } from "@/i18n/cabinet";
import { INTL } from "@/i18n/config";
import { dayLabel, timeOf } from "@/lib/time";
import { Chip } from "@/components/pro/bits";
import { relativeDate } from "@/lib/format";
import { getLocale } from "@/i18n/server";
import { proMessages } from "@/i18n/pro";
import { careMessages } from "@/i18n/care";
import { common } from "@/i18n/common";
import { Card, buttonStyles } from "@/components/ui";
import { careChatMessages } from "@/i18n/care-chat";
import { Avatar } from "@/components/pro/bits";
import { AuditList } from "@/components/pro/AuditList";
import { ConfirmForm } from "@/components/ConfirmForm";
import { BackIcon, CheckIcon, ShieldIcon, SparkIcon } from "@/components/icons";
import { listNotes, listReports } from "@/lib/analytics";
import { analyticsMessages } from "@/i18n/analytics";
import { NotesPanel } from "@/components/analytics/Notes";
import { CallNowButton } from "@/components/consult/CallNowButton";
import { AssignForm, TaskList } from "@/components/record/Tasks";
import { clientSessionNotes, listTasks, noteHasText } from "@/lib/records";
import { recordMessages } from "@/i18n/record";

const TABS = ["overview", "sessions", "tasks", "notes", "data"] as const;
type Tab = (typeof TABS)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ClientCard({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string; tab?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const period = toPeriod(sp.p);
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "overview";
  if (!UUID.test(id)) notFound();
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = proMessages[locale].clients;
  const care = careMessages[locale];
  const links = await myClients(supabase, user!.id);
  const client = links.find((c) => c.link.client_id === id && c.link.status === "active");
  if (!client) {
    // Новая заявка из каталога: человек уже есть в списке, но доступ к карточке появится после «Принять».
    const request = links.find((c) => c.link.client_id === id && c.link.status === "pending");
    if (!request) notFound();
    const sm = scheduleMessages[locale].pro;
    return (
      <>
        <Link href="/pro/clients" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
          <BackIcon className="h-4 w-4" /> {common[locale].back}
        </Link>
        <Card className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-7" data-request-card>
          <Avatar name={request.name ?? "?"} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-[28px] leading-tight text-ink">{request.name ?? m.noName}</h1>
            <p className="mt-1 text-sm text-ink-soft">{sm.requestFrom}</p>
          </div>
          <div className="flex gap-2">
            <form action={acceptRequest}>
              <input type="hidden" name="link" value={request.link.id} />
              <button className={`${buttonStyles.primary} h-11 px-5 text-sm`} data-accept>{sm.accept}</button>
            </form>
            <ConfirmForm action={declineRequest} question={sm.declineConfirm} hidden={{ link: request.link.id, back: "clients" }}>
              <button className={`${buttonStyles.ghost} h-11 px-4 text-sm`}>{sm.decline}</button>
            </ConfirmForm>
          </div>
        </Card>
      </>
    );
  }
  // Сам факт просмотра попадает в журнал, который видит клиент.
  await supabase.rpc("log_client_view", { p_client: id, p_what: "card" });
  const rm = recordMessages[locale];
  const cm = cabinetMessages[locale];
  const am = analyticsMessages[locale];
  const wm = wellbeingMessages[locale];
  const sm = scheduleMessages[locale].pro;
  const me = (await myPsychologist(supabase, user!.id))!;
  const tz = me.timezone;
  const [tasks, sessionNotes, sessions] = await Promise.all([
    listTasks(supabase, { psychologist: user!.id, client: id }),
    clientSessionNotes(supabase, user!.id, id, 200),
    listSessions(supabase, { psychologist: user!.id, client: id }),
  ]);
  const written = sessionNotes.filter(noteHasText);
  const noted = new Set(written.map((n) => n.session_id));
  const now = Date.now();
  const upcoming = sessions.filter((s) => s.status === "scheduled" && new Date(s.ends_at).getTime() > now);
  const past = sessions.filter((s) => !upcoming.includes(s)).reverse();
  const heldCount = past.filter((s) => s.status !== "cancelled" && !s.no_show).length;
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const when = (iso: string) => `${dayLabel(iso, tz, locale)}, ${timeOf(iso, tz, INTL[locale])}`;
  const openTasks = tasks.filter((t) => t.status === "open");

  // Данные по согласию читаем только на той вкладке, где они показаны: каждый просмотр попадает в журнал клиента.
  const range = periodRange(period, tz);
  const canWell = tab === "overview" && client.scopes.includes("wellbeing");
  const canGoals = tab === "overview" && client.scopes.includes("goals");
  const [checkins, assessments, goals, reports, notes, log] = await Promise.all([
    canWell ? clientCheckins(supabase, id, range.prevFrom) : null,
    canWell ? clientAssessments(supabase, id) : null,
    canGoals ? clientGoals(supabase, id) : null,
    tab === "overview" && client.scopes.includes("analytics") ? listReports(supabase, user!.id, id, 1) : [],
    tab === "notes" ? listNotes(supabase, user!.id, id) : [],
    tab === "data" ? auditFor(supabase, { client: id, psychologist: user!.id }, 20) : [],
  ]);
  const report = reports[0];
  await Promise.all([
    checkins && supabase.rpc("log_client_view", { p_client: id, p_what: "wellbeing" }),
    goals && supabase.rpc("log_client_view", { p_client: id, p_what: "goals" }),
  ]);
  const lastNote = written
    .map((n) => ({ n, s: byId.get(n.session_id) }))
    .filter((x) => x.s)
    .sort((a, b) => Date.parse(b.s!.starts_at) - Date.parse(a.s!.starts_at))[0];
  const tabHref = (t: Tab) => `/pro/clients/${id}${t === "overview" ? "" : `?tab=${t}`}`;
  const h2 = "text-[15px] font-medium text-ink";

  return (
    <>
      <Link href="/pro/clients" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {common[locale].back}
      </Link>
      <header className="mb-6 flex flex-wrap items-center gap-5">
        <Avatar name={client.name ?? "?"} size={64} />
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            {m.card}
            {client.link.paused_at && <Chip tone="bg-sand text-ink-soft">{cm.clients.paused}</Chip>}
          </p>
          <h1 className="font-serif text-[30px] leading-tight text-ink sm:text-[36px]">{client.name ?? m.noName}</h1>
          <p className="text-sm text-ink-faint">
            {m.since(relativeDate(client.link.activated_at ?? client.link.created_at, locale))}
            {heldCount > 0 && ` · ${cm.card.sessionsCount(heldCount)}`}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-start gap-2 sm:ml-auto sm:w-auto">
          {me.formats?.includes("online") && <CallNowButton client={id} />}
          <Link href={`/pro/clients/${id}/insights`} className={`${buttonStyles.soft} h-11 flex-1 shrink-0 px-5 text-sm sm:flex-none`}>
            <SparkIcon className="h-4 w-4 text-lilac-deep" /> {am.open}
          </Link>
          <Link href={`/pro/messages/${id}`} className={`${buttonStyles.soft} h-11 flex-1 shrink-0 px-5 text-sm sm:flex-none`}>
            {careChatMessages[locale].write}
          </Link>
        </div>
      </header>

      <nav className="-mx-1 mb-6 flex gap-1.5 overflow-x-auto px-1 pb-1" data-card-tabs>
        {TABS.map((t) => (
          <Link
            key={t}
            href={tabHref(t)}
            aria-current={t === tab ? "page" : undefined}
            className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm transition ${t === tab ? "bg-ink text-paper" : "bg-paper text-ink-soft shadow-soft hover:text-ink"}`}
            data-tab={t}
          >
            {cm.card.tabs[t]}
            {t === "tasks" && openTasks.length > 0 && <span className={t === tab ? "text-paper/70" : "text-ink-faint"}>{openTasks.length}</span>}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="stagger grid gap-5 lg:grid-cols-[1fr_320px]" data-tab-body="overview">
          <div className="space-y-5">
            <Card className="p-6 sm:p-7">
              <h2 className={h2}>{cm.card.nextSession}</h2>
              {upcoming[0] ? (
                <Link href={`/pro/sessions/${upcoming[0].id}`} className="mt-2 inline-block font-serif text-[22px] text-ink hover:text-lilac-deep" data-next-session>
                  {when(upcoming[0].starts_at)}
                </Link>
              ) : (
                <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-faint">
                  {cm.card.noNext}
                  <Link href={tabHref("sessions")} className="text-sky-deep hover:text-ink">
                    {cm.card.schedule} →
                  </Link>
                </p>
              )}
            </Card>
            <Card className="p-6 sm:p-7">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className={h2}>{cm.card.lastNote}</h2>
                <Link href={tabHref("notes")} className="text-sm text-ink-faint hover:text-ink">
                  {cm.card.all}
                </Link>
              </div>
              {lastNote ? (
                <div className="mt-2" data-last-note>
                  <p className="flex items-center gap-1.5 text-xs text-ink-faint">
                    <ShieldIcon className="h-3.5 w-3.5" /> {rm.prep.lock} · {when(lastNote.s!.starts_at)}
                  </p>
                  {lastNote.n.topic && (
                    <p className="mt-2 text-[15px] text-ink">
                      {lastNote.n.topic}
                      {lastNote.n.client_state != null && <span className="text-ink-faint"> · {rm.prep.state} {lastNote.n.client_state}/10</span>}
                    </p>
                  )}
                  {lastNote.n.next_questions && (
                    <>
                      <p className="mt-3 text-xs text-ink-faint">{cm.card.nextQuestions}</p>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{lastNote.n.next_questions}</p>
                    </>
                  )}
                  <Link href={`/pro/sessions/${lastNote.n.session_id}`} className="mt-3 inline-block text-sm text-sky-deep hover:text-ink">
                    {cm.card.tabs.notes} →
                  </Link>
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink-faint">{cm.card.noNotes}</p>
              )}
            </Card>
            <Card className="p-6 sm:p-7">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className={h2}>{cm.card.openTasks}</h2>
                <Link href={tabHref("tasks")} className="text-sm text-ink-faint hover:text-ink">
                  {cm.card.all}
                </Link>
              </div>
              {openTasks.length ? <TaskList tasks={openTasks.slice(0, 3)} role="pro" me={user!.id} tz={tz} /> : <p className="text-sm text-ink-faint">{cm.card.noOpenTasks}</p>}
            </Card>
            <Card className="p-6 sm:p-7">
              {checkins ? (
                <TrendPanel rows={checkins} period={period} from={range.from} days={range.days} locale={locale} href={(p) => `/pro/clients/${id}${p !== 30 ? `?p=${p}` : ""}`} />
              ) : (
                <>
                  <h2 className={h2}>{wm.pro.wellbeing}</h2>
                  <p className="mt-2 text-sm text-ink-faint">{wm.pro.notShared}</p>
                </>
              )}
            </Card>
            {assessments && assessments.length > 0 && (
              <Card className="p-6 sm:p-7">
                <h2 className={`mb-4 ${h2}`}>{wm.pro.balance}</h2>
                <BalancePanel list={assessments} locale={locale} />
              </Card>
            )}
            {goals && (
              <Card className="p-6 sm:p-7">
                <h2 className={`mb-4 ${h2}`}>{wm.pro.goals}</h2>
                {goals.length ? <GoalList goals={goals} locale={locale} /> : <p className="text-sm text-ink-faint">{wm.pro.noGoals}</p>}
              </Card>
            )}
          </div>
          <aside className="space-y-5">
            <Card className="p-6">
              <h2 className={`mb-2 flex items-center gap-2 ${h2}`}>
                <SparkIcon className="h-4 w-4 text-lilac-deep" /> {am.title}
              </h2>
              <p className="text-sm leading-relaxed text-ink-soft">{report ? report.report.summary : client.scopes.includes("analytics") ? am.history.empty : am.noConsent}</p>
              <Link href={`/pro/clients/${id}/insights`} className="mt-3 inline-block text-sm text-sky-deep hover:text-ink">
                {am.open} →
              </Link>
            </Card>
          </aside>
        </div>
      )}

      {tab === "sessions" && (
        <Card className="p-6 sm:p-7">
          <div data-tab-body="sessions">
            <h2 className={`mb-4 ${h2}`}>{sm.upcomingForClient}</h2>
            <SessionList sessions={[...upcoming, ...past]} tz={tz} locale={locale} empty={sm.noSessions} href={(s) => `/pro/sessions/${s.id}`} noted={noted} />
            <div className="mt-6 border-t border-line/60 pt-5">
              <p className="mb-3 text-sm text-ink-soft">{sm.newSession}</p>
              <NewSessionForm clients={[{ id, name: client.name ?? m.noName }]} tz={tz} minutes={me.session_minutes} formats={me.formats} />
            </div>
          </div>
        </Card>
      )}

      {tab === "tasks" && (
        <Card className="p-6 sm:p-7">
          <div id="tasks" className="mb-4" data-tab-body="tasks">
            <h2 className={h2}>{rm.tasks.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-faint">{rm.tasks.lead}</p>
          </div>
          <div className="space-y-4">
            <AssignForm client={id} />
            <TaskList tasks={tasks} role="pro" me={user!.id} tz={tz} />
          </div>
        </Card>
      )}

      {tab === "notes" && (
        <div className="space-y-5" data-tab-body="notes">
          <Card className="p-6 sm:p-7">
            <h2 className={h2}>{cm.card.tabs.notes}</h2>
            <p className="mb-4 mt-1 flex items-center gap-1.5 text-xs text-ink-faint">
              <ShieldIcon className="h-3.5 w-3.5" /> {rm.prep.lock}
            </p>
            {written.length ? (
              <ul className="divide-y divide-line/60">
                {written
                  .map((n) => ({ n, s: byId.get(n.session_id) }))
                  .filter((x) => x.s)
                  .sort((a, b) => Date.parse(b.s!.starts_at) - Date.parse(a.s!.starts_at))
                  .map(({ n, s }) => (
                    <li key={n.session_id}>
                      <Link href={`/pro/sessions/${n.session_id}`} className="group block py-3" data-note-row>
                        <span className="text-xs text-ink-faint">{when(s!.starts_at)}</span>
                        <span className="block text-[15px] text-ink group-hover:text-lilac-deep">
                          {n.topic || rm.marks.note}
                          {n.client_state != null && <span className="text-ink-faint"> · {rm.prep.state} {n.client_state}/10</span>}
                        </span>
                        {n.next_questions && <span className="mt-0.5 block truncate text-sm text-ink-soft">{n.next_questions}</span>}
                      </Link>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-faint">{cm.card.noNotes}</p>
            )}
          </Card>
          <Card className="p-6 sm:p-7">
            <NotesPanel notes={notes} client={id} locale={locale} tz={tz} />
          </Card>
        </div>
      )}

      {tab === "data" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]" data-tab-body="data">
          <div className="space-y-5">
            <Card className="p-6 sm:p-7">
              <h2 className={`mb-4 ${h2}`}>{m.sharedTitle}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {SCOPES.map((s) => {
                  const on = client.scopes.includes(s);
                  return (
                    <li key={s} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${on ? "bg-sage-soft/70" : "bg-sand/40"}`}>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${on ? "bg-sage text-paper" : "border border-line"}`}>
                        {on && <CheckIcon className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm text-ink">{care.scopes[s].title}</span>
                        <span className="text-xs text-ink-faint">{on ? m.shared : m.notShared}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
            <Card className="p-6 sm:p-7">
              <form action={setClientPaused} className="flex flex-col gap-3 sm:flex-row sm:items-center" data-pause-form>
                <input type="hidden" name="link" value={client.link.id} />
                <input type="hidden" name="paused" value={client.link.paused_at ? "0" : "1"} />
                <p className="flex-1 text-sm leading-relaxed text-ink-soft">{cm.clients.pauseHint}</p>
                <button className={`${buttonStyles.soft} h-11 shrink-0 px-5 text-sm`} data-pause>
                  {client.link.paused_at ? cm.clients.resume : cm.clients.pause}
                </button>
              </form>
              <ConfirmForm action={endLink} question={m.endConfirm} hidden={{ link: client.link.id, back: "pro" }} className="mt-4 border-t border-line/60 pt-4">
                <button className="h-11 rounded-full px-5 text-sm text-ink-faint transition hover:bg-[#ffeeec] hover:text-[#c2453d]">{m.end}</button>
              </ConfirmForm>
            </Card>
          </div>
          <aside>
            <Card className="p-6">
              <h2 className={`mb-4 ${h2}`}>{m.history}</h2>
              <AuditList rows={log} locale={locale} me={user!.id} empty={care.care.logEmpty} />
            </Card>
          </aside>
        </div>
      )}
    </>
  );
}
