import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getTopic } from "@/lib/topics";
import { getLocale } from "@/i18n/server";
import { topicsTalk } from "@/i18n/topics";
import { chatMessages } from "@/i18n/chat";
import { INTL } from "@/i18n/config";
import { getTimeZone } from "@/lib/tz";
import { addDays, dayKey } from "@/lib/time";
import { deleteConversation } from "@/lib/actions";
import { StartForm } from "@/components/StartForm";
import { ConfirmForm } from "@/components/ConfirmForm";
import { Orb } from "@/components/Orb";
import { ArrowIcon, CompassIcon, PlusIcon, TalkIcon, TrashIcon } from "@/components/icons";
import styles from "./Talk.module.css";

export default async function TalkPage() {
  const { supabase } = await requireUser();
  const [locale, timeZone, { data: conversations }] = await Promise.all([
    getLocale(),
    getTimeZone(),
    supabase
      .from("conversations")
      .select("id, title, mode, topic, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);
  const m = topicsTalk[locale];
  const now = new Date();
  const today = dayKey(now, timeZone);
  const yesterday = addDays(today, -1);
  const date = new Intl.DateTimeFormat(INTL[locale], { day: "numeric", month: "long", year: "numeric", timeZone });
  const time = new Intl.DateTimeFormat(INTL[locale], { hour: "numeric", minute: "2-digit", timeZone });
  const groups = new Map<string, NonNullable<typeof conversations>>();
  for (const conversation of conversations ?? []) {
    const day = dayKey(conversation.updated_at, timeZone);
    const group = groups.get(day);
    if (group) group.push(conversation);
    else groups.set(day, [conversation]);
  }

  return (
    <div className={styles.index}>
      <section className={styles.hero} aria-labelledby="talk-title">
        <div className="relative z-10">
          <h1 id="talk-title">{m.title}</h1>
          <p>{m.intro}</p>
          <div className={styles.actions}>
            <StartForm className={styles.primary}>
              <PlusIcon className="size-5 shrink-0" /> {m.newConversation}
            </StartForm>
            <Link href="/explore" className={styles.secondary}>
              <CompassIcon className="size-5 shrink-0" /> {m.chooseTopic}
            </Link>
          </div>
        </div>
        <div className={styles.opi} aria-hidden="true">
          <Orb size={68} face className="sm:hidden" />
          <Orb size={146} face className="hidden sm:block" />
        </div>
      </section>

      <section aria-labelledby="talk-history" className={styles.history}>
        <h2 id="talk-history">{m.yourConversations}</h2>
        {groups.size > 0 ? (
          <div className="grid gap-5">
            {[...groups].map(([day, group]) => (
              <div key={day}>
                <h3 className={styles.day}>
                  {day === today ? m.today : day === yesterday ? m.yesterday : date.format(new Date(group[0].updated_at))}
                </h3>
                <ul className={styles.list}>
                  {group.map((c) => {
                    const topic = getTopic(c.topic, locale)?.title;
                    const label = topic ?? (c.mode === "talk" ? null : m.modes[c.mode]);
                    return (
                      <li key={c.id} className={styles.row}>
                        <Link href={`/talk/${c.id}`} className={styles.thread}>
                          <span className={styles.icon} aria-hidden="true"><TalkIcon className="size-5" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{c.title}</span>
                            {label && label !== c.title && <span className="block truncate text-xs text-ink-soft">{label}</span>}
                          </span>
                          <time dateTime={c.updated_at} className={styles.time}>{time.format(new Date(c.updated_at))}</time>
                          <span aria-hidden="true"><ArrowIcon className="size-4 text-ink-soft" /></span>
                        </Link>
                        <ConfirmForm action={deleteConversation} hidden={{ id: c.id }} question={chatMessages[locale].confirmDelete} className="pr-1">
                          <button type="submit" aria-label={m.delete} title={m.delete} className={styles.remove}>
                            <TrashIcon className="size-[18px]" />
                          </button>
                        </ConfirmForm>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.icon} aria-hidden="true"><TalkIcon className="size-5" /></span>
            <p>{m.empty}</p>
          </div>
        )}
      </section>
    </div>
  );
}
