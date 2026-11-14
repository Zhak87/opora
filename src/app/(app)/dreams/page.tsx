import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { INTL } from "@/i18n/config";
import { dreamMessages } from "@/i18n/dreams";
import { listDreams } from "@/lib/dream-data";
import { MOODS, NIGHT } from "@/lib/dreams";
import { PageHeader, buttonStyles } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { Night, nightPrimary } from "@/components/games/Night";

// Дневник снов: карточки с датой, названием, миниатюрой первого кадра и чувствами.
export default async function DreamsPage() {
  const { supabase } = await requireUser();
  const locale = await getLocale();
  const m = dreamMessages[locale];
  const dreams = await listDreams(supabase);
  const date = new Intl.DateTimeFormat(INTL[locale], { day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <>
      <PageHeader title={m.title}>{m.intro}</PageHeader>

      {dreams.length === 0 ? (
        <Night className="px-6 py-12 text-center sm:py-16" glow={NIGHT.violet}>
          <div className="relative mx-auto max-w-sm">
            <span className="mx-auto block h-16 w-16 animate-float rounded-full" style={{ background: NIGHT.gold, boxShadow: `0 0 50px 8px ${NIGHT.gold}55` }} aria-hidden />
            <h2 className="mt-7 font-serif text-[22px] sm:text-[26px]">{m.emptyTitle}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-paper/70">{m.emptyText}</p>
            <Link href="/dreams/new" className={`${nightPrimary} mt-7`}>{m.firstDream}</Link>
          </div>
        </Night>
      ) : (
        <>
          <Link href="/dreams/new" className={`${buttonStyles.primary} mb-8 h-14 px-7 text-base`}>
            <PlusIcon className="h-5 w-5" /> {m.newDream}
          </Link>
          <ul className="stagger grid gap-4 sm:grid-cols-2">
            {dreams.map((d) => (
              <li key={d.id}>
                <Link href={`/dreams/${d.id}`} className="lift group flex h-full gap-4 rounded-[26px] bg-paper p-4 shadow-soft">
                  <span
                    className="relative block h-[110px] w-[88px] shrink-0 overflow-hidden rounded-[16px]"
                    style={{ background: `linear-gradient(165deg, ${MOODS[d.mood].from}, ${MOODS[d.mood].to})` }}
                    aria-hidden
                  >
                    {d.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.cover} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="absolute right-3 top-3 h-6 w-6 rounded-full" style={{ background: NIGHT.gold }} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 py-1">
                    <span className="block text-xs text-ink-faint">
                      {date.format(new Date(`${d.date}T00:00:00Z`))}
                      {d.type !== "usual" && ` · ${m.types[d.type]}`}
                      {(d.status === "draft" || d.status === "storyboard") && ` · ${m.draft}`}
                    </span>
                    <span className="mt-1 block truncate font-display text-[16px] font-medium text-ink">{d.title || m.untitled}</span>
                    <span className="mt-1 line-clamp-2 block text-[13.5px] leading-snug text-ink-soft">{d.excerpt}</span>
                    {d.emotions.length > 0 && (
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        {d.emotions.slice(0, 3).map((e) => (
                          <span key={e} className="rounded-full px-2.5 py-0.5 text-[12px]" style={{ background: NIGHT.haze, color: NIGHT.violet }}>
                            {m.emotions[e]}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
