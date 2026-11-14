import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { INTL } from "@/i18n/config";
import { dreamMessages } from "@/i18n/dreams";
import { listDreams } from "@/lib/dream-data";
import { ArrowIcon, PlusIcon } from "@/components/icons";
import { DreamBanner } from "@/components/dreams/DreamJournal";
import styles from "@/components/dreams/DreamJournal.module.css";

export default async function DreamsPage() {
  const { supabase } = await requireUser();
  const locale = await getLocale();
  const m = dreamMessages[locale];
  const dreams = await listDreams(supabase);
  const date = new Intl.DateTimeFormat(INTL[locale], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <>
      <DreamBanner title={m.title}>
        <p>{m.intro}</p>
        <Link href="/dreams/new" className={`${styles.next} ${styles.bannerAction}`}>
          <PlusIcon className="size-5 shrink-0" />
          {dreams.length > 0 ? m.newDream : m.firstDream}
        </Link>
      </DreamBanner>

      <section className="mt-7">
        <h2 className="text-xl font-semibold tracking-tight">{dreams.length ? m.entries : m.emptyTitle}</h2>
        {!dreams.length ? (
          <p className={`mt-3 text-sm leading-relaxed text-ink-soft ${styles.surface}`}>{m.emptyText}</p>
        ) : (
          <ul className={styles.journalList}>
            {dreams.map((d) => (
              <li key={d.id}>
                <Link href={`/dreams/${d.id}`} className={styles.entry}>
                  <span className={styles.cover} aria-hidden>
                    {d.cover && (
                      // eslint-disable-next-line @next/next/no-img-element -- private, signed URLs stay in the browser
                      <img src={d.cover} alt="" loading="lazy" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap gap-x-2 text-xs text-ink-soft">
                      <time dateTime={d.date}>{date.format(new Date(`${d.date}T00:00:00Z`))}</time>
                      {d.type !== "usual" && <span>· {m.types[d.type]}</span>}
                      {(d.status === "draft" || d.status === "storyboard") && <span>· {m.draft}</span>}
                    </span>
                    <strong className={styles.entryTitle}>{d.title || m.untitled}</strong>
                    <span className="mt-1 line-clamp-2 text-sm leading-snug text-ink-soft [overflow-wrap:anywhere]">{d.excerpt}</span>
                    {d.emotions.length > 0 && (
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        {d.emotions.slice(0, 3).map((e) => <span key={e} className={styles.tag}>{m.emotions[e]}</span>)}
                      </span>
                    )}
                  </span>
                  <ArrowIcon className={`size-4 ${styles.entryArrow}`} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
