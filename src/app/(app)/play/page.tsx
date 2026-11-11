import Link from "next/link";
import { CATEGORIES, getGames, type Game } from "@/lib/games";
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
import { common } from "@/i18n/common";
import type { Locale } from "@/i18n/config";

export const maxDuration = 60;

export default async function PlayPage() {
  const { supabase } = await requireUser();
  const stored = await latestPlan(supabase);
  const locale = await getLocale();
  const m = gamesMessages[locale].page;
  const games = getGames(locale);
  const flagship = games.find((g) => g.flagship)!;
  const runs = await recentRuns(supabase);
  const played = new Set(runs.map((r) => r.game));
  return (
    <>
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {common[locale].nav.home}
      </Link>
      <PageHeader title={m.title}>{m.intro}</PageHeader>
      <div className="space-y-12">
        <div className="space-y-4">
          <Sky runs={runs} locale={locale} />
          <StepCard />
          <FeelingPicker />
        </div>
        <Flagship game={flagship} locale={locale} />
        <ForYou stored={stored} locale={locale} />
        {CATEGORIES.map((id) => {
          const list = games.filter((x) => x.group === id && !x.flagship);
          if (list.length === 0) return null;
          return (
            <section key={id}>
              <h2 className="font-serif text-[22px] text-ink">{m.groups[id].title}</h2>
              <p className="mb-5 mt-1 text-[15px] text-ink-soft">{m.groups[id].hint}</p>
              <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {list.map((x) => (
                  <Link
                    key={x.slug}
                    href={`/play/${x.slug}`}
                    className="group flex flex-col overflow-hidden rounded-[26px] bg-paper shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
                  >
                    <span className="relative flex h-[104px] items-center justify-center overflow-hidden sm:h-[124px]" style={{ background: COVERS[x.slug] }}>
                      <span className="absolute -right-6 -top-8 h-24 w-24 animate-breathe rounded-full bg-paper/25" aria-hidden />
                      <span className="scale-[1.35] transition-transform duration-500 group-hover:scale-[1.5]">
                        <GameGlyph slug={x.slug} />
                      </span>
                      {x.isNew && (
                        <span className="absolute left-3 top-3 rounded-full bg-paper/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-lilac-deep">{m.isNew}</span>
                      )}
                      {played.has(x.slug) && (
                        <svg viewBox="0 0 24 24" className="absolute right-3 top-3 h-4 w-4 drop-shadow-[0_0_6px_rgba(255,240,200,0.9)]" fill="#fff6dc" aria-label={m.played}>
                          <path d="M12 2l1.9 6.3L20 10l-6.1 1.7L12 18l-1.9-6.3L4 10l6.1-1.7z" />
                        </svg>
                      )}
                    </span>
                    <span className="flex flex-1 flex-col p-4">
                      <span className="text-[15px] font-medium leading-snug text-ink sm:text-[16px]">{x.title}</span>
                      <span className="mt-1 flex-1 text-[12.5px] leading-snug text-ink-soft sm:text-[13px]">{x.hint}</span>
                      <span className="mt-2.5 flex items-center justify-between text-[12px] text-ink-faint">
                        {x.minutes} {m.min}
                        <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:text-ink" />
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
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
  garden: "linear-gradient(150deg,#f3ecdc,#dccdab)",
  emotion: "linear-gradient(140deg,#e6e4ff,#fbe4f0 55%,#ffe4d8)",
  "what-if": "linear-gradient(150deg,#ffe4d8,#ffc9b0)",
  letter: "linear-gradient(150deg,#dcebfb,#e6e4ff)",
  strengths: "linear-gradient(150deg,#d6f2e6,#bfe3f0)",
  jar: "linear-gradient(150deg,#fff0d6,#ffcfa6)",
  wheel: "linear-gradient(150deg,#e9f7f0,#cfe3ff)",
  values: "linear-gradient(150deg,#f3ecdc,#ffe4d8)",
  "one-step": "linear-gradient(170deg,#dcebfb,#9fc0ef)",
  "talk-out": "linear-gradient(150deg,#e6e4ff,#c9c4ff)",
};

// Большая карточка главной практики: чаша и огоньки мыслей, которые проплывают мимо.
function Flagship({ game, locale }: { game: Game; locale: Locale }) {
  const m = gamesMessages[locale].page;
  const lights = [
    { top: "22%", t: "11s", d: "0s", c: "#aaa4ff", s: 10 },
    { top: "34%", t: "14s", d: "-5s", c: "#8db4ea", s: 7 },
    { top: "28%", t: "9s", d: "-3s", c: "#ffb79c", s: 8 },
    { top: "40%", t: "16s", d: "-9s", c: "#7ccfaa", s: 6 },
    { top: "18%", t: "13s", d: "-11s", c: "#f2a7cb", s: 6 },
  ];
  return (
    <Link
      href={`/play/${game.slug}`}
      className="group relative block min-h-[340px] overflow-hidden rounded-[36px] p-6 shadow-lift transition hover:-translate-y-0.5 sm:min-h-[300px] sm:p-9"
      style={{ background: "linear-gradient(165deg, #12133a 0%, #252260 36%, #4b3a8c 64%, #9a6aa6 86%, #f0b49c 100%)" }}
    >
      {lights.map((l, i) => (
        <span
          key={i}
          aria-hidden
          className="bowl-drift absolute left-0 rounded-full"
          style={{ top: l.top, width: l.s, height: l.s, background: "#fff", boxShadow: `0 0 ${l.s * 2}px ${l.s}px ${l.c}`, ["--t" as string]: l.t, ["--d" as string]: l.d, ["--w" as string]: "900px" } as React.CSSProperties}
        />
      ))}
      <div className="relative max-w-md">
        <p className="text-xs uppercase tracking-[0.16em] text-[#cfc9ff]">{m.flagship}</p>
        <h2 className="mt-2 font-serif text-[32px] leading-tight text-paper sm:text-[40px]">{game.title}</h2>
        <p className="mt-3 text-[15.5px] leading-relaxed text-paper/75">{m.flagshipLine}</p>
        <span className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-paper px-6 text-[15px] font-medium text-ink shadow-[0_0_30px_4px_rgba(255,255,255,0.25)] transition group-hover:-translate-y-0.5">
          {m.begin} · {game.minutes} {m.min}
          <ArrowIcon className="h-4 w-4" />
        </span>
      </div>
      <svg viewBox="0 0 280 170" className="pointer-events-none absolute -bottom-4 right-[-20px] w-[200px] sm:bottom-2 sm:right-8 sm:w-[260px]" aria-hidden>
        <defs>
          <linearGradient id="fl-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#cfc8ec" />
          </linearGradient>
        </defs>
        <ellipse cx="140" cy="40" rx="150" ry="70" fill="#ffe9d6" opacity="0.22" />
        <path d="M22 48 C 30 128, 82 152, 140 152 C 198 152, 250 128, 258 48 Z" fill="url(#fl-body)" />
        <ellipse cx="140" cy="48" rx="118" ry="24" fill="#ebe4f8" stroke="#fff" strokeWidth="3" />
      </svg>
    </Link>
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
          <path d="M4 16c3-6 6 2 9-4s5-3 7-5" style={{ filter: "drop-shadow(0 0 3px #aaa4ff)" }} />
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
