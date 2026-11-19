import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { INTL } from "@/i18n/config";
import { playMessages } from "@/i18n/play";
import { common } from "@/i18n/common";
import { cleanWheel, readState } from "@/lib/practice-state";
import { StepCard } from "@/components/games/OneStep";
import { PageHeader } from "@/components/ui";
import { ArrowIcon, BackIcon } from "@/components/icons";

// Планирование (аудит 19.11.2026): колесо жизни с историей, компас ценностей для конкретного решения
// и «Один шаг». Это инструменты периодического обзора, а не ежедневные игры.
export default async function PlanningPage() {
  const { supabase } = await requireUser();
  const locale = await getLocale();
  const p = playMessages[locale].planning;
  const wheel = cleanWheel((await readState(supabase, "wheel"))?.data);
  const last = wheel.list.at(-1);
  const cards = [
    { href: "/tools/wheel", ...p.wheel, extra: last ? p.last(new Date(last.at).toLocaleDateString(INTL[locale], { day: "numeric", month: "long" })) : null, bg: "linear-gradient(150deg,#e9f7f0,#cfe3ff)", dark: false },
    { href: "/tools/compass", ...p.compass, extra: null, bg: "radial-gradient(120% 100% at 50% 110%,#4f5aa6,#2a2762 50%,#12133a)", dark: true },
    { href: "/tools/step", ...p.step, extra: null, bg: "linear-gradient(170deg,#dcebfb,#9fc0ef)", dark: false },
  ];
  return (
    <>
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {common[locale].nav.home}
      </Link>
      <PageHeader title={p.title}>{p.intro}</PageHeader>
      <div className="space-y-6">
        <StepCard />
        <div className="stagger grid gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={`group flex min-h-[170px] flex-col justify-end rounded-[28px] p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lift ${c.dark ? "text-paper" : "text-ink"}`}
              style={{ background: c.bg }}
            >
              <span className="font-serif text-[22px] leading-tight">{c.title}</span>
              <span className={`mt-1 text-[13.5px] leading-snug ${c.dark ? "text-paper/75" : "text-ink-soft"}`}>{c.hint}</span>
              {c.extra && <span className="mt-2 text-[12px] text-ink-faint">{c.extra}</span>}
              <ArrowIcon className="mt-3 h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
