"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, TalkIcon, UsersIcon, JournalIcon, HopeIcon, ProfileIcon, HeartHandIcon, GridIcon, ShieldIcon } from "./icons";
import { Orb } from "./Orb";
import { MusicToggle } from "./Music";
import { Bell } from "./Bell";
import { useMsg } from "@/i18n/client";
import { common } from "@/i18n/common";

const BASE = [
  { href: "/", key: "home", Icon: HomeIcon },
  { href: "/talk", key: "talk", Icon: TalkIcon },
  { href: "/rooms", key: "rooms", Icon: UsersIcon },
  { href: "/journal", key: "journal", Icon: JournalIcon },
  { href: "/hope", key: "hope", Icon: HopeIcon },
  { href: "/profile", key: "profile", Icon: ProfileIcon },
] as const;
// Пункт «Психолог» появляется, только когда человек работает со специалистом.
const CARE = { href: "/care", key: "care", Icon: HeartHandIcon } as const;

function isActive(path: string, href: string) {
  if (href === "/") return path === "/" || path.startsWith("/explore") || path.startsWith("/play") || path.startsWith("/course");
  return path === href || path.startsWith(href + "/");
}

export function Nav({
  unread = 0,
  care = false,
  pro = false,
  careUnread = 0,
  adminPending = null,
}: {
  unread?: number;
  care?: boolean;
  pro?: boolean;
  careUnread?: number;
  adminPending?: number | null;
}) {
  const path = usePathname();
  const ITEMS = care ? [...BASE.slice(0, 5), CARE, BASE[5]] : BASE;
  // В разговоре и внутри комнаты нижняя панель прячется: там своё управление внизу экрана.
  const inChat = /^\/talk\/.+/.test(path) || /^\/rooms\/[0-9a-f-]{36}/.test(path);
  const m = useMsg(common);

  return (
    <>
      {/* Компьютер и планшет: тихая боковая панель */}
      <aside className="fixed inset-y-3 left-3 z-30 hidden w-[76px] flex-col items-center rounded-[30px] bg-paper/90 py-5 shadow-soft backdrop-blur-xl md:flex lg:w-[220px] lg:items-stretch lg:px-4">
        <Link href="/" className="mb-9 flex items-center gap-2.5 lg:px-2">
          <Orb size={40} face />
          <span className="hidden font-display text-[19px] font-semibold lowercase tracking-[-0.03em] text-ink lg:inline">{m.brand}</span>
        </Link>
        <nav className="flex flex-col gap-1.5">
          {ITEMS.map(({ href, key, Icon }) => {
            const label = m.nav[key];
            const active = isActive(path, href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`group relative flex h-12 items-center gap-3 rounded-[18px] px-3 transition-all duration-300 lg:px-3.5 ${
                  active ? "bg-ink text-paper shadow-soft" : "text-ink-soft hover:bg-sand hover:text-ink"
                }`}
              >
                <span className="relative">
                  <Icon className="h-[22px] w-[22px] shrink-0" />
                  {key === "care" && careUnread > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-paper bg-lilac-deep" aria-label={String(careUnread)} />}
                </span>
                <span className="hidden text-[15px] font-medium lg:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
        <Bell unread={unread} withLabel className="mt-4 lg:px-1.5 [&>span:last-child]:hidden lg:[&>span:last-child]:inline" />
        {pro && (
          <Link
            href="/pro"
            title={m.nav.pro}
            className="mt-1.5 flex h-12 items-center gap-3 rounded-[18px] px-3 text-lilac-deep transition hover:bg-lilac-soft lg:px-3.5"
          >
            <GridIcon className="h-[22px] w-[22px] shrink-0" />
            <span className="hidden text-[15px] lg:inline">{m.nav.pro}</span>
          </Link>
        )}
        {/* Только для администраторов: проверка анкет психологов, с числом ждущих */}
        {adminPending !== null && (
          <Link
            href="/admin"
            title={m.nav.admin}
            className="mt-1.5 flex h-12 items-center gap-3 rounded-[18px] px-3 text-sky-deep transition hover:bg-mist lg:px-3.5"
          >
            <span className="relative">
              <ShieldIcon className="h-[22px] w-[22px] shrink-0" />
              {adminPending > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-paper bg-lilac-deep px-1 text-[10px] font-semibold text-paper">
                  {adminPending}
                </span>
              )}
            </span>
            <span className="hidden text-[15px] lg:inline">{m.nav.admin}</span>
          </Link>
        )}
        <MusicToggle withLabel className="mt-auto lg:px-1.5 [&>span:last-child]:hidden lg:[&>span:last-child]:inline" />
        <p className="mt-6 hidden px-3 text-xs leading-relaxed text-ink-faint lg:block">
          {m.navTagline}
        </p>
      </aside>

      {/* Телефон: нижняя панель */}
      {!inChat && (
        <nav className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 rounded-[26px] bg-paper/90 shadow-lift backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-md items-stretch justify-around px-1.5">
            {ITEMS.map(({ href, key, Icon }) => {
              const label = m.nav[key];
              const active = isActive(path, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium transition-colors ${
                    active ? "text-ink" : "text-ink-faint"
                  }`}
                >
                  <span
                    className={`relative flex h-9 w-12 max-w-full items-center justify-center rounded-[14px] transition-all duration-500 ease-[cubic-bezier(0.3,1.5,0.5,1)] ${
                      active ? "scale-100 bg-ink text-paper" : "scale-90"
                    }`}
                  >
                    <Icon className="h-[21px] w-[21px]" />
                    {key === "care" && careUnread > 0 && <span className="absolute right-2.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-lilac-deep" aria-label={String(careUnread)} />}
                  </span>
                  <span className="max-w-full truncate px-0.5">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
