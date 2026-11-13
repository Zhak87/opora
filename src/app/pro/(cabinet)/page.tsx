import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { myClients, myPsychologist } from "@/lib/pro";
import { relativeDate } from "@/lib/format";
import { getLocale } from "@/i18n/server";
import { proLabels, proMessages } from "@/i18n/pro";
import { cabinetMessages } from "@/i18n/cabinet";
import { scheduleMessages } from "@/i18n/schedule";
import { careChatMessages } from "@/i18n/care-chat";
import { INTL } from "@/i18n/config";
import { Avatar, StatusPill } from "@/components/pro/bits";
import { PaidToggle } from "@/components/pro/Marks";
import { ArrowIcon } from "@/components/icons";
import { buttonStyles } from "@/components/ui";
import { listSessions } from "@/lib/sessions";
import { addDays, dayKey, dayLabel, timeOf, whenLabel, zonedToUtc } from "@/lib/time";
import { careNotices, lastMessages, markNotificationsRead, unreadByPeer } from "@/lib/care-chat";
import { joinState } from "@/lib/consult/config";
import { listTasks, noteHasText, type SessionNote } from "@/lib/records";

const DAY = 86_400_000;

// «Сегодня»: всё, что нужно психологу в течение рабочего дня, без лишних переходов.
// Встречи дня, записи, которые ещё не заполнены, новые сообщения и новости по заданиям.
export default async function ProToday() {
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = proMessages[locale];
  const cm = cabinetMessages[locale];
  const sm = scheduleMessages[locale];
  const chat = careChatMessages[locale];
  const formats = proLabels[locale].formats;
  const me = (await myPsychologist(supabase, user!.id))!;
  const tz = me.timezone;
  const now = Date.now();
  const today = dayKey(new Date(), tz);
  const dayStart = zonedToUtc(`${today}T00:00`, tz)!.toISOString();
  const dayEnd = zonedToUtc(`${addDays(today, 1)}T00:00`, tz)!.toISOString();

  const [clients, todayAll, upcoming, recent, notices, unread, last, tasks] = await Promise.all([
    myClients(supabase, me.user_id),
    listSessions(supabase, { psychologist: me.user_id, from: dayStart, to: dayEnd }),
    listSessions(supabase, { psychologist: me.user_id, status: ["scheduled"], from: dayEnd }, 4),
    listSessions(supabase, { psychologist: me.user_id, from: new Date(now - 14 * DAY).toISOString(), to: new Date(now).toISOString() }),
    careNotices(supabase, { me: me.user_id, role: "pro", locale, tz, limit: 6 }),
    unreadByPeer(supabase),
    lastMessages(supabase, me.user_id),
    listTasks(supabase, { psychologist: me.user_id }, 200),
  ]);
  // Уведомления показаны — отмечаем прочитанными; подсветка новых остаётся до следующего захода.
  if (notices.some((n) => n.fresh)) await markNotificationsRead(supabase, notices.filter((n) => n.fresh).map((n) => n.id));

  const names = Object.fromEntries(clients.map((c) => [c.link.client_id, c.name ?? m.clients.noName]));
  const nameOf = (id: string) => names[id] ?? m.clients.noName;
  const sessions = todayAll.filter((s) => s.status !== "cancelled");
  const requests = clients.filter((c) => c.link.status === "pending");

  // Прошедшие встречи без записи: нет личной заметки и итогом не делились.
  const ended = recent.filter((s) => s.status !== "cancelled" && !s.no_show && Date.parse(s.ends_at) < now && !s.summary_shared_at);
  const { data: noteRows } = ended.length
    ? await supabase.from("session_notes").select("session_id, topic, client_state, fields, hypotheses, next_questions").in("session_id", ended.map((s) => s.id))
    : { data: [] };
  const noted = new Set(((noteRows ?? []) as SessionNote[]).filter(noteHasText).map((n) => n.session_id));
  const toRecord = ended.filter((s) => !noted.has(s.id)).reverse();

  const newMessages = [...unread.entries()].map(([peer, n]) => ({ peer, n, msg: last.get(peer) }));
  // Новости по заданиям за неделю: клиент отметил выполнение или ответил в ветке.
  const weekAgo = now - 7 * DAY;
  const taskNews = tasks
    .map((t) => {
      const reply = [...t.replies].reverse().find((r) => r.author_id === t.client_id);
      const lastMine = [...t.replies].reverse().find((r) => r.author_id === me.user_id);
      const replyAt = reply && (!lastMine || lastMine.created_at < reply.created_at) ? Date.parse(reply.created_at) : 0;
      const doneAt = t.status === "done" && t.done_at ? Date.parse(t.done_at) : 0;
      return { t, at: Math.max(replyAt, doneAt), kind: replyAt > doneAt ? ("reply" as const) : ("done" as const), text: reply?.body };
    })
    .filter((x) => x.at > weekAgo)
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);

  const dateTitle = new Intl.DateTimeFormat(INTL[locale], { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className="stagger">
      <header className="mb-8">
        <p className="mb-2 text-sm text-ink-soft first-letter:uppercase">{dateTitle}</p>
        <h1 className="font-serif text-[30px] leading-tight text-ink sm:text-[38px]">{m.overview.hello(me.full_name.split(" ")[0] ?? "")}</h1>
      </header>

      {me.status !== "approved" && (
        <section className="mb-6 flex flex-col gap-4 rounded-[28px] border border-line/70 bg-paper p-6 shadow-soft sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <p className="text-[15px] font-medium text-ink">{m.overview.profileStatus}</p>
              <StatusPill status={me.status} label={m.status[me.status]} />
            </div>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">{m.statusHint[me.status]}</p>
          </div>
          <Link href="/pro/profile" className={`${buttonStyles.soft} h-11 shrink-0`}>
            {m.overview.openProfile}
          </Link>
        </section>
      )}

      {requests.length > 0 && (
        <Link href="/pro/schedule" className="group mb-6 flex items-center gap-4 rounded-[24px] border border-sky/40 bg-mist/60 px-5 py-4 transition hover:bg-mist">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper font-serif text-lg text-sky-deep">{requests.length}</span>
          <span className="flex-1 text-[15px] text-ink">{sm.pro.requests}</span>
          <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
        </Link>
      )}

      <section className="mb-8" data-today-sessions>
        <h2 className="mb-3 px-1 text-[15px] text-ink-soft">{cm.today.sessions}</h2>
        {sessions.length ? (
          <ul className="space-y-2.5">
            {sessions.map((s) => {
              const started = Date.parse(s.starts_at) <= now;
              const over = Date.parse(s.ends_at) < now;
              const canJoin = s.status === "scheduled" && s.format === "online" && ["open", "early"].includes(joinState(s));
              return (
                <li key={s.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[24px] bg-paper px-5 py-4 shadow-soft ${over ? "opacity-80" : ""}`} data-today-session={s.id}>
                  <Link href={`/pro/sessions/${s.id}`} className="group flex min-w-[200px] flex-1 items-center gap-4">
                    <span className="w-14 shrink-0 font-serif text-[20px] text-ink">{timeOf(s.starts_at, tz, INTL[locale])}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] text-ink group-hover:text-lilac-deep">{nameOf(s.client_id)}</span>
                      <span className="block text-xs text-ink-faint">
                        {formats[s.format as keyof typeof formats]}
                        {s.no_show ? ` · ${cm.attend.noShow}` : started && !over ? ` · ${cm.today.now}` : over ? ` · ${cm.today.done}` : ""}
                      </span>
                    </span>
                  </Link>
                  <div className="flex items-center gap-2">
                    {!s.no_show && <PaidToggle session={s} locale={locale} compact />}
                    {canJoin ? (
                      <Link href={`/pro/sessions/${s.id}/call`} className={`${joinState(s) === "open" ? buttonStyles.primary : buttonStyles.soft} h-9 px-4 text-sm`}>
                        {cm.today.join}
                      </Link>
                    ) : (
                      over &&
                      !s.no_show &&
                      !s.summary_shared_at && (
                        <Link href={`/pro/sessions/${s.id}#draft`} className={`${buttonStyles.soft} h-9 px-4 text-sm`}>
                          {cm.today.record}
                        </Link>
                      )
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-[24px] border border-dashed border-line px-6 py-7 text-center text-sm text-ink-soft">
            {cm.today.noSessions}
            {upcoming[0] && <span className="mt-1 block text-ink-faint">{cm.today.nextOne(whenLabel(upcoming[0].starts_at, tz, locale))}</span>}
          </p>
        )}
      </section>

      {toRecord.length > 0 && (
        <section className="mb-8" data-to-record>
          <h2 className="mb-1 px-1 text-[15px] text-ink-soft">{cm.today.toRecord}</h2>
          <p className="mb-3 px-1 text-xs leading-relaxed text-ink-faint">{cm.today.toRecordHint}</p>
          <ul className="divide-y divide-line/70 overflow-hidden rounded-[24px] border border-[#e5dcc9] bg-[#fbf6ea]/70">
            {toRecord.map((s) => (
              <li key={s.id}>
                <Link href={`/pro/sessions/${s.id}#draft`} className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-sand/40">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-ink">{nameOf(s.client_id)}</span>
                    <span className="block text-xs text-ink-faint">
                      {dayLabel(s.starts_at, tz, locale)}, {timeOf(s.starts_at, tz, INTL[locale])}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-sky-deep group-hover:text-ink">{cm.today.record}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="min-w-0">
          <div className="mb-3 flex items-baseline justify-between px-1">
            <h2 className="text-[15px] text-ink-soft">{cm.today.messages}</h2>
            <Link href="/pro/messages" className="text-sm text-ink-faint hover:text-ink">
              {chat.all}
            </Link>
          </div>
          {newMessages.length ? (
            <ul className="divide-y divide-line/70 overflow-hidden rounded-[24px] bg-paper shadow-soft">
              {newMessages.slice(0, 5).map(({ peer, n, msg }) => (
                <li key={peer}>
                  <Link href={`/pro/messages/${peer}`} className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-sand/40">
                    <Avatar name={nameOf(peer)} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-ink">{nameOf(peer)}</span>
                      {msg && <span className="block truncate text-sm text-ink-soft">{msg.body}</span>}
                    </span>
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-lilac-deep px-2 text-xs text-paper">{n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[24px] border border-dashed border-line px-6 py-7 text-center text-sm text-ink-soft">{chat.noNew}</p>
          )}
        </section>
        <section className="min-w-0" data-task-news>
          <h2 className="mb-1 px-1 text-[15px] text-ink-soft">{cm.today.tasks}</h2>
          <p className="mb-3 px-1 text-xs text-ink-faint">{cm.today.tasksHint}</p>
          {taskNews.length ? (
            <ul className="divide-y divide-line/70 overflow-hidden rounded-[24px] bg-paper shadow-soft">
              {taskNews.map(({ t, kind, text, at }) => (
                <li key={t.id}>
                  <Link href={`/pro/clients/${t.client_id}?tab=tasks`} className="block px-5 py-3.5 transition hover:bg-sand/40">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{t.title}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${kind === "done" ? "bg-sage-soft text-sage-deep" : "bg-lilac-soft text-lilac-deep"}`}>
                        {kind === "done" ? cm.today.taskDone : cm.today.taskReply}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-faint">
                      {nameOf(t.client_id)} · {relativeDate(new Date(at).toISOString(), locale)}
                      {text ? ` · ${text}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[24px] border border-dashed border-line px-6 py-7 text-center text-sm text-ink-soft">{cm.today.noTasks}</p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {upcoming.length > 0 && (
          <section className="min-w-0">
            <div className="mb-3 flex items-baseline justify-between px-1">
              <h2 className="text-[15px] text-ink-soft">{cm.today.upcoming}</h2>
              <Link href="/pro/schedule" className="text-sm text-ink-faint hover:text-ink">
                {cm.nav.calendar}
              </Link>
            </div>
            <ul className="divide-y divide-line/70 overflow-hidden rounded-[24px] bg-paper shadow-soft">
              {upcoming.map((s) => (
                <li key={s.id}>
                  <Link href={`/pro/sessions/${s.id}`} className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-sand/40">
                    <span className="w-14 shrink-0 font-serif text-[18px] text-ink">{timeOf(s.starts_at, tz, INTL[locale])}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] text-ink">{nameOf(s.client_id)}</span>
                      <span className="block text-xs text-ink-faint">{dayLabel(s.starts_at, tz, locale)}</span>
                    </span>
                    <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {notices.length > 0 && (
          <section className="min-w-0">
            <h2 className="mb-3 px-1 text-[15px] text-ink-soft">{cm.today.events}</h2>
            <ul className="space-y-2">
              {notices.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition hover:shadow-soft ${n.fresh ? "border-lilac/50 bg-lilac-soft/50 text-ink" : "border-line/60 bg-paper/70 text-ink-soft"}`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.fresh ? "bg-lilac-deep" : "bg-line"}`} />
                    <span className="min-w-0 flex-1">{n.text}</span>
                    <span className="shrink-0 text-xs text-ink-faint">{relativeDate(n.at, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
