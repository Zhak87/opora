import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/config";
import { getTimeZone } from "@/lib/tz";
import { balanceAreas, myAssessments, myCheckins, myGoals, periodRange, toPeriod, type Period } from "@/lib/wellbeing";
import { getLocale } from "@/i18n/server";
import { wellbeingMessages } from "@/i18n/wellbeing";
import { Card, PageHeader } from "@/components/ui";
import { BalanceForm, CheckinForm, GoalForm } from "@/components/wellbeing/Forms";
import { BalancePanel, GoalList, TrendPanel } from "@/components/wellbeing/Panels";

type Supa = SupabaseClient;
const TABS = ["checkin", "balance", "goals"] as const;
type Tab = (typeof TABS)[number];

// Моё состояние: отметка дня и динамика, колесо баланса, цели.
export default async function WellbeingPage({ searchParams }: { searchParams: Promise<{ tab?: string; p?: string }> }) {
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "checkin";
  const period = toPeriod(sp.p);
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = wellbeingMessages[locale];
  const tz = await getTimeZone();
  const range = periodRange(period, tz);
  const href = (t: Tab, p: Period = period) => `/wellbeing?tab=${t}${p !== 30 ? `&p=${p}` : ""}`;

  return (
    <>
      <PageHeader title={m.title}>{m.lead}</PageHeader>
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-full bg-sand/60 p-1 [scrollbar-width:none]" aria-label={m.title}>
        {TABS.map((t) => (
          <Link
            key={t}
            href={href(t)}
            aria-current={t === tab ? "page" : undefined}
            className={`flex-1 whitespace-nowrap rounded-full px-4 py-2 text-center text-sm transition ${t === tab ? "bg-paper text-ink shadow-soft" : "text-ink-soft hover:text-ink"}`}
          >
            {m.tabs[t]}
          </Link>
        ))}
      </nav>
      <div className="stagger space-y-5">
        {tab === "checkin" && (
          <CheckinTab supabase={supabase} userId={user!.id} range={range} period={period} locale={locale} href={(p) => href("checkin", p)} />
        )}
        {tab === "balance" && <BalanceTab supabase={supabase} userId={user!.id} locale={locale} />}
        {tab === "goals" && <GoalsTab supabase={supabase} userId={user!.id} locale={locale} />}
        <p className="px-2 text-center text-xs leading-relaxed text-ink-faint">{m.notClinical}</p>
      </div>
    </>
  );
}

async function CheckinTab({
  supabase,
  userId,
  range: r,
  period: p,
  locale: l,
  href: h,
}: {
  supabase: Supa;
  userId: string;
  range: ReturnType<typeof periodRange>;
  period: Period;
  locale: Locale;
  href: (p: Period) => string;
}) {
  const m = wellbeingMessages[l];
  const rows = await myCheckins(supabase, userId, r.prevFrom);
  const today = rows.find((x) => x.day === r.today) ?? null;
  return (
    <>
      <Card className="p-6 sm:p-7">
        <h2 className="mb-5 font-serif text-[24px] text-ink">{m.checkin.today}</h2>
        <CheckinForm today={today} />
      </Card>
      <Card className="p-6 sm:p-7">
        <TrendPanel rows={rows} period={p} from={r.from} days={r.days} locale={l} href={h} />
      </Card>
    </>
  );
}

async function BalanceTab({ supabase, userId, locale: l }: { supabase: Supa; userId: string; locale: Locale }) {
  const m = wellbeingMessages[l];
  const list = await myAssessments(supabase, userId);
  return (
    <>
      <Card className="p-6 sm:p-7">
        <h2 className="font-serif text-[24px] text-ink">{m.balance.title}</h2>
        <p className="mb-5 mt-2 text-sm leading-relaxed text-ink-soft">{m.balance.intro}</p>
        <BalanceForm initial={list[0] ? balanceAreas(list[0]) : []} />
      </Card>
      {list.length > 0 && (
        <Card className="p-6 sm:p-7">
          <BalancePanel list={list} locale={l} />
        </Card>
      )}
    </>
  );
}

async function GoalsTab({ supabase, userId, locale: l }: { supabase: Supa; userId: string; locale: Locale }) {
  const m = wellbeingMessages[l];
  const goals = await myGoals(supabase, userId);
  return (
    <>
      <Card className="p-6 sm:p-7">
        <h2 className="font-serif text-[24px] text-ink">{m.goals.add}</h2>
        <p className="mb-5 mt-2 text-sm text-ink-soft">{m.goals.intro}</p>
        <GoalForm />
      </Card>
      {goals.length ? <GoalList goals={goals} locale={l} editable /> : <p className="text-center text-sm text-ink-faint">{m.goals.empty}</p>}
    </>
  );
}
