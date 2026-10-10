import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { latestPlan } from "@/lib/plan-data";
import { gameKind } from "@/lib/plan";
import { getLocale } from "@/i18n/server";
import { planMessages } from "@/i18n/plan";
import { BackIcon } from "@/components/icons";
import { PersonalGame } from "@/components/plan/PersonalGame";

export default async function PersonalGamePage({ params }: { params: Promise<{ index: string }> }) {
  const { index } = await params;
  const { supabase } = await requireUser();
  const locale = await getLocale();
  const m = planMessages[locale].page;
  const stored = await latestPlan(supabase);
  const i = Number(index);
  const game = stored?.plan.games[i];
  if (!stored || !game) notFound();

  return (
    <div className="animate-fade">
      <Link href="/play/me" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {m.backToPlan}
      </Link>
      <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">{gameKind(locale)[game.type].label}</p>
      <h1 className="mt-1 font-serif text-[30px] leading-tight text-ink sm:text-[36px]">{game.title}</h1>
      <p className="mt-2 text-[15px] text-ink-soft">{game.intro}</p>
      <div className="mt-8">
        <PersonalGame planId={stored.id} index={i} game={game} />
      </div>
    </div>
  );
}
