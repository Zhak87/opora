import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { myClients } from "@/lib/pro";
import { relativeDate } from "@/lib/format";
import { getLocale } from "@/i18n/server";
import { proMessages } from "@/i18n/pro";
import { careMessages } from "@/i18n/care";
import { PageHeader } from "@/components/ui";
import { Avatar, Chip } from "@/components/pro/bits";
import { ArrowIcon } from "@/components/icons";

export default async function ClientsPage() {
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = proMessages[locale].clients;
  const scopes = careMessages[locale].scopes;
  const clients = await myClients(supabase, user!.id, true);
  const current = clients.filter((c) => c.link.status !== "ended");
  const ended = clients.filter((c) => c.link.status === "ended");

  return (
    <>
      <PageHeader title={m.title} />
      {current.length ? (
        <ul className="stagger grid gap-3 lg:grid-cols-2">
          {current.map((c) => (
            <li key={c.link.id}>
              <Link
                href={`/pro/clients/${c.link.client_id}`}
                className="group flex h-full items-start gap-4 rounded-[24px] border border-line/70 bg-paper/80 p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <Avatar name={c.name ?? "?"} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-medium text-ink">{c.name ?? m.noName}</span>
                  <span className="text-xs text-ink-faint">{m.since(relativeDate(c.link.activated_at ?? c.link.created_at, locale))}</span>
                  <span className="mt-3 flex flex-wrap gap-1.5">
                    {c.scopes.length ? (
                      c.scopes.map((s) => (
                        <Chip key={s} tone="bg-sage-soft/80 text-sage-deep">
                          {scopes[s].title}
                        </Chip>
                      ))
                    ) : (
                      <span className="text-xs text-ink-faint">{m.sharesNothing}</span>
                    )}
                  </span>
                </span>
                <ArrowIcon className="mt-1 h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-[24px] border border-dashed border-line px-6 py-10 text-center text-[15px] text-ink-soft">{m.empty}</p>
      )}

      {ended.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 px-1 text-[15px] text-ink-soft">{m.ended}</h2>
          <ul className="divide-y divide-line/70 rounded-[24px] border border-line/70 bg-paper/50">
            {ended.map((c) => (
              <li key={c.link.id} className="flex items-center gap-4 px-5 py-3 text-sm text-ink-faint">
                <span className="flex-1">{m.noName}</span>
                <span>{c.link.ended_at ? relativeDate(c.link.ended_at, locale) : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
