"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, TalkIcon, UsersIcon, JournalIcon, HopeIcon, ProfileIcon, HeartHandIcon, GridIcon, ShieldIcon } from "./icons";
import { MusicToggle } from "./Music";
import { Bell } from "./Bell";
import { useMsg } from "@/i18n/client";
import { common } from "@/i18n/common";
import sidebar from "./Nav.module.css";

const BASE = [
  { href: "/", key: "home", Icon: HomeIcon },
  { href: "/talk", key: "talk", Icon: TalkIcon },
  { href: "/rooms", key: "rooms", Icon: UsersIcon },
  { href: "/journal", key: "journal", Icon: JournalIcon },
  { href: "/hope", key: "hope", Icon: HopeIcon },
] as const;
// Пункт «Психолог» появляется, только когда человек работает со специалистом.
const CARE = { href: "/care", key: "care", Icon: HeartHandIcon } as const;
const PROFILE = { href: "/profile", key: "profile", Icon: ProfileIcon } as const;

function isActive(path: string, href: string) {
  if (href === "/") return path === "/" || path.startsWith("/explore") || path.startsWith("/play") || path.startsWith("/course") || path.startsWith("/dreams");
  return path === href || path.startsWith(href + "/");
}

function SidebarLink({ href, label, Icon, path, count = 0 }: {
  href: string;
  label: string;
  Icon: typeof HomeIcon;
  path: string;
  count?: number;
}) {
  const name = count > 0 ? `${label} (${count})` : label;
  const current = path === href ? "page" : isActive(path, href) ? "location" : undefined;

  return (
    <Link href={href} className={sidebar.row} aria-label={name} title={name} aria-current={current}>
      <span className={sidebar.icon} aria-hidden="true"><Icon /></span>
      <span className={sidebar.label}>{label}</span>
      {count > 0 && <span className={sidebar.count} aria-hidden="true">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
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
  const sections = care ? [...BASE, CARE] : BASE;
  // В разговоре и внутри комнаты нижняя панель прячется: там своё управление внизу экрана.
  const inChat = /^\/talk\/.+/.test(path) || /^\/rooms\/[0-9a-f-]{36}/.test(path);
  const m = useMsg(common);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col overflow-y-auto border-r border-line bg-paper px-3 pb-4 pt-5 font-sans md:flex lg:w-[244px] lg:px-4 lg:pb-5 lg:pt-6">
        <Link href="/" aria-label={m.brand} className="mb-6 flex h-12 shrink-0 items-center justify-center rounded-xl lg:justify-start lg:px-3">
          <Image src="/brand/opora-mark-opi.svg" alt="" width={40} height={40} className="lg:hidden" />
          <Image src="/brand/opora-logo-horizontal.svg" alt="" width={180} height={37} className="hidden lg:block" />
        </Link>

        <nav aria-label={m.navigation} className="grid gap-1">
          {sections.map(({ href, key, Icon }) => (
            <SidebarLink key={href} href={href} label={m.nav[key]} Icon={Icon} path={path} count={key === "care" ? careUnread : undefined} />
          ))}
        </nav>

        {(pro || adminPending !== null) && (
          <nav aria-label={m.staffNavigation} className="mt-4 grid gap-1 border-t border-line pt-4">
            {pro && <SidebarLink href="/pro" label={m.nav.pro} Icon={GridIcon} path={path} />}
            {adminPending !== null && (
              <SidebarLink href="/admin/psychologists" label={m.nav.admin} Icon={ShieldIcon} path={path} count={adminPending} />
            )}
          </nav>
        )}

        <div className="mt-auto pt-5">
          <div className="grid gap-1 border-t border-line pt-4">
            <SidebarLink href={PROFILE.href} label={m.nav.profile} Icon={PROFILE.Icon} path={path} />
            <Bell unread={unread} variant="sidebar" />
            <MusicToggle variant="sidebar" />
          </div>
        </div>
      </aside>

      {/* Телефон: нижняя панель */}
      {!inChat && (
        <nav data-mobile-nav className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 rounded-[26px] bg-paper/90 shadow-lift backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-md items-stretch justify-around px-1.5">
            {[...sections, PROFILE].map(({ href, key, Icon }) => {
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
