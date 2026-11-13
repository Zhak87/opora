import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { myClients, myPsychologist, type ClientRow } from "@/lib/pro";
import { listSessions } from "@/lib/sessions";
import { listTasks } from "@/lib/records";
import { relativeDate } from "@/lib/format";
import { dayLabel, timeOf } from "@/lib/time";
import { INTL } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { proMessages } from "@/i18n/pro";
import { cabinetMessages } from "@/i18n/cabinet";
import { PageHeader, buttonStyles } from "@/components/ui";
import { Avatar, Chip } from "@/components/pro/bits";
import { ArrowIcon } from "@/components/icons";

const FILTERS = ["active", "first", "paused", "ended"] as const;
type Filter = (typeof FILTERS)[number];

// Клиенты по статусам: с кем идёт работа, кто ждёт первой встречи, кто на паузе и с кем работа завершена.
export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = proMessages[locale].clients;
  const cm = cabinetMessages[locale].clients;
  const me = (await myPsychologist(supabase, user!.id))!;
  const tz = me.timezone;
  const now = Date.now();
  const [clients, sessions, tasks] = await Promise.all([
    myClients(supabase, user!.id, true),
    listSessions(supabase, { psychologist: user!.id }, 3000),
    listTasks(supabase, { psychologist: user!.id }, 500),
  ]);
  // По каждому клиенту: была ли уже встреча, когда следующая, сколько заданий в работе.
  const held = new Set<string>();
  const next = new Map<string, string>();
  for (const s of sessions) {
    if (s.status === "cancelled") continue;
    if (Date.parse(s.ends_at) < now) held.add(s.client_id);
    else if (s.status === "scheduled" && !next.has(s.client_id)) next.set(s.client_id, s.starts_at);
  }
  const open = new Map<string, number>();
  for (const t of tasks) if (t.status === "open") open.set(t.client_id, (open.get(t.client_id) ?? 0) + 1);

  const group = (c: ClientRow): Filter =>
    c.link.status === "ended" ? "ended" : c.link.status === "pending" ? "first" : c.link.paused_at ? "paused" : held.has(c.link.client_id) ? "active" : "first";
  const counts = Object.fromEntries(FILTERS.map((f) => [f, clients.filter((c) => group(c) === f).length])) as Record<Filter, number>;
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 60);
  // Без выбора открываем первую непустую группу, чтобы новый психолог не видел пустой экран.
  const filter: Filter = FILTERS.includes(sp.f as Filter) ? (sp.f as Filter) : counts.active || !counts.first ? "active" : "first";
  const shown = q ? clients.filter((c) => c.link.status !== "ended" && (c.name ?? "").toLowerCase().includes(q)) : clients.filter((c) => group(c) === filter);

  return (
    <>
      <PageHeader title={m.title} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <nav className="flex flex-wrap gap-1.5" data-client-filters>
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={f === "active" ? "/pro/clients?f=active" : `/pro/clients?f=${f}`}
              aria-current={!q && f === filter ? "page" : undefined}
              className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm transition ${!q && f === filter ? "bg-ink text-paper" : "bg-paper text-ink-soft shadow-soft hover:text-ink"}`}
              data-filter={f}
            >
              {cm.filters[f]}
              <span className={!q && f === filter ? "text-paper/70" : "text-ink-faint"}>{counts[f]}</span>
            </Link>
          ))}
        </nav>
        <form className="flex flex-1 gap-2 sm:ml-auto sm:max-w-xs" role="search">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder={cm.search}
            aria-label={cm.search}
            maxLength={60}
            className="h-9 min-w-0 flex-1 rounded-full border border-line bg-paper px-4 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-lilac-deep/60 focus:ring-4 focus:ring-lilac-soft"
          />
          <button className="h-9 rounded-full px-3 text-sm text-ink-soft hover:bg-sand hover:text-ink">{cm.find}</button>
        </form>
      </div>

      {shown.length ? (
        <ul className="stagger grid gap-3 lg:grid-cols-2" data-client-list>
          {shown.map((c) => {
            const g = group(c);
            if (g === "ended")
              return (
                <li key={c.link.id} className="flex items-center gap-4 rounded-[24px] bg-paper px-5 py-4 text-sm text-ink-faint shadow-soft">
                  <span className="flex-1">{c.name ?? m.noName}</span>
                  <span>{c.link.ended_at ? relativeDate(c.link.ended_at, locale) : m.ended}</span>
                </li>
              );
            const at = next.get(c.link.client_id);
            const n = open.get(c.link.client_id) ?? 0;
            return (
              <li key={c.link.id}>
                <Link
                  href={`/pro/clients/${c.link.client_id}`}
                  className="group flex h-full items-start gap-4 rounded-[24px] bg-paper p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
                  data-client={g}
                >
                  <Avatar name={c.name ?? "?"} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-medium text-ink">{c.name ?? m.noName}</span>
                    <span className={`block text-sm ${at ? "text-ink-soft" : "text-ink-faint"}`}>
                      {at ? cm.next(`${dayLabel(at, tz, locale)}, ${timeOf(at, tz, INTL[locale])}`) : cm.noNext}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      {c.link.status === "pending" && <Chip tone="bg-mist text-sky-deep">{cm.request}</Chip>}
                      {(q || g !== filter) && c.link.status !== "pending" && <Chip>{cm.filters[g]}</Chip>}
                      {n > 0 && <Chip tone="bg-lilac-soft text-lilac-deep">{cm.openTasks(n)}</Chip>}
                      <span className="text-xs text-ink-faint">{m.since(relativeDate(c.link.activated_at ?? c.link.created_at, locale))}</span>
                    </span>
                  </span>
                  <ArrowIcon className="mt-1 h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-[24px] border border-dashed border-line px-6 py-10 text-center">
          <p className="text-[15px] text-ink-soft">{clients.length ? cm.nothing : m.empty}</p>
          {!q && (filter === "active" || filter === "first") && (
            <Link href="/pro/invites" className={`${buttonStyles.soft} mt-4 h-11 text-sm`}>
              {cm.invite}
            </Link>
          )}
        </div>
      )}
    </>
  );
}
