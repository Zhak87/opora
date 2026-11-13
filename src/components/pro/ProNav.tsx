"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UsersIcon, HomeIcon, CalendarIcon, TalkIcon, TodayIcon, MoreIcon } from "../icons";
import { Orb } from "../Orb";
import { useMsg } from "@/i18n/client";
import { proMessages } from "@/i18n/pro";
import { common } from "@/i18n/common";
import { cabinetMessages } from "@/i18n/cabinet";

// Пять разделов кабинета. Анкета, приглашения, оплаты и настройки живут в «Ещё».
const ITEMS = [
  { href: "/pro", key: "today", Icon: TodayIcon },
  { href: "/pro/clients", key: "clients", Icon: UsersIcon },
  { href: "/pro/schedule", key: "calendar", Icon: CalendarIcon },
  { href: "/pro/messages", key: "messages", Icon: TalkIcon },
  { href: "/pro/more", key: "more", Icon: MoreIcon },
] as const;

const MORE = ["/pro/more", "/pro/profile", "/pro/invites", "/pro/payments", "/pro/schedule/settings"];
const under = (path: string, href: string) => path === href || path.startsWith(href + "/");

function Badge({ n, className = "" }: { n: number; className?: string }) {
  if (!n) return null;
  return (
    <span className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-lilac-deep px-1 text-[10px] font-medium leading-none text-paper ${className}`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

const isActive = (path: string, href: string) => {
  const more = MORE.some((h) => under(path, h));
  if (href === "/pro/more") return more;
  if (more) return false;
  if (href === "/pro") return path === "/pro";
  return under(path, href) || (href === "/pro/schedule" && path.startsWith("/pro/sessions/"));
};

// Навигация кабинета специалиста: своя, отдельная от личного пространства.
export function ProNav({ unread = 0 }: { unread?: number }) {
  const path = usePathname();
  const m = useMsg(proMessages);
  const c = useMsg(common);
  const nav = useMsg(cabinetMessages).nav;
  return (
    <>
      <aside className="fixed inset-y-3 left-3 z-30 hidden w-[76px] flex-col items-center rounded-[30px] bg-paper/90 py-5 shadow-soft backdrop-blur-xl md:flex lg:w-[236px] lg:items-stretch lg:px-4">
        <Link href="/pro" className="mb-2 flex items-center gap-3 lg:px-2">
          <Orb size={40} face />
          <span className="hidden flex-col lg:flex">
            <span className="font-display text-[19px] font-semibold lowercase leading-tight tracking-[-0.03em] text-ink">{c.brand}</span>
            <span className="text-[11px] uppercase tracking-[0.14em] text-lilac-deep">{m.cabinet}</span>
          </span>
        </Link>
        <nav className="mt-8 flex flex-col gap-1.5">
          {ITEMS.map(({ href, key, Icon }) => {
            const active = isActive(path, href);
            return (
              <Link
                key={href}
                href={href}
                title={nav[key]}
                className={`flex h-12 items-center gap-3 rounded-[18px] px-3 transition-all duration-300 lg:px-3.5 ${
                  active ? "bg-lilac-soft text-ink" : "text-ink-soft hover:bg-sand/40 hover:text-ink"
                }`}
              >
                <span className="relative">
                  <Icon className="h-[22px] w-[22px] shrink-0" />
                  {key === "messages" && <Badge n={unread} className="absolute -right-2 -top-2 lg:hidden" />}
                </span>
                <span className="hidden flex-1 text-[15px] lg:inline">{nav[key]}</span>
                {key === "messages" && <Badge n={unread} className="hidden lg:flex" />}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/"
          title={m.toSelf}
          className="mt-auto flex h-12 items-center gap-3 rounded-2xl px-3 text-ink-soft transition hover:bg-sand/40 hover:text-ink lg:px-3.5"
        >
          <HomeIcon className="h-[22px] w-[22px] shrink-0" />
          <span className="hidden text-[15px] lg:inline">{m.toSelf}</span>
        </Link>
        <p className="mt-6 hidden px-3 text-xs leading-relaxed text-ink-faint lg:block">{m.navTagline}</p>
      </aside>

      <nav className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 rounded-[26px] bg-paper/90 shadow-lift backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
          {ITEMS.map(({ href, key, Icon }) => {
            const active = isActive(path, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium transition-colors ${active ? "text-ink" : "text-ink-faint"}`}
              >
                <span className={`relative flex h-9 w-12 items-center justify-center rounded-[14px] transition-all duration-500 ease-[cubic-bezier(0.3,1.5,0.5,1)] ${active ? "scale-100 bg-ink text-paper" : "scale-90"}`}>
                  <Icon className="h-[21px] w-[21px]" />
                  {key === "messages" && <Badge n={unread} className="absolute -top-1 right-1" />}
                </span>
                {nav[key]}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
