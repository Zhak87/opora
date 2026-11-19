import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { HomeIcon } from "./icons";
import styles from "./Nav.module.css";

export function Sidebar({ href, brand, caption, children }: {
  href: string;
  brand: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col overflow-y-auto border-r border-line bg-paper px-3 pb-4 pt-5 font-sans md:flex lg:w-[244px] lg:px-4 lg:pb-5 lg:pt-6">
      <Link href={href} aria-label={caption ? `${brand} · ${caption}` : brand} className="mb-6 flex min-h-12 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl py-1 lg:items-start lg:px-3 lg:py-1.5">
        <Image src="/brand/opora-mark-opi.svg" alt="" width={40} height={40} className="lg:hidden" />
        <Image src="/brand/opora-logo-horizontal.svg" alt="" width={180} height={37} className="hidden lg:block" />
        {caption && <span className="hidden text-xs font-medium leading-tight text-ink-soft lg:block">{caption}</span>}
      </Link>
      {children}
    </aside>
  );
}

export function SidebarLink({ href, label, Icon, current, count = 0 }: {
  href: string;
  label: string;
  Icon: typeof HomeIcon;
  current?: "page" | "location";
  count?: number;
}) {
  const name = count > 0 ? `${label} (${count})` : label;

  return (
    <Link href={href} className={styles.row} aria-label={name} title={name} aria-current={current}>
      <span className={styles.icon} aria-hidden="true"><Icon /></span>
      <span className={styles.label}>{label}</span>
      {count > 0 && <span className={styles.count} aria-hidden="true">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}
