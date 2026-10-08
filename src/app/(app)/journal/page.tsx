import { requireUser } from "@/lib/supabase/server";
import { deleteJournalEntry, reflectOnJournal } from "@/lib/actions";
import { JOURNAL_KINDS, type JournalKind } from "@/lib/content";
import { JournalComposer } from "@/components/JournalComposer";
import { PageHeader, toneBg } from "@/components/ui";
import { SparkIcon, TrashIcon } from "@/components/icons";

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { supabase } = await requireUser();
  const { data: entries } = await supabase
    .from("journal_entries")
    .select("id, kind, content, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const groups = new Map<string, NonNullable<typeof entries>>();
  for (const e of entries ?? []) {
    const key = new Date(e.created_at).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      weekday: "long",
      timeZone: "Europe/Moscow",
    });
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  return (
    <>
      <PageHeader title="Дневник">Место для мыслей, событий, благодарностей и целей. Только для вас.</PageHeader>

      <JournalComposer key={q ?? ""} question={q} />

      {entries && entries.length > 0 && (
        <form action={reflectOnJournal} className="mt-4">
          <button
            type="submit"
            className="flex w-full items-center gap-4 rounded-[24px] bg-gradient-to-r from-lilac-soft to-mist px-5 py-4 text-left transition hover:shadow-soft"
          >
            <SparkIcon className="h-5 w-5 shrink-0 text-lilac-deep" />
            <span>
              <span className="block text-[15px] text-ink">Поразмышлять над неделей</span>
              <span className="block text-sm text-ink-soft">Собеседник поможет заметить важное в ваших записях</span>
            </span>
          </button>
        </form>
      )}

      <div className="mt-12 space-y-10">
        {[...groups.entries()].map(([date, items]) => (
          <section key={date}>
            <h2 className="mb-3 px-1 text-sm first-letter:uppercase text-ink-faint">{date}</h2>
            <ul className="stagger space-y-3">
              {items.map((e) => {
                const kind = JOURNAL_KINDS[e.kind as JournalKind] ?? JOURNAL_KINDS.thought;
                return (
                  <li key={e.id} className="group rounded-[24px] border border-line/70 bg-paper/75 p-5 sm:p-6">
                    <div className="mb-3 flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs text-ink ${toneBg[kind.tone]}`}>{kind.label}</span>
                      <span className="text-xs text-ink-faint">
                        {new Date(e.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap font-serif text-[16.5px] leading-[1.7] text-ink">{e.content}</p>
                    <div className="mt-4 flex items-center gap-1 sm:opacity-60 sm:transition sm:group-hover:opacity-100">
                      <form action={reflectOnJournal}>
                        <input type="hidden" name="id" value={e.id} />
                        <button className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-ink-soft transition hover:bg-lilac-soft hover:text-ink">
                          <SparkIcon className="h-4 w-4" /> Поразмышлять
                        </button>
                      </form>
                      <form action={deleteJournalEntry} className="ml-auto">
                        <input type="hidden" name="id" value={e.id} />
                        <button aria-label="Удалить запись" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-faint transition hover:bg-[#fbf1ec] hover:text-[#a0614f]">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
