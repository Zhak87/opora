import Link from "next/link";
import { getGames } from "@/lib/games";
import { PageHeader, toneBg } from "@/components/ui";
import { ArrowIcon, BackIcon } from "@/components/icons";
import { requireUser } from "@/lib/supabase/server";
import { latestPlan } from "@/lib/plan-data";
import { gameKind } from "@/lib/plan";
import { CreatePlanButton } from "@/components/plan/CreatePlanButton";
import { getLocale } from "@/i18n/server";
import { gamesMessages } from "@/i18n/games";
import { common } from "@/i18n/common";
import type { Locale } from "@/i18n/config";

export const maxDuration = 60;

const GROUPS = ["calm", "self"] as const;

export default async function PlayPage() {
  const { supabase } = await requireUser();
  const stored = await latestPlan(supabase);
  const locale = await getLocale();
  const m = gamesMessages[locale].page;
  const games = getGames(locale);
  return (
    <>
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {common[locale].nav.home}
      </Link>
      <PageHeader title={m.title}>{m.intro}</PageHeader>
      <div className="space-y-12">
        <ForYou stored={stored} locale={locale} />
        {GROUPS.map((id) => (
          <section key={id}>
            <h2 className="font-serif text-[22px] text-ink">{m.groups[id].title}</h2>
            <p className="mb-5 mt-1 text-[15px] text-ink-soft">{m.groups[id].hint}</p>
            <div className="stagger grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {games.filter((x) => x.group === id).map((x) => (
                <Link
                  key={x.slug}
                  href={`/play/${x.slug}`}
                  className={`group flex items-center gap-4 rounded-[26px] ${toneBg[x.tone]} p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:min-h-[168px] sm:flex-col sm:items-start sm:justify-between sm:p-6`}
                >
                  <GameGlyph slug={x.slug} />
                  <span className="flex-1">
                    <span className="block text-[16px] font-medium text-ink sm:text-[17px]">{x.title}</span>
                    <span className="mt-1 block text-[13px] leading-snug text-ink-soft">{x.hint}</span>
                  </span>
                  <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink sm:hidden" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function ForYou({ stored, locale }: { stored: Awaited<ReturnType<typeof latestPlan>>; locale: Locale }) {
  const m = gamesMessages[locale].page.forYou;
  if (!stored)
    return (
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-lilac-soft via-paper to-mist p-6 shadow-soft sm:p-8">
        <span className="absolute -right-10 -top-10 h-40 w-40 animate-breathe rounded-full bg-paper/60" aria-hidden />
        <p className="relative text-xs uppercase tracking-[0.16em] text-lilac-deep">{m.eyebrow}</p>
        <h2 className="relative mt-2 font-serif text-[24px] leading-snug text-ink sm:text-[28px]">{m.title}</h2>
        <p className="relative mb-6 mt-2 max-w-lg text-[15px] leading-relaxed text-ink-soft">
          {m.body1} {m.body2}
        </p>
        <div className="relative">
          <CreatePlanButton goTo="/play/me" />
        </div>
      </section>
    );
  const { plan } = stored;
  const kinds = gameKind(locale);
  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-[22px] text-ink">{m.heading}</h2>
        <Link href="/play/me" className="shrink-0 text-sm text-ink-faint hover:text-ink">
          {m.all}
        </Link>
      </div>
      <p className="mb-5 mt-1 text-[15px] text-ink-soft">{m.sub}</p>
      <div className="stagger grid gap-3 sm:grid-cols-2 sm:gap-4">
        {plan.games.map((g, i) => (
          <Link
            key={i}
            href={`/play/me/${i}`}
            className={`group flex items-center gap-4 rounded-[26px] ${toneBg[kinds[g.type].tone]} p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-6`}
          >
            <span className="flex-1">
              <span className="block text-xs uppercase tracking-[0.14em] text-ink-faint">{kinds[g.type].label}</span>
              <span className="mt-1 block text-[16px] font-medium text-ink sm:text-[17px]">{g.title}</span>
            </span>
            <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
          </Link>
        ))}
      </div>
    </section>
  );
}

// Маленькие анимированные знаки для каждой игры.
function GameGlyph({ slug }: { slug: string }) {
  const base = "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-paper/70";
  if (slug === "bubbles")
    return (
      <span className={base} aria-hidden>
        <span className="absolute h-4 w-4 animate-breathe rounded-full border border-sky/60 bg-paper" style={{ left: 10, top: 18 }} />
        <span className="absolute h-3 w-3 animate-breathe rounded-full border border-sky/60 bg-paper [animation-delay:-2s]" style={{ left: 26, top: 10 }} />
        <span className="absolute h-2 w-2 animate-breathe rounded-full border border-sky/60 bg-paper [animation-delay:-4s]" style={{ left: 28, top: 28 }} />
      </span>
    );
  if (slug === "breath")
    return (
      <span className={base} aria-hidden>
        <span className="h-6 w-6 animate-breathe rounded-full bg-sage/70" />
      </span>
    );
  if (slug === "light")
    return (
      <span className={base} aria-hidden>
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-lilac-deep" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
          <path d="M4 16c3-6 6 2 9-4s5-3 7-5" style={{ filter: "drop-shadow(0 0 3px #b9aed6)" }} />
        </svg>
      </span>
    );
  if (slug === "values")
    return (
      <span className={base} aria-hidden>
        <span className="absolute h-7 w-5 -rotate-12 rounded-md bg-sand-deep" />
        <span className="absolute h-7 w-5 rotate-6 rounded-md border border-line bg-paper" />
      </span>
    );
  if (slug === "grounding")
    return (
      <span className={base} aria-hidden>
        <span className="font-serif text-[15px] tracking-tight text-sky-deep">5·4·3</span>
      </span>
    );
  if (slug === "jar")
    return (
      <span className={base} aria-hidden>
        <span className="relative h-7 w-6 rounded-b-lg rounded-t-md border-2 border-sand-deep">
          <span className="absolute bottom-0.5 left-0.5 h-2 w-2 animate-breathe rounded-sm bg-[#f3d9a4]" />
          <span className="absolute bottom-1 right-0.5 h-2 w-2 animate-breathe rounded-sm bg-lilac [animation-delay:-3s]" />
        </span>
      </span>
    );
  if (slug === "garden")
    return (
      <span className={base} aria-hidden>
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" strokeLinecap="round">
          {[6, 10, 14, 18].map((y) => (
            <path key={y} d={`M2 ${y} q5 -2 10 0 t10 0`} stroke="#c9b99c" strokeWidth={1.2} />
          ))}
          <ellipse cx="15" cy="11" rx="4" ry="3" fill="#8a8580" />
        </svg>
      </span>
    );
  if (slug === "strengths")
    return (
      <span className={base} aria-hidden>
        <svg viewBox="0 0 24 24" className="h-6 w-6 animate-breathe text-sage-deep" fill="currentColor">
          <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" opacity="0.8" />
        </svg>
      </span>
    );
  if (slug === "letter")
    return (
      <span className={base} aria-hidden>
        <span className="relative h-5 w-7 rounded-[4px] bg-sand-deep">
          <svg viewBox="0 0 28 20" className="absolute inset-0 h-full w-full">
            <path d="M1 2 L14 11 L27 2" fill="none" stroke="#fffdf9" strokeWidth="1.5" />
          </svg>
          <span className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-lilac-deep" />
        </span>
      </span>
    );
  if (slug === "what-if")
    return (
      <span className={base} aria-hidden>
        <span className="font-serif text-2xl text-lilac-deep">?</span>
      </span>
    );
  return (
    <span className={base} aria-hidden>
      <svg viewBox="0 0 24 24" className="h-7 w-7">
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a0 = (i / 6) * Math.PI * 2;
          const a1 = ((i + 1) / 6) * Math.PI * 2;
          const r = [8, 6, 9, 5, 7, 9][i];
          return (
            <path
              key={i}
              d={`M12 12 L${12 + r * Math.cos(a0)} ${12 + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${12 + r * Math.cos(a1)} ${12 + r * Math.sin(a1)}Z`}
              fill={["#9db894", "#b9aed6", "#d8b98f", "#8fa8bf", "#a9c7c0", "#c6b0d8"][i]}
            />
          );
        })}
      </svg>
    </span>
  );
}
