import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/i18n/server";
import { INTL } from "@/i18n/config";
import { panelMessages } from "@/i18n/admin";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { BlockButton } from "@/components/admin/BlockButton";
import { Card, Notice } from "@/components/ui";
import { ROLES, USER_FILTERS, canGrant, canManage, type AdminUser, type UserFilter } from "@/lib/admin";
import { setBlocked, setRole } from "@/lib/admin-actions";

export const metadata: Metadata = { robots: { index: false } };
export const dynamic = "force-dynamic";

const PAGE = 30;

// Пользователи: поиск, роли и блокировка. Что кому можно, решает база; здесь лишние кнопки просто не показываются.
export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; p?: string; note?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const filter: UserFilter = (USER_FILTERS as readonly string[]).includes(sp.f ?? "") ? (sp.f as UserFilter) : "all";
  const page = Math.max(0, Number(sp.p) || 0);
  const locale = await getLocale();
  const m = panelMessages[locale];
  const href = (over: { f?: string; p?: number }) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const f = over.f ?? filter;
    if (f !== "all") params.set("f", f);
    const p = over.p ?? 0;
    if (p > 0) params.set("p", String(p));
    const s = params.toString();
    return `/admin/users${s ? `?${s}` : ""}`;
  };
  const date = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(INTL[locale], { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Almaty" }) : m.never;

  return (
    <AdminFrame active="users">
      {async ({ role, supabase, userId }) => {
        const { data } = await supabase.rpc("admin_users", { p_search: q, p_filter: filter, p_limit: PAGE, p_offset: page * PAGE });
        const { total = 0, users = [] } = (data ?? {}) as { total?: number; users?: AdminUser[] };
        const here = href({ p: page });
        return (
          <div>
            <h1 className="font-serif text-[30px] leading-[1.1] text-ink sm:text-[40px]">{m.usersTitle}</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{m.usersIntro}</p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-faint">{!canManage(role) ? m.viewOnly : !canGrant(role) ? m.onlyDeveloper : m.psyHow}</p>

            {sp.note && m.notes[sp.note] && (
              <div className="mt-5">
                <Notice tone={sp.note === "error" || sp.note === "self" ? "error" : "info"}>{m.notes[sp.note]}</Notice>
              </div>
            )}

            <form action="/admin/users" className="mt-6 flex max-w-xl gap-2">
              {filter !== "all" && <input type="hidden" name="f" value={filter} />}
              <label className="sr-only" htmlFor="user-search">{m.search}</label>
              <input
                id="user-search"
                name="q"
                defaultValue={q}
                placeholder={m.search}
                className="h-11 min-w-0 flex-1 rounded-full border-2 border-transparent bg-paper px-5 text-[15px] text-ink shadow-soft outline-none focus:border-lilac-deep/50"
              />
              <button className="h-11 rounded-full bg-ink px-5 text-sm font-medium text-paper hover:bg-lilac-deep">{m.find}</button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {USER_FILTERS.map((f) => (
                <Link key={f} href={href({ f })} className={`rounded-full px-3.5 py-1.5 text-sm transition ${f === filter ? "bg-lilac-deep text-paper" : "bg-paper text-ink-soft shadow-soft hover:text-ink"}`}>
                  {m.filters[f]}
                </Link>
              ))}
            </div>
            <p className="mb-3 mt-6 text-sm text-ink-soft">{m.found(total)}</p>

            {users.length === 0 ? (
              <Card className="p-8 text-center text-[15px] text-ink-soft">{m.noUsers}</Card>
            ) : (
              <ul className="space-y-3">
                {users.map((u) => {
                  const self = u.id === userId;
                  const staff = u.role !== "user";
                  return (
                    <li key={u.id} data-user={u.email ?? u.id} className="rounded-[24px] bg-paper p-5 shadow-soft">
                      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                        <div className="min-w-0 flex-1 basis-64">
                          <p className="truncate text-[15px] font-medium text-ink">
                            {u.guest ? m.guest : u.email}
                            {self && <span className="ml-2 text-xs font-normal text-ink-faint">({m.you})</span>}
                          </p>
                          <p className="mt-0.5 text-sm text-ink-soft">
                            {u.name || m.noName} · {m.talks(u.conversations)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                            <span className={`rounded-full px-2.5 py-1 font-medium ${staff ? "bg-lilac-soft text-lilac-deep" : "bg-sand text-ink-soft"}`}>{m.roles[u.role]}</span>
                            {u.psy_status && (
                              <Link href={`/admin/psychologists?status=${u.psy_status}`} className="rounded-full bg-sage-soft px-2.5 py-1 text-sage-deep hover:underline" title={m.psyOpen}>
                                {m.psy[u.psy_status] ?? u.psy_status}
                              </Link>
                            )}
                            {u.blocked && <span className="rounded-full bg-[#ffeeec] px-2.5 py-1 text-[#c2453d]">{m.blocked}</span>}
                          </div>
                        </div>
                        <dl className="grid shrink-0 grid-cols-2 gap-x-6 text-xs text-ink-faint">
                          <div>
                            <dt>{m.cols.joined}</dt>
                            <dd className="mt-0.5 tabular-nums text-ink-soft">{date(u.created_at)}</dd>
                          </div>
                          <div>
                            <dt>{m.cols.seen}</dt>
                            <dd className="mt-0.5 tabular-nums text-ink-soft">{date(u.last_seen ?? u.last_sign_in_at)}</dd>
                          </div>
                        </dl>
                        {!self && !u.guest && canManage(role) && (
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {canGrant(role) && (
                              <form action={setRole} className="flex items-center gap-2">
                                <input type="hidden" name="user" value={u.id} />
                                <input type="hidden" name="back" value={here} />
                                <label className="sr-only" htmlFor={`role-${u.id}`}>{m.cols.role}</label>
                                <select id={`role-${u.id}`} name="role" defaultValue={u.role} className="h-9 rounded-full border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-lilac-deep/60">
                                  {ROLES.map((r) => (
                                    <option key={r} value={r}>{m.roles[r]}</option>
                                  ))}
                                </select>
                                <button className="h-9 rounded-full bg-ink px-4 text-sm font-medium text-paper hover:bg-lilac-deep">{m.save}</button>
                              </form>
                            )}
                            {(!staff || canGrant(role)) && (
                              <form action={setBlocked}>
                                <input type="hidden" name="user" value={u.id} />
                                <input type="hidden" name="back" value={here} />
                                <input type="hidden" name="block" value={u.blocked ? "0" : "1"} />
                                <BlockButton label={u.blocked ? m.unblock : m.block} confirmText={u.blocked ? undefined : m.blockConfirm} danger={!u.blocked} />
                              </form>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {(page > 0 || (page + 1) * PAGE < total) && (
              <div className="mt-6 flex justify-between">
                {page > 0 ? <Link href={href({ p: page - 1 })} className="rounded-full bg-paper px-4 py-2 text-sm text-ink shadow-soft">{m.prev}</Link> : <span />}
                {(page + 1) * PAGE < total && <Link href={href({ p: page + 1 })} className="rounded-full bg-paper px-4 py-2 text-sm text-ink shadow-soft">{m.next}</Link>}
              </div>
            )}

            <Card className="mt-8 p-6">
              <ul className="space-y-2 text-sm">
                {ROLES.map((r) => (
                  <li key={r} className="flex flex-wrap gap-x-3">
                    <span className="w-36 shrink-0 font-medium text-ink">{m.roles[r]}</span>
                    <span className="text-ink-soft">{m.roleHints[r]}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        );
      }}
    </AdminFrame>
  );
}
