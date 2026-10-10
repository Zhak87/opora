import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { latestPlan } from "@/lib/plan-data";
import { gameKind } from "@/lib/plan";
import { getLocale } from "@/i18n/server";
import { INTL } from "@/i18n/config";
import { planMessages } from "@/i18n/plan";
import { PageHeader, toneBg } from "@/components/ui";
import { ArrowIcon, BackIcon } from "@/components/icons";
import { TipCheck } from "@/components/plan/TipCheck";
import { CreatePlanButton } from "@/components/plan/CreatePlanButton";

export const maxDuration = 60;

export default async function MyPlanPage() {
  const { supabase } = await requireUser();
  const locale = await getLocale();
  const m = planMessages[locale].page;
  const GAME_KIND = gameKind(locale);
  const stored = await latestPlan(supabase);
  if (!stored) redirect("/play");
  const { plan, progress, id } = stored;
  const made = new Date(stored.created_at).toLocaleDateString(INTL[locale], { day: "numeric", month: "long" });

  return (
    <>
      <Link href="/play" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {m.backToGames}
      </Link>
      <PageHeader eyebrow={m.made(made)} title={m.title}>
        {plan.summary}
      </PageHeader>
      {plan.focus.length > 0 && (
        <div className="-mt-4 mb-10 flex flex-wrap gap-2">
          {plan.focus.map((f) => (
            <span key={f} className="rounded-full bg-lilac-soft px-4 py-1.5 text-sm text-ink">
              {f}
            </span>
          ))}
        </div>
      )}

      <section className="mb-12">
        <h2 className="font-serif text-[22px] text-ink">{m.gamesTitle}</h2>
        <p className="mb-5 mt-1 text-[15px] text-ink-soft">{m.gamesLead}</p>
        <div className="stagger grid gap-3 sm:grid-cols-2 sm:gap-4">
          {plan.games.map((g, i) => (
            <Link
              key={i}
              href={`/play/me/${i}`}
              className={`group flex items-center gap-4 rounded-[26px] ${toneBg[GAME_KIND[g.type].tone]} p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-6`}
            >
              <span className="flex-1">
                <span className="block text-xs uppercase tracking-[0.14em] text-ink-faint">{GAME_KIND[g.type].label}</span>
                <span className="mt-1 block text-[17px] font-medium text-ink">{g.title}</span>
                <span className="mt-1 block text-[13.5px] leading-snug text-ink-soft">{g.intro}</span>
                {(progress.games?.[i] ?? 0) > 0 && (
                  <span className="mt-2 block text-xs text-sage-deep">{m.played(progress.games?.[i] ?? 0)}</span>
                )}
              </span>
              <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="font-serif text-[22px] text-ink">{m.tipsTitle}</h2>
        <p className="mb-5 mt-1 text-[15px] text-ink-soft">
          {m.tipsLead}
        </p>
        <div className="stagger space-y-3">
          {plan.tips.map((t, i) => (
            <TipCheck key={i} planId={id} index={i} tip={t} days={progress.tips?.[i] ?? []} />
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-line/70 bg-paper/70 p-6">
        <p className="text-[15px] text-ink">{m.renewTitle}</p>
        <p className="mb-4 mt-1 text-sm text-ink-soft">
          {m.renewLead}
        </p>
        <CreatePlanButton label={m.renewButton} variant="soft" />
      </section>
    </>
  );
}
