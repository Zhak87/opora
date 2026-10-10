import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { relativeDate } from "@/lib/format";
import { getTopic } from "@/lib/topics";
import { getLocale } from "@/i18n/server";
import { topicsTalk } from "@/i18n/topics";
import { deleteConversation } from "@/lib/actions";
import { StartForm } from "@/components/StartForm";
import { PageHeader, buttonStyles } from "@/components/ui";
import { PlusIcon, TrashIcon, CompassIcon } from "@/components/icons";

export default async function TalkPage() {
  const { supabase } = await requireUser();
  const locale = await getLocale();
  const m = topicsTalk[locale];
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, title, mode, topic, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <>
      <PageHeader title={m.title}>{m.intro}</PageHeader>

      <div className="mb-10 flex flex-col gap-3 sm:flex-row">
        <StartForm className={`${buttonStyles.primary} h-14 px-7 text-base`}>
          <PlusIcon className="h-5 w-5" /> {m.newConversation}
        </StartForm>
        <Link href="/explore" className={`${buttonStyles.soft} h-14 px-7 text-base`}>
          <CompassIcon className="h-5 w-5" /> {m.chooseTopic}
        </Link>
      </div>

      {conversations && conversations.length > 0 ? (
        <section>
          <h2 className="mb-3 px-1 text-[15px] text-ink-soft">{m.yourConversations}</h2>
          <ul className="stagger space-y-2">
            {conversations.map((c) => {
              const label = getTopic(c.topic, locale)?.title ?? m.modes[c.mode] ?? m.conversation;
              return (
                <li key={c.id} className="group flex items-center rounded-[22px] border border-line/70 bg-paper/75 transition hover:shadow-soft">
                  <Link href={`/talk/${c.id}`} className="min-w-0 flex-1 px-5 py-4">
                    <span className="block truncate text-[15px] text-ink">{c.title}</span>
                    <span className="mt-0.5 block text-xs text-ink-faint">
                      {label} · {relativeDate(c.updated_at, locale)}
                    </span>
                  </Link>
                  <form action={deleteConversation} className="pr-2">
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      aria-label={m.delete}
                      title={m.delete}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-ink-faint opacity-100 transition hover:bg-[#fbf1ec] hover:text-[#a0614f] sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                    >
                      <TrashIcon className="h-[18px] w-[18px]" />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className="rounded-[24px] border border-dashed border-line px-6 py-10 text-center text-[15px] text-ink-soft">
          {m.empty}
        </p>
      )}
    </>
  );
}
