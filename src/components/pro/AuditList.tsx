import type { AuditRow } from "@/lib/pro";
import { careMessages } from "@/i18n/care";
import type { Locale } from "@/i18n/config";
import { INTL } from "@/i18n/config";

// Журнал действий: кто, что и когда. Видят клиент (про свои данные) и специалист (про свои действия).
export function AuditList({ rows, locale, me, empty }: { rows: AuditRow[]; locale: Locale; me: string; empty: string }) {
  const m = careMessages[locale];
  if (!rows.length) return <p className="text-sm text-ink-faint">{empty}</p>;
  return (
    <ol className="relative space-y-4 border-l border-line pl-5">
      {rows.map((r) => {
        const who = r.actor_id === me ? m.by.you : r.actor_id === r.psychologist_id ? m.by.psychologist : r.actor_id === r.client_id ? m.by.client : m.by.admin;
        const scope = r.details?.scope as keyof typeof m.scopes | undefined;
        const what = r.details?.what ? m.whatViewed[r.details.what] ?? r.details.what : "";
        return (
          <li key={r.id} className="relative">
            <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-lilac" />
            <p className="text-sm text-ink">
              {m.actions[r.action] ?? r.action}
              {scope && m.scopes[scope] ? `: ${m.scopes[scope].title.toLowerCase()}` : ""}
              {what ? ` ${what}` : ""}
            </p>
            <p className="text-xs text-ink-faint">
              {new Date(r.at).toLocaleString(INTL[locale], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {who}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
