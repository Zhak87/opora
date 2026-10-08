import Link from "next/link";
import { GAMES } from "@/lib/games";
import { PageHeader, toneBg } from "@/components/ui";
import { ArrowIcon, BackIcon } from "@/components/icons";

const GROUPS = [
  { id: "calm", title: "Успокоиться", hint: "Несколько минут, чтобы замедлиться и выдохнуть." },
  { id: "self", title: "Найти себя", hint: "Лёгкие упражнения, чтобы лучше услышать себя." },
] as const;

export default function PlayPage() {
  return (
    <>
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> Главная
      </Link>
      <PageHeader title="Игры и практики">Здесь нет очков и проигрышей. Только вы и немного тишины.</PageHeader>
      <div className="space-y-12">
        {GROUPS.map((g) => (
          <section key={g.id}>
            <h2 className="font-serif text-[22px] text-ink">{g.title}</h2>
            <p className="mb-5 mt-1 text-[15px] text-ink-soft">{g.hint}</p>
            <div className="stagger grid gap-3 sm:grid-cols-3 sm:gap-4">
              {GAMES.filter((x) => x.group === g.id).map((x) => (
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
