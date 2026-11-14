"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UsersIcon, HomeIcon, CalendarIcon, TalkIcon, TodayIcon, MoreIcon } from "../icons";
import { Sidebar, SidebarLink } from "../Sidebar";
import { useMsg } from "@/i18n/client";
import { proMessages } from "@/i18n/pro";
import { common } from "@/i18n/common";
import { cabinetMessages } from "@/i18n/cabinet";

const ITEMS = [
  { href: "/pro", key: "today", Icon: TodayIcon },
  { href: "/pro/clients", key: "clients", Icon: UsersIcon },
  { href: "/pro/schedule", key: "calendar", Icon: CalendarIcon },
  { href: "/pro/messages", key: "messages", Icon: TalkIcon },
  { href: "/pro/more", key: "more", Icon: MoreIcon },
] as const;

const MORE = ["/pro/more", "/pro/profile", "/pro/invites", "/pro/payments", "/pro/schedule/settings"];
const under = (path: string, href: string) => path === href || path.startsWith(href + "/");

function currentPage(path: string, href: string) {
  if (path === href) return "page";
  const more = MORE.some((section) => under(path, section));
  if (more) return href === "/pro/more" ? "location" : undefined;
  if (href === "/pro") return undefined;
  if (under(path, href) || (href === "/pro/schedule" && path.startsWith("/pro/sessions/"))) return "location";
}

export function ProNav({ unread = 0 }: { unread?: number }) {
  const path = usePathname();
  const { cabinet, toSelf } = useMsg(proMessages);
  const { brand } = useMsg(common);
  const nav = useMsg(cabinetMessages).nav;

  return (
    <>
      <Sidebar href="/pro" brand={brand} caption={cabinet}>
        <nav aria-label={cabinet} className="grid gap-1">
          {ITEMS.map(({ href, key, Icon }) => (
            <SidebarLink key={href} href={href} label={nav[key]} Icon={Icon} current={currentPage(path, href)} count={key === "messages" ? unread : undefined} />
          ))}
        </nav>
        <div className="mt-auto pt-5">
          <div className="border-t border-line pt-4">
            <SidebarLink href="/" label={toSelf} Icon={HomeIcon} />
          </div>
        </div>
      </Sidebar>

      <nav
        aria-label={cabinet}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 px-1">
          {ITEMS.map(({ href, key, Icon }) => {
            const current = currentPage(path, href);
            const count = key === "messages" ? unread : 0;
            return (
              <Link
                key={href}
                href={href}
                aria-current={current}
                aria-label={count ? `${nav[key]} (${count})` : nav[key]}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 py-2 text-center text-[10px] font-medium leading-tight ${current ? "text-ink" : "text-ink-soft"}`}
              >
                <span aria-hidden="true" className={`relative grid h-8 w-11 max-w-full place-items-center rounded-lg ${current ? "bg-lilac-soft text-ink" : ""}`}>
                  <Icon className="size-5" />
                  {count > 0 && (
                    <span className="absolute right-0 top-0 min-w-4 rounded-full bg-ink px-1 py-0.5 text-[9px] font-semibold leading-none text-paper">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </span>
                <span className="max-w-full [overflow-wrap:anywhere]">{nav[key]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
