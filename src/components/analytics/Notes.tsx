import { INTL, type Locale } from "@/i18n/config";
import { analyticsMessages } from "@/i18n/analytics";
import type { Note } from "@/lib/analytics";
import { NoteForm, NoteItem } from "./Forms";

// Рабочие заметки психолога: форма и список. Видит только автор (RLS).
export function NotesPanel({ notes, client, session, locale, tz }: { notes: Note[]; client: string; session?: string; locale: Locale; tz: string }) {
  const m = analyticsMessages[locale].notes;
  const date = (iso: string) =>
    new Intl.DateTimeFormat(INTL[locale], { timeZone: tz, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-medium text-ink">{m.title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-faint">{m.lead}</p>
      </div>
      <NoteForm client={client} session={session} kind={session ? "session" : "note"} />
      {notes.length ? (
        <ul className="space-y-2.5">
          {notes.map((n) => (
            <NoteItem key={n.id} note={n} date={date(n.created_at)} sessionLabel={!session && n.session_id ? m.forSession : undefined} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-faint">{m.empty}</p>
      )}
    </div>
  );
}
