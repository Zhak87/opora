import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { myClients, myPsychologist } from "@/lib/pro";
import { listSessions } from "@/lib/sessions";
import { getLocale } from "@/i18n/server";
import { proMessages } from "@/i18n/pro";
import { cabinetMessages } from "@/i18n/cabinet";
import { PageHeader } from "@/components/ui";
import { Stat, StatusPill } from "@/components/pro/bits";
import { ArrowIcon } from "@/components/icons";

const DAY = 86_400_000;

// «Ещё»: всё, что нужно не каждый день — анкета, приглашения, часы приёма, оплаты и статистика.
export default async function ProMore() {
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = proMessages[locale];
  const cm = cabinetMessages[locale].more;
  const me = (await myPsychologist(supabase, user!.id))!;
  const now = Date.now();
  const [clients, { data: invites }, past] = await Promise.all([
    myClients(supabase, me.user_id),
    supabase.from("invites").select("id, views").eq("psychologist_id", me.user_id),
    listSessions(supabase, { psychologist: me.user_id, to: new Date(now).toISOString() }, 2000),
  ]);
  const held = past.filter((s) => s.status !== "cancelled" && !s.no_show && Date.parse(s.ends_at) < now);
  const unpaid = past.filter((s) => s.status !== "cancelled" && Date.parse(s.ends_at) < now && Date.parse(s.ends_at) > now - 90 * DAY && s.payment_status !== "paid").length;
  const hours = Math.round(held.reduce((sum, s) => sum + (Date.parse(s.ends_at) - Date.parse(s.starts_at)), 0) / 3_600_000);
  const active = clients.filter((c) => c.link.status === "active").length;
  const views = (invites ?? []).reduce((sum, i) => sum + (i.views ?? 0), 0);
  const fromInvites = clients.filter((c) => c.link.source === "invite").length;

  const items = [
    { href: "/pro/profile", title: cm.profile, hint: cm.profileHint, pill: true },
    { href: "/pro/schedule/settings", title: cm.hours, hint: cm.hoursHint },
    { href: "/pro/payments", title: cm.payments, hint: cm.paymentsHint(unpaid) },
    { href: "/pro/invites", title: cm.invites, hint: cm.invitesHint },
    ...(me.status === "approved" ? [{ href: `/p/${me.slug}`, title: cm.publicPage, hint: cm.publicHint }] : []),
    { href: "/", title: cm.personal, hint: cm.personalHint },
  ];

  return (
    <div className="stagger">
      <PageHeader title={cm.title} />
      <ul className="mb-10 divide-y divide-line/70 overflow-hidden rounded-[24px] bg-paper shadow-soft" data-more>
        {items.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-sand/30">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-[15px] text-ink">
                  {it.title}
                  {it.pill && <StatusPill status={me.status} label={m.status[me.status]} />}
                </span>
                <span className="mt-0.5 block text-sm text-ink-faint">{it.hint}</span>
              </span>
              <ArrowIcon className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 px-1 text-[15px] text-ink-soft">{cm.stats}</h2>
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        <Stat value={active} label={m.overview.activeClients(active)} tone="bg-gradient-to-br from-paper to-sage-soft/70" />
        <Stat value={hours} label={cm.practiceHours(hours)} tone="bg-gradient-to-br from-paper to-lilac-soft/70" />
        <Stat value={views} label={m.overview.invitesViews(views)} tone="bg-gradient-to-br from-paper to-mist/70" />
        <Stat value={fromInvites} label={m.overview.fromInvites(fromInvites)} tone="bg-gradient-to-br from-paper to-sand/80" />
      </section>
    </div>
  );
}
