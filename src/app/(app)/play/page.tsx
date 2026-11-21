import Link from "next/link";
import { getByKind, tabKind } from "@/lib/games";
import { KindBadge } from "@/components/games/KindBadge";
import { PlayTabs } from "@/components/games/PlayTabs";
import { FeelingPicker } from "@/components/games/FeelingPicker";
import { StepCard } from "@/components/games/OneStep";
import { Sky } from "@/components/games/Sky";
import { recentRuns } from "@/lib/practice-memory";
import type { GameSlug } from "@/i18n/games";
import { PageHeader, toneBg } from "@/components/ui";
import { ArrowIcon, BackIcon } from "@/components/icons";
import { requireUser } from "@/lib/supabase/server";
import { latestPlan } from "@/lib/plan-data";
import { gameKind } from "@/lib/plan";
import { CreatePlanButton } from "@/components/plan/CreatePlanButton";
import { getLocale } from "@/i18n/server";
import { gamesMessages } from "@/i18n/games";
import { playMessages } from "@/i18n/play";
import { readState, cleanJarDraft, cleanBoundaries } from "@/lib/practice-state";
import { cleanGarden } from "@/lib/garden";
import { ENDINGS, SCENARIO_IDS } from "@/lib/boundaries";
import { common } from "@/i18n/common";
import type { Locale } from "@/i18n/config";

export const maxDuration = 60;

export default async function PlayPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { supabase } = await requireUser();
  const [stored, locale, { tab }] = await Promise.all([latestPlan(supabase), getLocale(), searchParams]);
  const m = gamesMessages[locale].page;
  const p = playMessages[locale].page;
  const games = getByKind(locale, "game");
  const practices = getByKind(locale, "practice");
  const [runs, garden, jar, bounds] = await Promise.all([
    recentRuns(supabase),
    readState(supabase, "garden"),
    readState(supabase, "thought-jar"),
    readState(supabase, "boundaries"),
  ]);
  const played = new Set(runs.map((r) => r.game));
  const gardenDays = cleanGarden(garden?.data)?.care ?? 0;
  const draft = cleanJarDraft(jar?.data);
  const seen = Object.values(cleanBoundaries(bounds?.data).seen).reduce((n, l) => n + l.length, 0);
  const status: Record<string, string | null> = {
    boundaries: p.endings(seen, SCENARIO_IDS.length * ENDINGS.length),
    garden: p.gardenDays(gardenDays),
    "thought-jar": draft ? p.draft : null,
  };
  const line = (slug: string) => p.lines[slug as keyof typeof p.lines];

  // Вкладка «Игры»: главная игра крупно, остальные карточками-сценами, затем личные игры от ИИ.
  const gamesPanel = (
    <div className="space-y-12">
      <section>
        <SectionHead title={p.gamesTitle} />
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((g, i) => {
            const light = g.slug === "garden";
            return (
              <Link
                key={g.slug}
                href={`/play/${g.slug}`}
                className={`group relative flex min-h-[230px] flex-col justify-end overflow-hidden rounded-[32px] p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift ${i === 0 ? "sm:col-span-2 lg:col-span-3 lg:min-h-[280px] lg:p-9" : i === games.length - 1 && games.length % 2 === 0 ? "sm:col-span-2 lg:col-span-1" : ""}`}
                style={{ background: COVERS[g.slug] }}
              >
                <span className="pointer-events-none absolute inset-0 flex items-start justify-end p-6" aria-hidden>
                  <span className={`scale-[1.6] transition-transform duration-500 group-hover:scale-[1.8] ${i === 0 ? "lg:scale-[2]" : ""}`}>
                    <GameGlyph slug={g.slug} />
                  </span>
                </span>
                <span className={`relative max-w-xl ${i > 0 ? "pr-14" : ""} ${light ? "text-ink" : "text-paper"}`}>
                  <span className="flex flex-wrap items-center gap-2">
                    <KindBadge kind="game" label={p.badge.game} light={light} />
                    {status[g.slug] && <span className={`text-[11.5px] uppercase tracking-[0.14em] ${light ? "text-ink-soft" : "text-paper/70"}`}>{status[g.slug]}</span>}
                  </span>
                  <span className={`mt-2 block font-serif leading-tight ${i === 0 ? "text-[28px] sm:text-[34px]" : "text-[26px] lg:text-[24px]"}`}>{g.title}</span>
                  <span className={`mt-2 block text-[14.5px] leading-relaxed ${light ? "text-ink-soft" : "text-paper/80"}`}>{line(g.slug)}</span>
                  <span className={`mt-4 inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full px-5 text-[14.5px] font-medium ${light ? "bg-ink text-paper" : "bg-paper text-ink"}`}>
                    {g.slug === "thought-jar" && draft ? playMessages[locale].flow.resume : p.open} · {g.minutes} {m.min}
                    <ArrowIcon className="h-4 w-4" />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
      <ForYou stored={stored} locale={locale} />
    </div>
  );

  // Вкладка «Практики»: ровный список от короткой к долгой, у каждой — когда она помогает.
  const practicesPanel = (
    <section>
      <SectionHead title={p.practicesTitle} hint={p.practicesSort} />
      <div className="stagger grid gap-3 sm:grid-cols-2 sm:gap-4">
        {practices.map((x) => (
          <Link
            key={x.slug}
            href={`/play/${x.slug}`}
            className="group flex overflow-hidden rounded-[28px] bg-paper shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
          >
            <span className="relative flex w-[104px] shrink-0 items-center justify-center overflow-hidden sm:w-[124px]" style={{ background: COVERS[x.slug] }}>
              <span className="scale-[1.3] transition-transform duration-500 group-hover:scale-[1.45]">
                <GameGlyph slug={x.slug} />
              </span>
              {played.has(x.slug) && (
                <svg viewBox="0 0 24 24" className="absolute right-2.5 top-2.5 h-4 w-4 drop-shadow-[0_0_6px_rgba(255,240,200,0.9)]" fill="#fff6dc" aria-label={m.played}>
                  <path d="M12 2l1.9 6.3L20 10l-6.1 1.7L12 18l-1.9-6.3L4 10l6.1-1.7z" />
                </svg>
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
              <span className="flex flex-wrap items-center gap-1.5">
                <KindBadge kind="practice" label={p.badge.practice} light />
                <span className="rounded-full bg-ink/[0.05] px-2.5 py-0.5 text-[11.5px] text-ink-soft">{m.groups[x.group].title}</span>
              </span>
              <span className="mt-2 text-[17px] font-medium leading-snug text-ink">{x.title}</span>
              <span className="mt-1 flex-1 text-[13.5px] leading-snug text-ink-soft">{line(x.slug)}</span>
              <span className="mt-3 flex items-center justify-between text-[12.5px] text-ink-faint">
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon /> {x.minutes} {m.min}
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-ink transition group-hover:gap-2">
                  {p.open} <ArrowIcon className="h-4 w-4" />
                </span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );

  return (
    <>
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {common[locale].nav.home}
      </Link>
      <PageHeader title={p.title}>{p.intro}</PageHeader>
      <div className="space-y-12">
        <StepCard />

        <PlayTabs
          initial={tabKind(tab)}
          tabs={{
            game: { label: p.tabs.game.label, hint: p.tabs.game.hint, count: games.length },
            practice: { label: p.tabs.practice.label, hint: p.tabs.practice.hint, count: practices.length },
          }}
          panels={{ game: gamesPanel, practice: practicesPanel }}
        />

        <section className="space-y-4 border-t border-ink/[0.07] pt-10">
          <SectionHead title={p.commonTitle} hint={p.commonHint} />
          <FeelingPicker />
          <Sky runs={runs} locale={locale} />
        </section>

        <section>
          <SectionHead title={p.movedTitle} hint={p.movedHint} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(p.moved).map(([k, v]) => (
              <Link key={k} href={v.href} className="group flex items-center gap-3 rounded-[22px] bg-paper/70 p-4 transition hover:-translate-y-0.5 hover:bg-paper hover:shadow-soft">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-ink">{v.title}</span>
                  <span className="block text-[13px] leading-snug text-ink-soft">{v.hint}</span>
                </span>
                <ArrowIcon className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-serif text-[22px] text-ink">{title}</h2>
      {hint && <p className="mt-1 text-[15px] text-ink-soft">{hint}</p>}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

// Обложки практик в каталоге: у каждой свой маленький «мир».
const COVERS: Record<GameSlug, string> = {
  "empty-bowl": "linear-gradient(160deg,#12133a,#4b3a8c 70%,#f0b49c)",
  "thought-jar": "radial-gradient(120% 100% at 50% 110%,#6a4f96,#2f2a68 50%,#14153a)",
  breath: "linear-gradient(180deg,#e9e6ff 0%,#ffeee4 45%,#8db4ea 46%,#5f8fd0 100%)",
  grounding: "linear-gradient(150deg,#d6f2e6,#9fdcc0)",
  bubbles: "linear-gradient(160deg,#dcebfb,#a9c9f2)",
  light: "linear-gradient(150deg,#1d1e2c,#4a43b8 80%,#aaa4ff)",
  garden: "radial-gradient(120% 120% at 20% 0%,#fbf6ea,#efe3c9 55%,#d9c6a0)",
  emotion: "linear-gradient(140deg,#e6e4ff,#fbe4f0 55%,#ffe4d8)",
  "what-if": "linear-gradient(150deg,#ffe4d8,#ffc9b0)",
  letter: "linear-gradient(150deg,#dcebfb,#e6e4ff)",
  strengths: "linear-gradient(150deg,#d6f2e6,#bfe3f0)",
  jar: "linear-gradient(150deg,#fff0d6,#ffcfa6)",
  wheel: "linear-gradient(150deg,#e9f7f0,#cfe3ff)",
  values: "radial-gradient(120% 100% at 50% 110%,#4f5aa6,#2a2762 50%,#12133a)",
  mirror: "radial-gradient(120% 100% at 50% 110%,#56508f,#2a2762 50%,#12133a)",
  boundaries: "radial-gradient(120% 110% at 70% 120%,#3f7f7a,#2a2762 50%,#12133a)",
  unsaid: "radial-gradient(120% 100% at 50% 110%,#8a4f7a,#2a2762 50%,#12133a)",
  wins: "radial-gradient(120% 100% at 50% 110%,#8a5a86,#2a2762 50%,#12133a)",
  "one-step": "linear-gradient(170deg,#dcebfb,#9fc0ef)",
  "talk-out": "linear-gradient(150deg,#e6e4ff,#c9c4ff)",
};

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
  const dark = "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-paper/10";
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
          <path d="M4 16c3-6 6 2 9-4s5-3 7-5" style={{ filter: "drop-shadow(0 0 3px #aaa4ff)" }} />
        </svg>
      </span>
    );
  if (slug === "values")
    return (
      <span className={dark} aria-hidden>
        <svg viewBox="0 0 24 24" className="h-8 w-8">
          <circle cx="12" cy="12" r="9.5" fill="none" stroke="#cfc9ff" strokeOpacity="0.7" />
          <g className="compass-seek">
            <path d="M12 4 L14 12 L10 12 Z" fill="#fff" />
            <path d="M12 20 L14 12 L10 12 Z" fill="#8f8ad6" />
          </g>
        </svg>
      </span>
    );
  if (slug === "mirror")
    return (
      <span className={dark} aria-hidden>
        <span className="relative h-9 w-7 overflow-hidden rounded-[50%] border-2 border-[#e6d3a8] bg-gradient-to-b from-[#6f6bb8] to-[#2c2a66]">
          <span className="mirror-sheen absolute -top-1/4 left-0 h-[150%] w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </span>
      </span>
    );
  if (slug === "boundaries")
    return (
      <span className={dark} aria-hidden>
        <span className="absolute left-2 h-7 w-7 rounded-full border-2 border-[#9fe6c8] shadow-[0_0_8px_1px_#9fe6c8]" />
        <span className="absolute left-[18px] h-2.5 w-2.5 rounded-full bg-[#cfc9ff]" />
        <span className="press absolute right-1.5 h-2.5 w-2.5 rounded-full bg-[#ffb79c] shadow-[0_0_6px_2px_#ffb79c]" />
      </span>
    );
  if (slug === "unsaid")
    return (
      <span className={dark} aria-hidden>
        <span className="relative h-8 w-6 -rotate-6 rounded-[3px] bg-[#fbf5e8]">
          {[8, 13, 18].map((y) => (
            <span key={y} className="absolute left-1 right-1 h-px bg-[#c9bfa8]" style={{ top: y }} />
          ))}
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-breathe rounded-full bg-[#f2a7cb] shadow-[0_0_8px_3px_#f2a7cb]" />
        </span>
      </span>
    );
  if (slug === "wins")
    return (
      <span className={dark} aria-hidden>
        <span className="flex items-end gap-1">
          {["#ffd59c", "#ffb79c", "#f2a7cb"].map((c, i) => (
            <span key={c} className="jar-bob h-5 w-3 rounded-b-md rounded-t-sm" style={{ background: c, boxShadow: `0 0 8px 2px ${c}`, marginBottom: i === 1 ? 6 : 0, animationDelay: `${-i * 1.5}s` }} />
          ))}
        </span>
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
            <path d="M1 2 L14 11 L27 2" fill="none" stroke="#ffffff" strokeWidth="1.5" />
          </svg>
          <span className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-lilac-deep" />
        </span>
      </span>
    );
  if (slug === "thought-jar")
    return (
      <span className={base} aria-hidden>
        <span className="relative h-7 w-6 rounded-b-lg rounded-t-md border-2 border-[#c9b3e8]">
          <span className="absolute bottom-0.5 left-0.5 h-2 w-2 animate-breathe rounded-full bg-[#aaa4ff] shadow-[0_0_6px_2px_#aaa4ff]" />
          <span className="absolute bottom-2 right-0.5 h-1.5 w-1.5 animate-breathe rounded-full bg-[#f3c98b] shadow-[0_0_6px_2px_#f3c98b] [animation-delay:-3s]" />
        </span>
      </span>
    );
  if (slug === "emotion")
    return (
      <span className={base} aria-hidden>
        <span className="absolute h-5 w-5 animate-morph bg-[#aaa4ff]/80" style={{ left: 9, top: 10 }} />
        <span className="absolute h-4 w-4 animate-morph bg-[#ffb79c]/80 [animation-delay:-4s]" style={{ left: 22, top: 20 }} />
        <span className="absolute h-3 w-3 animate-morph bg-[#7ccfaa]/80 [animation-delay:-8s]" style={{ left: 24, top: 8 }} />
      </span>
    );
  if (slug === "one-step")
    return (
      <span className={base} aria-hidden>
        <span className="flex items-end gap-0.5">
          {[6, 11, 16, 21].map((h, i) => (
            <span key={h} className={`w-1.5 rounded-t-sm ${i === 1 ? "bg-sky-deep" : "bg-sky/60"}`} style={{ height: h }} />
          ))}
        </span>
      </span>
    );
  if (slug === "talk-out")
    return (
      <span className={base} aria-hidden>
        <span className="relative h-6 w-8 rounded-[10px] rounded-bl-[3px] bg-lilac-deep/80">
          <span className="absolute left-1.5 top-2.5 flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1 w-1 animate-breathe rounded-full bg-paper" style={{ animationDelay: `${-i}s` }} />
            ))}
          </span>
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
              fill={["#7ccfaa", "#aaa4ff", "#d8b98f", "#8db4ea", "#a9c7c0", "#c6b0d8"][i]}
            />
          );
        })}
      </svg>
    </span>
  );
}
