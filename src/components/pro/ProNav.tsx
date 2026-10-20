"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GridIcon, UsersIcon, LinkIcon, IdIcon, HomeIcon } from "../icons";
import { Orb } from "../Orb";
import { useMsg } from "@/i18n/client";
import { proMessages } from "@/i18n/pro";
import { common } from "@/i18n/common";

const ITEMS = [
  { href: "/pro", key: "overview", Icon: GridIcon },
  { href: "/pro/clients", key: "clients", Icon: UsersIcon },
  { href: "/pro/invites", key: "invites", Icon: LinkIcon },
  { href: "/pro/profile", key: "profile", Icon: IdIcon },
] as const;

const isActive = (path: string, href: string) => (href === "/pro" ? path === "/pro" : path === href || path.startsWith(href + "/"));

// Навигация кабинета специалиста: своя, отдельная от личного пространства.
export function ProNav() {
  const path = usePathname();
  const m = useMsg(proMessages);
  const c = useMsg(common);
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[88px] flex-col items-center border-r border-line/60 bg-paper/70 py-6 backdrop-blur-xl md:flex lg:w-[248px] lg:items-stretch lg:px-5">
        <Link href="/pro" className="mb-2 flex items-center gap-3 lg:px-2">
          <Orb size={36} still />
          <span className="hidden flex-col lg:flex">
            <span className="font-serif text-xl leading-tight text-ink">{c.brand}</span>
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
                title={m.nav[key]}
                className={`flex h-12 items-center gap-3 rounded-2xl px-3 transition-all duration-300 lg:px-3.5 ${
                  active ? "bg-lilac-soft text-ink" : "text-ink-soft hover:bg-sand/40 hover:text-ink"
                }`}
              >
                <Icon className="h-[22px] w-[22px] shrink-0" />
                <span className="hidden text-[15px] lg:inline">{m.nav[key]}</span>
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

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
          {ITEMS.map(({ href, key, Icon }) => {
            const active = isActive(path, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${active ? "text-ink" : "text-ink-faint"}`}
              >
                <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-all duration-300 ${active ? "bg-lilac-soft" : ""}`}>
                  <Icon className="h-[21px] w-[21px]" />
                </span>
                {m.nav[key]}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
