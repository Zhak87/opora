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
import { playMessages } from "@/i18n/play";
import { whatIfMessages } from "@/i18n/game-what-if";
import type { Locale } from "@/i18n/config";

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; prompts?: string }> }) {
  const { supabase } = await requireUser();
  const [{ q, prompts }, locale, timeZone, { data: entries }] = await Promise.all([
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

      <JournalTools locale={locale} openPrompts={prompts === "what-if"} />

      <div className={styles.workspace}>
        <JournalComposer key={question ?? ""} question={question} />
        <JournalHistory entries={entries ?? []} timeZone={timeZone} canReflectOnWeek={entries?.some((entry) => Date.parse(entry.created_at) >= weekStart) ?? false} />
      </div>
    </div>
  );
}

// Письма и вопросы, переехавшие сюда из каталога игр (аудит 19.11.2026).
function JournalTools({ locale, openPrompts }: { locale: Locale; openPrompts: boolean }) {
  const p = playMessages[locale].journal;
  const questions = whatIfMessages[locale].questions;
  return (
    <section className="mb-8 grid gap-3 sm:grid-cols-[1fr_1fr_1.3fr]" aria-label={p.lettersTitle}>
      {(["letter", "unsaid"] as const).map((k) => (
        <Link key={k} href={`/tools/${k}`} className="group flex items-center gap-3 rounded-[22px] bg-paper p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium text-ink">{p[k].title}</span>
            <span className="block text-[13px] leading-snug text-ink-soft">{p[k].hint}</span>
          </span>
          <ArrowIcon className="size-4 shrink-0 text-ink-faint transition group-hover:translate-x-0.5" />
        </Link>
      ))}
      <details open={openPrompts} className="rounded-[22px] bg-paper/70 p-4 shadow-soft">
        <summary className="cursor-pointer text-[15px] font-medium text-ink">{p.promptsTitle}</summary>
        <p className="mt-1 text-[13px] text-ink-soft">{p.promptsHint}</p>
        <ul className="mt-3 max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
          {questions.map((q) => (
            <li key={q}>
              <Link href={`/journal?q=${encodeURIComponent(q)}`} className="block rounded-[14px] px-3 py-2 text-[14px] leading-snug text-ink transition hover:bg-sand/70">
                {q}
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
