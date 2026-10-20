import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { myClients, myPsychologist } from "@/lib/pro";
import { relativeDate } from "@/lib/format";
import { getLocale } from "@/i18n/server";
import { proMessages } from "@/i18n/pro";
import { careMessages } from "@/i18n/care";
import { Avatar, Chip, Stat, StatusPill } from "@/components/pro/bits";
import { ArrowIcon } from "@/components/icons";
import { buttonStyles } from "@/components/ui";

export default async function ProOverview() {
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = proMessages[locale];
  const scopes = careMessages[locale].scopes;
  const me = (await myPsychologist(supabase, user!.id))!;
  const [clients, { data: invites }] = await Promise.all([
    myClients(supabase, me.user_id),
    supabase.from("invites").select("id, views").eq("psychologist_id", me.user_id),
  ]);
  const active = clients.filter((c) => c.link.status === "active");
  const views = (invites ?? []).reduce((sum, i) => sum + (i.views ?? 0), 0);
  const fromInvites = clients.filter((c) => c.link.source === "invite").length;

  return (
    <div className="stagger">
      <header className="mb-8 sm:mb-10">
        <p className="mb-2 text-sm text-ink-soft">{m.cabinet}</p>
        <h1 className="font-serif text-[32px] leading-tight text-ink sm:text-[40px]">{m.overview.hello(me.full_name.split(" ")[0] ?? "")}</h1>
      </header>

      <section className="mb-6 flex flex-col gap-4 rounded-[28px] border border-line/70 bg-gradient-to-r from-paper via-paper to-lilac-soft/60 p-6 shadow-soft sm:flex-row sm:items-center sm:p-7">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <p className="text-[15px] font-medium text-ink">{m.overview.profileStatus}</p>
            <StatusPill status={me.status} label={m.status[me.status]} />
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">{m.statusHint[me.status]}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {me.status === "approved" && (
            <Link href={`/p/${me.slug}`} className={`${buttonStyles.ghost} h-11`}>
              {m.overview.publicLink}
            </Link>
          )}
          <Link href="/pro/profile" className={`${buttonStyles.soft} h-11`}>
            {m.overview.openProfile}
          </Link>
        </div>
      </section>

      <section className="mb-10 grid grid-cols-3 gap-2 sm:gap-4">
        <Stat value={active.length} label={m.overview.activeClients(active.length)} tone="bg-gradient-to-br from-paper to-sage-soft/70" />
        <Stat value={views} label={m.overview.invitesViews(views)} tone="bg-gradient-to-br from-paper to-mist/70" />
        <Stat value={fromInvites} label={m.overview.fromInvites(fromInvites)} tone="bg-gradient-to-br from-paper to-sand/80" />
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className="text-[15px] text-ink-soft">{m.overview.recentClients}</h2>
          {clients.length > 0 && (
            <Link href="/pro/clients" className="text-sm text-ink-faint hover:text-ink">
              {m.overview.allClients}
            </Link>
          )}
        </div>
        {clients.length ? (
          <ul className="divide-y divide-line/70 overflow-hidden rounded-[24px] border border-line/70 bg-paper/75">
            {clients.slice(0, 5).map((c) => (
              <li key={c.link.id}>
                <Link href={`/pro/clients/${c.link.client_id}`} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-sand/40">
                  <Avatar name={c.name ?? "?"} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-ink">{c.name ?? m.clients.noName}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      {c.scopes.length ? (
                        c.scopes.map((s) => (
                          <Chip key={s} tone="bg-sage-soft/80 text-sage-deep">
                            {scopes[s].title}
                          </Chip>
                        ))
                      ) : (
                        <span className="text-xs text-ink-faint">{m.clients.sharesNothing}</span>
                      )}
                    </span>
                  </span>
                  <span className="hidden text-xs text-ink-faint sm:block">{relativeDate(c.link.activated_at ?? c.link.created_at, locale)}</span>
                  <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[24px] border border-dashed border-line px-6 py-10 text-center text-[15px] leading-relaxed text-ink-soft">
            {me.status === "approved" ? m.overview.noClientsApproved : m.overview.noClients}
          </p>
        )}
      </section>

      <p className="text-center text-sm text-ink-faint">{m.overview.soon}</p>
    </div>
  );
}
