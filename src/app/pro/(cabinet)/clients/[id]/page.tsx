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
import { endLink } from "@/lib/pro-actions";
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
import { BackIcon, CheckIcon } from "@/components/icons";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ClientCard({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string }> }) {
  const { id } = await params;
  const period = toPeriod((await searchParams).p);
  if (!UUID.test(id)) notFound();
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = proMessages[locale].clients;
  const care = careMessages[locale];
  const client = (await myClients(supabase, user!.id)).find((c) => c.link.client_id === id && c.link.status === "active");
  if (!client) notFound();
  // Сам факт просмотра попадает в журнал, который видит клиент.
  await supabase.rpc("log_client_view", { p_client: id, p_what: "card" });
  const [log, me, sessions] = await Promise.all([
    auditFor(supabase, { client: id, psychologist: user!.id }, 20),
    myPsychologist(supabase, user!.id),
    listSessions(supabase, { psychologist: user!.id, client: id }),
  ]);
  const range = periodRange(period, me!.timezone);
  const canWell = client.scopes.includes("wellbeing");
  const canGoals = client.scopes.includes("goals");
  const [checkins, assessments, goals] = await Promise.all([
    canWell ? clientCheckins(supabase, id, range.prevFrom) : null,
    canWell ? clientAssessments(supabase, id) : null,
    canGoals ? clientGoals(supabase, id) : null,
  ]);
  // Просмотр данных по согласию тоже попадает в журнал клиента.
  await Promise.all([
    checkins && supabase.rpc("log_client_view", { p_client: id, p_what: "wellbeing" }),
    goals && supabase.rpc("log_client_view", { p_client: id, p_what: "goals" }),
  ]);
  const wm = wellbeingMessages[locale];
  const sm = scheduleMessages[locale].pro;
  const now = Date.now();
  const upcoming = sessions.filter((s) => s.status === "scheduled" && new Date(s.ends_at).getTime() > now);
  const past = sessions.filter((s) => !upcoming.includes(s)).reverse();

  return (
    <>
      <Link href="/pro/clients" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {common[locale].back}
      </Link>
      <header className="mb-8 flex flex-wrap items-center gap-5">
        <Avatar name={client.name ?? "?"} size={64} />
        <div>
          <p className="text-sm text-ink-soft">{m.card}</p>
          <h1 className="font-serif text-[30px] leading-tight text-ink sm:text-[36px]">{client.name ?? m.noName}</h1>
          <p className="text-sm text-ink-faint">{m.since(relativeDate(client.link.activated_at ?? client.link.created_at, locale))}</p>
        </div>
        <Link href={`/pro/messages/${id}`} className={`${buttonStyles.soft} ml-auto h-11 shrink-0 px-5 text-sm`}>
          {careChatMessages[locale].write}
        </Link>
      </header>

      <div className="stagger grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Card className="p-6 sm:p-7">
            <h2 className="mb-4 text-[15px] font-medium text-ink">{m.sharedTitle}</h2>
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
            {checkins ? (
              <TrendPanel rows={checkins} period={period} from={range.from} days={range.days} locale={locale} href={(p) => `/pro/clients/${id}${p !== 30 ? `?p=${p}` : ""}`} />
            ) : (
              <>
                <h2 className="text-[15px] font-medium text-ink">{wm.pro.wellbeing}</h2>
                <p className="mt-2 text-sm text-ink-faint">{wm.pro.notShared}</p>
              </>
            )}
          </Card>
          {assessments && assessments.length > 0 && (
            <Card className="p-6 sm:p-7">
              <h2 className="mb-4 text-[15px] font-medium text-ink">{wm.pro.balance}</h2>
              <BalancePanel list={assessments} locale={locale} />
            </Card>
          )}
          <Card className="p-6 sm:p-7">
            <h2 className="mb-4 text-[15px] font-medium text-ink">{wm.pro.goals}</h2>
            {goals ? goals.length ? <GoalList goals={goals} locale={locale} /> : <p className="text-sm text-ink-faint">{wm.pro.noGoals}</p> : <p className="text-sm text-ink-faint">{wm.pro.notShared}</p>}
          </Card>
          <Card className="p-6 sm:p-7">
            <h2 className="mb-4 text-[15px] font-medium text-ink">{sm.upcomingForClient}</h2>
            <SessionList sessions={[...upcoming, ...past]} tz={me!.timezone} locale={locale} empty={sm.noSessions} href={(s) => `/pro/sessions/${s.id}`} />
            <div className="mt-6 border-t border-line/60 pt-5">
              <p className="mb-3 text-sm text-ink-soft">{sm.newSession}</p>
              <NewSessionForm clients={[{ id, name: client.name ?? m.noName }]} tz={me!.timezone} minutes={me!.session_minutes} formats={me!.formats} />
            </div>
          </Card>
          <p className="rounded-[24px] border border-dashed border-line px-6 py-8 text-center text-sm leading-relaxed text-ink-soft">{m.soon}</p>
        </div>

        <aside className="space-y-5">
          <Card className="p-6">
            <h2 className="mb-4 text-[15px] font-medium text-ink">{m.history}</h2>
            <AuditList rows={log} locale={locale} me={user!.id} empty={care.care.logEmpty} />
          </Card>
          <ConfirmForm action={endLink} question={m.endConfirm} hidden={{ link: client.link.id, back: "pro" }} className="text-center">
            <button className="h-11 rounded-full px-5 text-sm text-ink-faint transition hover:bg-[#fbf1ec] hover:text-[#a0614f]">{m.end}</button>
          </ConfirmForm>
        </aside>
      </div>
    </>
  );
}
