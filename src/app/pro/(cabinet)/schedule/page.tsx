import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { myClients, myPsychologist } from "@/lib/pro";
import { listSessions, type Session } from "@/lib/sessions";
import { acceptRequest, declineRequest } from "@/lib/session-actions";
import { addDays, dayKey, isoWeekday, timeOf, whenLabel, zonedToUtc } from "@/lib/time";
import { INTL } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { scheduleMessages } from "@/i18n/schedule";
import { proMessages } from "@/i18n/pro";
import { Card, PageHeader, buttonStyles } from "@/components/ui";
import { Avatar } from "@/components/pro/bits";
import { ConfirmForm } from "@/components/ConfirmForm";
import { NewSessionForm } from "@/components/schedule/ProForms";
import { ArrowIcon, BackIcon } from "@/components/icons";

const TONE: Record<Session["status"], string> = {
  scheduled: "border-lilac/60 bg-lilac-soft/70 hover:bg-lilac-soft",
  completed: "border-sage/50 bg-sage-soft/70 hover:bg-sage-soft",
  cancelled: "border-line bg-sand/40 text-ink-faint line-through",
};

const ARROW = "flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper text-ink-soft transition hover:border-sand-deep hover:text-ink";

// Расписание психолога: заявки, неделя встреч, назначение встречи.
export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const sp = await searchParams;
  const offset = Math.max(-52, Math.min(52, Math.trunc(Number(sp.w) || 0)));
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = scheduleMessages[locale];
  const me = (await myPsychologist(supabase, user!.id))!;
  const tz = me.timezone;

  const today = dayKey(new Date(), tz);
  const monday = addDays(today, 1 - isoWeekday(today) + offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const from = zonedToUtc(`${monday}T00:00`, tz)!;
  const to = zonedToUtc(`${addDays(monday, 7)}T00:00`, tz)!;

  const [sessions, clients] = await Promise.all([
    listSessions(supabase, { psychologist: me.user_id, from: from.toISOString(), to: to.toISOString() }),
    myClients(supabase, me.user_id),
  ]);
  const names = Object.fromEntries(clients.map((c) => [c.link.client_id, c.name ?? proMessages[locale].clients.noName]));
  const requests = clients.filter((c) => c.link.status === "pending");
  const requestSessions = requests.length
    ? await listSessions(supabase, { psychologist: me.user_id, status: ["scheduled"], from: new Date().toISOString() })
    : [];
  const active = clients.filter((c) => c.link.status === "active");
  const range = `${new Intl.DateTimeFormat(INTL[locale], { day: "numeric", month: "long" }).format(new Date(`${days[0]}T12:00:00Z`))} — ${new Intl.DateTimeFormat(INTL[locale], { day: "numeric", month: "long" }).format(new Date(`${days[6]}T12:00:00Z`))}`;

  return (
    <>
      <PageHeader title={m.pro.title} />
      <div className="stagger space-y-6">
        {requests.length > 0 && (
          <Card className="overflow-hidden">
            <div className="border-b border-line/60 bg-gradient-to-r from-paper to-mist/70 px-6 py-4">
              <h2 className="text-[15px] font-medium text-ink">{m.pro.requests}</h2>
            </div>
            <ul className="divide-y divide-line/60">
              {requests.map((r) => {
                const first = requestSessions.find((s) => s.client_id === r.link.client_id);
                return (
                  <li key={r.link.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
                    <Avatar name={r.name ?? "?"} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] text-ink">{r.name ?? proMessages[locale].clients.noName}</p>
                      <p className="text-sm text-ink-soft">
                        {m.pro.requestFrom}
                        {first ? ` · ${whenLabel(first.starts_at, tz, locale)}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <form action={acceptRequest}>
                        <input type="hidden" name="link" value={r.link.id} />
                        <button className={`${buttonStyles.primary} h-10 px-5 text-sm`}>{m.pro.accept}</button>
                      </form>
                      <ConfirmForm action={declineRequest} question={m.pro.declineConfirm} hidden={{ link: r.link.id }}>
                        <button className={`${buttonStyles.ghost} h-10 px-4 text-sm`}>{m.pro.decline}</button>
                      </ConfirmForm>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <Card className="p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="mr-auto font-serif text-[22px] text-ink">{range}</h2>
            <Link href={`/pro/schedule?w=${offset - 1}`} aria-label={m.pro.prev} className={ARROW}>
              <BackIcon className="h-4 w-4" />
            </Link>
            {offset !== 0 && (
              <Link href="/pro/schedule" className={`${buttonStyles.ghost} h-10 px-4 text-sm`}>
                {m.pro.today}
              </Link>
            )}
            <Link href={`/pro/schedule?w=${offset + 1}`} aria-label={m.pro.next} className={ARROW}>
              <ArrowIcon className="h-4 w-4" />
            </Link>
            <Link href="/pro/schedule/settings" className={`${buttonStyles.soft} h-10 px-4 text-sm`}>
              {m.pro.hours}
            </Link>
          </div>
          <div className="grid gap-2 lg:grid-cols-7">
            {days.map((d, i) => {
              const list = sessions.filter((s) => dayKey(s.starts_at, tz) === d);
              const isToday = d === today;
              return (
                <div key={d} className={`rounded-2xl p-2.5 lg:min-h-[180px] ${isToday ? "bg-mist/50" : "bg-sand/30"} ${list.length === 0 ? "hidden lg:block" : ""}`}>
                  <p className={`mb-2 px-1 text-xs ${isToday ? "font-medium text-sky-deep" : "text-ink-faint"}`}>
                    {m.weekdays[i]}, {Number(d.slice(8))}
                  </p>
                  <div className="space-y-1.5">
                    {list.map((s) => (
                      <Link key={s.id} href={`/pro/sessions/${s.id}`} className={`block rounded-xl border px-2.5 py-2 text-sm transition ${TONE[s.status]}`}>
                        <span className="block text-xs text-ink-soft">{timeOf(s.starts_at, tz, INTL[locale])}</span>
                        <span className="block truncate text-ink">{names[s.client_id] ?? "—"}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {sessions.length === 0 && <p className="py-6 text-center text-sm text-ink-faint lg:hidden">{m.pro.empty}</p>}
        </Card>

        {active.length > 0 && (
          <Card className="p-6 sm:p-7">
            <h2 className="mb-4 text-[15px] font-medium text-ink">{m.pro.newSession}</h2>
            <NewSessionForm
              clients={active.map((c) => ({ id: c.link.client_id, name: c.name ?? proMessages[locale].clients.noName }))}
              tz={tz}
              minutes={me.session_minutes}
              formats={me.formats}
            />
          </Card>
        )}
      </div>
    </>
  );
}
