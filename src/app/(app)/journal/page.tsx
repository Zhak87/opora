import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { journal } from "@/i18n/journal";
import { dreamMessages } from "@/i18n/dreams";
import { getTimeZone } from "@/lib/tz";
import { JournalComposer } from "@/components/JournalComposer";
import { JournalHistory } from "@/components/JournalHistory";
import { ArrowIcon } from "@/components/icons";
import styles from "@/components/Journal.module.css";

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { supabase } = await requireUser();
  const [{ q }, locale, timeZone, { data: entries }] = await Promise.all([
    searchParams,
    getLocale(),
    getTimeZone(),
    supabase.from("journal_entries")
      .select("id, kind, content, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const m = journal[locale];
  const question = typeof q === "string" ? q.slice(0, 9998) : undefined;
  const weekStart = Date.now() - 7 * 86_400_000;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <h1>{m.title}</h1>
          <p>{m.intro}</p>
          <Link href="/dreams" className={styles.dreamLink}>
            {dreamMessages[locale].title}
            <ArrowIcon className="size-4 shrink-0" />
          </Link>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <Image src="/home/journal.webp" fill alt="" sizes="(min-width: 640px) 230px, 120px" />
        </div>
      </header>

      <div className={styles.workspace}>
        <JournalComposer key={question ?? ""} question={question} />
        <JournalHistory entries={entries ?? []} timeZone={timeZone} canReflectOnWeek={entries?.some((entry) => Date.parse(entry.created_at) >= weekStart) ?? false} />
      </div>
    </div>
  );
}
