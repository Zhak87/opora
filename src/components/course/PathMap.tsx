import Link from "next/link";
import { weekOf, weeksFor, type CoursePlan, type CourseState } from "@/lib/course";

// Карта пути: по неделе в строке, дни — камешки на мягкой волне.
// Пройденные — зелёные, сегодняшний — светится, будущие — тихие.
export function PathMap({
  plan,
  length,
  state,
  weekLabel,
}: {
  plan: CoursePlan;
  length: number;
  state: CourseState;
  weekLabel: (n: number) => string;
}) {
  const weeks = Array.from({ length: weeksFor(length) }, (_, w) =>
    Array.from({ length }, (_, i) => i + 1).filter((d) => weekOf(d, length) === w),
  );
  return (
    <ol className="space-y-6">
      {weeks.map((days, w) => {
        const week = plan.weeks[w];
        const weekDone = days.every((d) => d < state.current);
        const active = days.includes(Math.min(state.current, length)) && !state.finished;
        return (
          <li
            key={w}
            className={`rounded-[26px] border p-5 transition sm:p-6 ${
              active ? "border-lilac/60 bg-paper/90 shadow-soft" : "border-line/60 bg-paper/50"
            }`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className={`text-xs uppercase tracking-[0.14em] ${weekDone ? "text-sage-deep" : active ? "text-lilac-deep" : "text-ink-faint"}`}>
                {weekLabel(w + 1)}
              </p>
              {weekDone && <span className="text-xs text-sage-deep">✓</span>}
            </div>
            <p className={`mt-1 font-serif text-[20px] leading-snug ${active || weekDone ? "text-ink" : "text-ink-soft"}`}>{week?.title}</p>
            {week?.goal && <p className="mt-1 text-sm leading-relaxed text-ink-soft">{week.goal}</p>}
            <Stones days={days} plan={plan} state={state} />
          </li>
        );
      })}
    </ol>
  );
}

function Stones({ days, plan, state }: { days: number[]; plan: CoursePlan; state: CourseState }) {
  const n = days.length;
  const x = (i: number) => ((i + 0.5) / n) * 100;
  const y = (i: number) => (i % 2 ? 66 : 34);
  const line = days.map((_, i) => `${i ? "S" : "M"} ${i ? `${x(i) - 50 / n} ${y(i)} ` : ""}${x(i)} ${y(i)}`).join(" ");
  const doneUpTo = days.filter((d) => d < state.current).length;
  return (
    <div className="relative mt-4 h-24">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d={line} fill="none" stroke="var(--color-line)" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" strokeDasharray="1 7" />
        {doneUpTo > 1 && (
          <path
            d={days
              .slice(0, doneUpTo)
              .map((_, i) => `${i ? "S" : "M"} ${i ? `${x(i) - 50 / n} ${y(i)} ` : ""}${x(i)} ${y(i)}`)
              .join(" ")}
            fill="none"
            stroke="var(--color-sage)"
            strokeWidth="3"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {days.map((d, i) => {
        const done = d < state.current;
        const current = d === state.current && !state.finished;
        const style = { left: `${x(i)}%`, top: `${y(i)}%` };
        const title = `${d}. ${plan.days[d - 1]?.title ?? ""}`;
        const cls = "absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[13px] transition-all duration-300";
        if (current)
          return (
            <Link key={d} href={`/course/day/${d}`} title={title} style={style} className={`${cls} h-11 w-11 sm:h-12 sm:w-12`}>
              <span className={`absolute inset-0 rounded-full bg-lilac-soft ${state.lockedUntilTomorrow ? "" : "animate-breathe"}`} />
              <span className="absolute inset-1.5 rounded-full bg-gradient-to-br from-paper via-lilac-soft to-mist shadow-lift" />
              <span className="relative font-medium text-ink">{d}</span>
            </Link>
          );
        if (done)
          return (
            <Link
              key={d}
              href={`/course/day/${d}`}
              title={title}
              style={style}
              className={`${cls} h-8 w-8 bg-sage text-paper shadow-soft hover:scale-110 sm:h-9 sm:w-9`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label={title}>
                <path d="m6 12.5 4 4 8-9" />
              </svg>
            </Link>
          );
        return (
          <span key={d} title={title} style={style} className={`${cls} h-8 w-8 border border-line bg-paper text-ink-faint sm:h-9 sm:w-9`}>
            {d}
          </span>
        );
      })}
    </div>
  );
}

// Настроение до и после занятий: две тонкие линии.
export function MoodSpark({ moods }: { moods: CourseState["moods"] }) {
  const pts = moods.filter((m) => m.before || m.after);
  if (pts.length < 1) return null;
  const w = 120;
  const h = 40;
  const px = (i: number) => (pts.length === 1 ? w / 2 : (i / (pts.length - 1)) * (w - 8) + 4);
  const py = (v: number) => h - 4 - ((v - 1) / 4) * (h - 8);
  const line = (key: "before" | "after") =>
    pts
      .map((m, i) => (m[key] ? `${px(i)},${py(m[key]!)}` : null))
      .filter(Boolean)
      .join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full" aria-hidden>
      <polyline points={line("before")} fill="none" stroke="var(--color-lilac)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 3" />
      <polyline points={line("after")} fill="none" stroke="var(--color-sage)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {last.after && <circle cx={px(pts.length - 1)} cy={py(last.after)} r="3" fill="var(--color-sage-deep)" />}
    </svg>
  );
}
