import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { lastMessages, unreadByPeer } from "@/lib/care-chat";
import { myClients } from "@/lib/pro";
import { relativeDate } from "@/lib/format";
import { getLocale } from "@/i18n/server";
import { careChatMessages as chatMessages } from "@/i18n/care-chat";
import { proMessages } from "@/i18n/pro";
import { PageHeader } from "@/components/ui";
import { Avatar } from "@/components/pro/bits";
import { ArrowIcon } from "@/components/icons";

// Все переписки психолога: сначала с новыми сообщениями, потом по свежести.
export default async function ProMessages() {
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = chatMessages[locale];
  const pm = proMessages[locale];
  const [clients, last, unread] = await Promise.all([myClients(supabase, user!.id), lastMessages(supabase, user!.id), unreadByPeer(supabase)]);
  const rows = clients
    .map((c) => ({ c, last: last.get(c.link.client_id), unread: unread.get(c.link.client_id) ?? 0 }))
    .sort((a, b) => b.unread - a.unread || (b.last?.created_at ?? b.c.link.created_at).localeCompare(a.last?.created_at ?? a.c.link.created_at));

  return (
    <>
      <PageHeader title={m.messages} />
      {rows.length ? (
        <ul className="stagger divide-y divide-line/70 overflow-hidden rounded-[24px] border border-line/70 bg-paper/75">
          {rows.map(({ c, last: msg, unread: n }) => (
            <li key={c.link.id}>
              <Link href={`/pro/messages/${c.link.client_id}`} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-sand/40">
                <Avatar name={c.name ?? "?"} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className={`truncate text-[15px] ${n ? "font-medium text-ink" : "text-ink"}`}>{c.name ?? pm.clients.noName}</span>
                    {msg && <span className="shrink-0 text-xs text-ink-faint">{relativeDate(msg.created_at, locale)}</span>}
                  </span>
                  <span className={`block truncate text-sm ${n ? "text-ink" : "text-ink-soft"}`}>
                    {msg ? `${msg.sender_id === user!.id ? `${m.you}: ` : ""}${msg.body}` : <span className="text-ink-faint">{m.emptyPro}</span>}
                  </span>
                </span>
                {n > 0 && <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-lilac-deep px-2 text-xs text-paper">{n}</span>}
                <ArrowIcon className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-[24px] border border-dashed border-line px-6 py-10 text-center text-[15px] text-ink-soft">{m.noConversations}</p>
      )}
    </>
  );
}
