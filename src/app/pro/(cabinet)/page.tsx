import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { myClients, myPsychologist } from "@/lib/pro";
import { relativeDate } from "@/lib/format";
import { getLocale } from "@/i18n/server";
import { proMessages } from "@/i18n/pro";
import { careMessages } from "@/i18n/care";
import { Avatar, Chip, Stat, StatusPill } from "@/components/pro/bits";
import { ArrowIcon } from "@/components/icons";
import { buttonStyles } from "@/components/ui";
import { listSessions } from "@/lib/sessions";
import { timeOf, dayLabel } from "@/lib/time";
import { INTL } from "@/i18n/config";
import { scheduleMessages } from "@/i18n/schedule";
import { careNotices, lastMessages, markNotificationsRead, unreadByPeer } from "@/lib/care-chat";
import { careChatMessages } from "@/i18n/care-chat";

export default async function ProOverview() {
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = proMessages[locale];
  const scopes = careMessages[locale].scopes;
  const me = (await myPsychologist(supabase, user!.id))!;
  const sm = scheduleMessages[locale];
  const cm = careChatMessages[locale];
  const [clients, { data: invites }, upcoming, notices, unread, last] = await Promise.all([
    myClients(supabase, me.user_id),
    supabase.from("invites").select("id, views").eq("psychologist_id", me.user_id),
    listSessions(supabase, { psychologist: me.user_id, status: ["scheduled"], from: new Date(Date.now() - 60 * 60 * 1000).toISOString() }, 5),
    careNotices(supabase, { me: me.user_id, role: "pro", locale, tz: me.timezone, limit: 6 }),
    unreadByPeer(supabase),
    lastMessages(supabase, me.user_id),
  ]);
  // Уведомления показаны — отмечаем прочитанными; подсветка новых остаётся до следующего захода.
  if (notices.some((n) => n.fresh)) await markNotificationsRead(supabase, notices.filter((n) => n.fresh).map((n) => n.id));
  const names = Object.fromEntries(clients.map((c) => [c.link.client_id, c.name ?? m.clients.noName]));
  const requests = clients.filter((c) => c.link.status === "pending");
  const newMessages = [...unread.entries()].map(([peer, n]) => ({ peer, n, msg: last.get(peer) }));
  const active = clients.filter((c) => c.link.status === "active");
  const views = (invites ?? []).reduce((sum, i) => sum + (i.views ?? 0), 0);
  const fromInvites = clients.filter((c) => c.link.source === "invite").length;

  return (
    <div className="stagger">
      <header className="mb-8 sm:mb-10">
        <p className="mb-2 text-sm text-ink-soft">{m.cabinet}</p>
        <h1 className="font-serif text-[32px] leading-tight text-ink sm:text-[40px]">{m.overview.hello(me.full_name.split(" ")[0] ?? "")}</h1>
      </header>

      <section className="mb-6 flex flex-col gap-4 rounded-[28px] border border-line/70 bg-gradient-to-r from-paper via-paper to-lilac-soft/60 p-6 shadow-soft sm:flex-row sm:items-center sm:p-7">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <p className="text-[15px] font-medium text-ink">{m.overview.profileStatus}</p>
            <StatusPill status={me.status} label={m.status[me.status]} />
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">{m.statusHint[me.status]}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {me.status === "approved" && (
            <Link href={`/p/${me.slug}`} className={`${buttonStyles.ghost} h-11`}>
              {m.overview.publicLink}
            </Link>
          )}
          <Link href="/pro/profile" className={`${buttonStyles.soft} h-11`}>
            {m.overview.openProfile}
          </Link>
        </div>
      </section>

      <section className="mb-10 grid grid-cols-3 gap-2 sm:gap-4">
        <Stat value={active.length} label={m.overview.activeClients(active.length)} tone="bg-gradient-to-br from-paper to-sage-soft/70" />
        <Stat value={views} label={m.overview.invitesViews(views)} tone="bg-gradient-to-br from-paper to-mist/70" />
        <Stat value={fromInvites} label={m.overview.fromInvites(fromInvites)} tone="bg-gradient-to-br from-paper to-sand/80" />
      </section>

      {requests.length > 0 && (
        <Link
          href="/pro/schedule"
          className="group mb-6 flex items-center gap-4 rounded-[24px] border border-sky/40 bg-mist/60 px-5 py-4 transition hover:bg-mist"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper font-serif text-lg text-sky-deep">{requests.length}</span>
          <span className="flex-1 text-[15px] text-ink">{sm.pro.requests}</span>
          <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
        </Link>
      )}

      <section className="mb-10">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className="text-[15px] text-ink-soft">{sm.care.upcoming}</h2>
          <Link href="/pro/schedule" className="text-sm text-ink-faint hover:text-ink">
            {sm.pro.title}
          </Link>
        </div>
        {upcoming.length ? (
          <ul className="divide-y divide-line/70 overflow-hidden rounded-[24px] border border-line/70 bg-paper/75">
            {upcoming.map((s) => (
              <li key={s.id}>
                <Link href={`/pro/sessions/${s.id}`} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-sand/40">
                  <span className="w-14 shrink-0 font-serif text-[20px] text-ink">{timeOf(s.starts_at, me.timezone, INTL[locale])}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-ink">{names[s.client_id] ?? m.clients.noName}</span>
                    <span className="block text-xs text-ink-faint">{dayLabel(s.starts_at, me.timezone, locale)}</span>
                  </span>
                  <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[24px] border border-dashed border-line px-6 py-8 text-center text-sm text-ink-soft">{sm.care.noUpcoming}</p>
        )}
      </section>

      <div className="mb-10 grid gap-5 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-baseline justify-between px-1">
            <h2 className="text-[15px] text-ink-soft">{cm.messages}</h2>
            <Link href="/pro/messages" className="text-sm text-ink-faint hover:text-ink">
              {cm.all}
            </Link>
          </div>
          {newMessages.length ? (
            <ul className="divide-y divide-line/70 overflow-hidden rounded-[24px] border border-line/70 bg-paper/75">
              {newMessages.slice(0, 5).map(({ peer, n, msg }) => (
                <li key={peer}>
                  <Link href={`/pro/messages/${peer}`} className="group flex items-center gap-3 px-5 py-4 transition hover:bg-sand/40">
                    <Avatar name={names[peer] ?? "?"} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-ink">{names[peer] ?? m.clients.noName}</span>
                      {msg && <span className="block truncate text-sm text-ink-soft">{msg.body}</span>}
                    </span>
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-lilac-deep px-2 text-xs text-paper">{n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[24px] border border-dashed border-line px-6 py-8 text-center text-sm text-ink-soft">{cm.noNew}</p>
          )}
        </section>
        <section>
          <h2 className="mb-3 px-1 text-[15px] text-ink-soft">{cm.notificationsTitle}</h2>
          {notices.length ? (
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
          ) : (
            <p className="rounded-[24px] border border-dashed border-line px-6 py-8 text-center text-sm text-ink-soft">{cm.noNotifications}</p>
          )}
        </section>
      </div>

      <section className="mb-10">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className="text-[15px] text-ink-soft">{m.overview.recentClients}</h2>
          {clients.length > 0 && (
            <Link href="/pro/clients" className="text-sm text-ink-faint hover:text-ink">
              {m.overview.allClients}
            </Link>
          )}
        </div>
        {clients.length ? (
          <ul className="divide-y divide-line/70 overflow-hidden rounded-[24px] border border-line/70 bg-paper/75">
            {clients.slice(0, 5).map((c) => (
              <li key={c.link.id}>
                <Link href={`/pro/clients/${c.link.client_id}`} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-sand/40">
                  <Avatar name={c.name ?? "?"} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-ink">{c.name ?? m.clients.noName}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      {c.scopes.length ? (
                        c.scopes.map((s) => (
                          <Chip key={s} tone="bg-sage-soft/80 text-sage-deep">
                            {scopes[s].title}
                          </Chip>
                        ))
                      ) : (
                        <span className="text-xs text-ink-faint">{m.clients.sharesNothing}</span>
                      )}
                    </span>
                  </span>
                  <span className="hidden text-xs text-ink-faint sm:block">{relativeDate(c.link.activated_at ?? c.link.created_at, locale)}</span>
                  <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[24px] border border-dashed border-line px-6 py-10 text-center text-[15px] leading-relaxed text-ink-soft">
            {me.status === "approved" ? m.overview.noClientsApproved : m.overview.noClients}
          </p>
        )}
      </section>

      <Link href="/pro/invites" className="block text-center text-sm text-ink-faint hover:text-ink md:hidden">
        {m.nav.invites}
      </Link>
    </div>
  );
}
