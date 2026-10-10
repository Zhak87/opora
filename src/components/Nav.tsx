"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, TalkIcon, JournalIcon, HopeIcon, ProfileIcon } from "./icons";
import { Orb } from "./Orb";
import { MusicToggle } from "./Music";
import { useMsg } from "@/i18n/client";
import { common } from "@/i18n/common";

const ITEMS = [
  { href: "/", key: "home", Icon: HomeIcon },
  { href: "/talk", key: "talk", Icon: TalkIcon },
  { href: "/journal", key: "journal", Icon: JournalIcon },
  { href: "/hope", key: "hope", Icon: HopeIcon },
  { href: "/profile", key: "profile", Icon: ProfileIcon },
] as const;

function isActive(path: string, href: string) {
  if (href === "/") return path === "/" || path.startsWith("/explore") || path.startsWith("/play");
  return path === href || path.startsWith(href + "/");
}

export function Nav() {
  const path = usePathname();
  const inChat = /^\/talk\/.+/.test(path);
  const m = useMsg(common);

  return (
    <>
      {/* Компьютер и планшет: тихая боковая панель */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[88px] flex-col items-center border-r border-line/60 bg-paper/60 py-6 backdrop-blur-xl md:flex lg:w-[232px] lg:items-stretch lg:px-5">
        <Link href="/" className="mb-10 flex items-center gap-3 lg:px-2">
          <Orb size={36} still />
          <span className="hidden font-serif text-xl text-ink lg:inline">{m.brand}</span>
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
                className={`group flex h-12 items-center gap-3 rounded-2xl px-3 transition-all duration-300 lg:px-3.5 ${
                  active ? "bg-sand/80 text-ink" : "text-ink-soft hover:bg-sand/40 hover:text-ink"
                }`}
              >
                <Icon className="h-[22px] w-[22px] shrink-0" />
                <span className="hidden text-[15px] lg:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
        <MusicToggle withLabel className="mt-auto lg:px-1.5 [&>span:last-child]:hidden lg:[&>span:last-child]:inline" />
        <p className="mt-6 hidden px-3 text-xs leading-relaxed text-ink-faint lg:block">
          {m.navTagline}
        </p>
      </aside>

      {/* Телефон: нижняя панель */}
      {!inChat && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-paper/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
            {ITEMS.map(({ href, key, Icon }) => {
              const label = m.nav[key];
              const active = isActive(path, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                    active ? "text-ink" : "text-ink-faint"
                  }`}
                >
                  <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-all duration-300 ${active ? "bg-sand" : ""}`}>
                    <Icon className="h-[21px] w-[21px]" />
                  </span>
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
