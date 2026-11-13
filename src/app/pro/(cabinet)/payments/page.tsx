import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { formatPrice, myClients, myPsychologist } from "@/lib/pro";
import { listSessions, type Session } from "@/lib/sessions";
import { dayLabel, timeOf } from "@/lib/time";
import { INTL } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { proMessages } from "@/i18n/pro";
import { cabinetMessages } from "@/i18n/cabinet";
import { common } from "@/i18n/common";
import { PageHeader } from "@/components/ui";
import { PaidToggle } from "@/components/pro/Marks";
import { BackIcon } from "@/components/icons";

const DAY = 86_400_000;

// Оплаты: онлайн-оплаты пока нет, психолог сам отмечает, какие встречи оплачены.
export default async function ProPayments() {
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const cm = cabinetMessages[locale];
  const noName = proMessages[locale].clients.noName;
  const me = (await myPsychologist(supabase, user!.id))!;
  const tz = me.timezone;
  const now = Date.now();
  const [clients, rows] = await Promise.all([
    myClients(supabase, me.user_id, true),
    listSessions(supabase, { psychologist: me.user_id, from: new Date(now - 90 * DAY).toISOString(), to: new Date(now).toISOString() }, 1000),
  ]);
  const names = Object.fromEntries(clients.map((c) => [c.link.client_id, c.name ?? noName]));
  // К оплате: прошедшие встречи (включая «не пришёл») и поздние отмены.
  const billable = rows.filter((s) => (s.status !== "cancelled" && Date.parse(s.ends_at) < now) || (s.status === "cancelled" && s.late_cancel)).reverse();
  const unpaid = billable.filter((s) => s.payment_status !== "paid");
  const paid = billable.filter((s) => s.payment_status === "paid" && Date.parse(s.paid_at ?? s.starts_at) > now - 30 * DAY);
  const total = (list: Session[]) => {
    const by = new Map<string, number>();
    for (const s of list) if (s.price != null) by.set(s.currency ?? "KZT", (by.get(s.currency ?? "KZT") ?? 0) + Number(s.price));
    return [...by.entries()].map(([cur, sum]) => formatPrice(sum, cur, INTL[locale])).join(" + ");
  };

  const list = (items: Session[], empty: string, attr: string) =>
    items.length ? (
      <ul className="divide-y divide-line/70 overflow-hidden rounded-[24px] bg-paper shadow-soft" {...{ [attr]: "" }}>
        {items.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
            <Link href={`/pro/sessions/${s.id}`} className="min-w-0 flex-1 hover:text-lilac-deep">
              <span className="block truncate text-[15px] text-ink">{names[s.client_id] ?? noName}</span>
              <span className="block text-xs text-ink-faint">
                {dayLabel(s.starts_at, tz, locale)}, {timeOf(s.starts_at, tz, INTL[locale])}
                {s.no_show && ` · ${cm.attend.noShow}`}
                {s.late_cancel && ` · ${cm.attend.lateCancel}`}
              </span>
            </Link>
            {s.price != null && <span className="text-sm text-ink-soft">{formatPrice(Number(s.price), s.currency ?? "KZT", INTL[locale])}</span>}
            <PaidToggle session={s} locale={locale} compact />
          </li>
        ))}
      </ul>
    ) : (
      <p className="rounded-[24px] border border-dashed border-line px-6 py-8 text-center text-sm text-ink-faint">{empty}</p>
    );

  return (
    <>
      <Link href="/pro/more" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {common[locale].back}
      </Link>
      <PageHeader title={cm.pay.title}>{cm.pay.lead}</PageHeader>
      <section className="mb-10">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className="text-[15px] text-ink-soft">{cm.pay.unpaidTitle}</h2>
          {total(unpaid) && <span className="text-sm text-ink-faint">{cm.pay.total(total(unpaid))}</span>}
        </div>
        {list(unpaid, cm.pay.noneUnpaid, "data-unpaid")}
      </section>
      <section>
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className="text-[15px] text-ink-soft">{cm.pay.paidTitle}</h2>
          {total(paid) && <span className="text-sm text-ink-faint">{cm.pay.total(total(paid))}</span>}
        </div>
        {list(paid, cm.pay.nonePaid, "data-paid-list")}
      </section>
    </>
  );
}
