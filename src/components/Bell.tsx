"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BellIcon } from "./icons";
import { useMsg } from "@/i18n/client";
import { notificationMessages } from "@/i18n/notifications";
import { SEEN_EVENT } from "./MarkSeen";

// Колокольчик центра уведомлений: на телефоне — в правом верхнем углу, на компьютере — в боковой панели.
export function Bell({ unread: initial, withLabel = false, className = "" }: { unread: number; withLabel?: boolean; className?: string }) {
  const [unread, setUnread] = useState(initial);
  useEffect(() => setUnread(initial), [initial]);
  useEffect(() => {
    const clear = () => setUnread(0);
    window.addEventListener(SEEN_EVENT, clear);
    return () => window.removeEventListener(SEEN_EVENT, clear);
  }, []);
  const m = useMsg(notificationMessages);
  const active = usePathname() === "/notifications";
  return (
    <Link
      href="/notifications"
      aria-label={m.bell(unread)}
      title={m.bell(unread)}
      className={`group flex items-center gap-3 rounded-2xl transition-all duration-300 ${active ? "text-ink" : "text-ink-soft hover:text-ink"} ${className}`}
    >
      <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${active ? "bg-sand" : "bg-paper/80 shadow-soft"}`}>
        <BellIcon className={`h-[19px] w-[19px] ${unread ? "origin-top animate-[ring_2.4s_ease-in-out_1]" : ""}`} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-lilac-deep px-1 text-[10.5px] font-medium leading-none text-paper ring-2 ring-milk">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </span>
      {withLabel && <span className="text-[15px]">{m.title}</span>}
    </Link>
  );
}
