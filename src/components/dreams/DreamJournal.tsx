import Link from "next/link";
import { ArrowIcon, BackIcon } from "@/components/icons";
import styles from "./DreamJournal.module.css";

export function DreamBack({ href = "/dreams", children }: { href?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={styles.back}>
      <BackIcon className="size-4 shrink-0" /> {children}
    </Link>
  );
}

export function DreamBanner({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className={styles.banner}>
      <h1>{title}</h1>
      {children}
    </header>
  );
}

export function DreamHomeLink({ title, hint }: { title: string; hint: string }) {
  return (
    <Link href="/dreams" className={styles.homeLink}>
      <span>
        <strong>{title}</strong>
        <span>{hint}</span>
      </span>
      <span className={styles.homeArrow}><ArrowIcon className="size-5" /></span>
    </Link>
  );
}
