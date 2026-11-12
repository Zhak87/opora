import type { Locale } from "@/i18n/config";
import { gamesMessages, type Category } from "@/i18n/games";
import { CATEGORIES, getGames } from "@/lib/games";
import type { PracticeRun } from "@/lib/practice-memory";

const HUE: Record<Category, string> = { calm: "#a9b4ff", self: "#f2a7cb", relations: "#8fd3f4", confidence: "#9fe6c8", path: "#ffd59c", heard: "#ffb79c" };
// Где на небе живёт созвездие каждой категории (центр в процентах).
const HOME: Record<Category, [number, number]> = { calm: [20, 42], self: [43, 26], relations: [62, 78], confidence: [60, 50], path: [82, 30], heard: [38, 72] };

// Детерминированный «случайный» сдвиг, чтобы звёзды не прыгали между заходами.
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// «Моё небо»: каждое прохождение практики — звезда; звёзды одной категории складываются в созвездие.
export function Sky({ runs, locale }: { runs: PracticeRun[]; locale: Locale }) {
  const m = gamesMessages[locale].page;
  const games = getGames(locale);
  const group = (slug: string) => games.find((g) => g.slug === slug)?.group;
  const ordered = [...runs].reverse().slice(-120);
  const byCat = new Map<Category, { x: number; y: number; fresh: boolean }[]>();
  ordered.forEach((r, i) => {
    const cat = group(r.game);
    if (!cat) return;
    const list = byCat.get(cat) ?? [];
    const k = list.length;
    const ang = k * 2.4 + rnd(i) * 0.8;
    const dist = 4 + Math.sqrt(k) * 5.2;
    list.push({ x: HOME[cat][0] + Math.cos(ang) * dist, y: HOME[cat][1] + Math.sin(ang) * dist * 1.5, fresh: i === ordered.length - 1 });
    byCat.set(cat, list);
  });
  const tried = (cat: Category) => new Set(runs.filter((r) => group(r.game) === cat).map((r) => r.game)).size;

  return (
    <section
      className="relative overflow-hidden rounded-[32px] p-5 text-paper shadow-lift sm:p-7"
      style={{ background: "linear-gradient(160deg,#101233 0%,#231f5c 45%,#4b3a8c 85%,#7d5aa0 100%)" }}
    >
      <div className="relative z-10 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <h2 className="font-serif text-[22px] sm:text-[24px]">{m.sky.title}</h2>
        <p className="text-[12.5px] text-paper/60">{runs.length > 0 ? m.sky.count(runs.length) : ""}</p>
      </div>
      <div className="relative mt-2 h-[170px] sm:h-[200px]" aria-hidden>
        {Array.from({ length: 34 }, (_, i) => (
          <span
            key={i}
            className="twinkle absolute h-[2px] w-[2px] rounded-full bg-paper"
            style={{ left: `${rnd(i) * 100}%`, top: `${rnd(i + 50) * 100}%`, ["--t" as string]: `${3 + rnd(i + 9) * 4}s`, ["--d" as string]: `${-rnd(i + 3) * 5}s` } as React.CSSProperties}
          />
        ))}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {[...byCat.entries()].map(([cat, list]) =>
            list.length > 1 ? (
              <polyline key={cat} points={list.map((s) => `${s.x},${s.y}`).join(" ")} fill="none" stroke={HUE[cat]} strokeOpacity="0.35" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />
            ) : null,
          )}
        </svg>
        {[...byCat.entries()].flatMap(([cat, list]) =>
          list.map((s, i) => (
            <span
              key={`${cat}-${i}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${s.fresh ? "star-born" : "twinkle"}`}
              style={
                {
                  left: `${Math.min(97, Math.max(3, s.x))}%`,
                  top: `${Math.min(94, Math.max(6, s.y))}%`,
                  width: s.fresh ? 9 : 6,
                  height: s.fresh ? 9 : 6,
                  background: "#fff",
                  boxShadow: `0 0 ${s.fresh ? 16 : 10}px ${s.fresh ? 5 : 3}px ${HUE[cat]}`,
                  "--t": `${4 + rnd(i) * 3}s`,
                  "--d": `${-rnd(i + 7) * 4}s`,
                } as React.CSSProperties
              }
            />
          )),
        )}
        {runs.length === 0 && <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-[14.5px] leading-relaxed text-paper/75">{m.sky.empty}</p>}
      </div>
      <div className="relative z-10 -mx-1 mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-paper/70">
        {CATEGORIES.map((cat) => (
          <span key={cat} className="flex items-center gap-1.5 px-1">
            <span className="h-2 w-2 rounded-full" style={{ background: HUE[cat], boxShadow: `0 0 6px 1px ${HUE[cat]}` }} />
            {m.groups[cat].title} · {m.sky.tried(tried(cat), games.filter((g) => g.group === cat).length)}
          </span>
        ))}
      </div>
    </section>
  );
}
