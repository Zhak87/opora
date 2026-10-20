import type { Checkin } from "@/lib/wellbeing";
import { METRICS, type Metric } from "@/i18n/wellbeing";

// Графики «Моего состояния». Цвета проверены на различимость (в том числе при дальтонизме);
// у светлого бирюзового контраст ниже 3:1, поэтому у каждого графика есть подписи и таблица.
export const SERIES: Record<Metric, string> = { mood: "#6250d6", energy: "#1baf7a", calm: "#eb6834", sleep: "#2a78d6" };

const W = 640;
const H = 220;
const PAD = { l: 28, r: 16, t: 14, b: 26 };

// Линии по дням: шкала 1–5 общая для всех четырёх показателей. Пропущенные дни — разрыв линии.
export function TrendChart({
  rows,
  days,
  labels,
  dayLabel,
  metrics = METRICS,
}: {
  rows: Checkin[];
  days: string[];
  labels: Record<Metric, string>;
  dayLabel: (day: string) => string;
  metrics?: readonly Metric[];
}) {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (days.length === 1 ? iw / 2 : (i / (days.length - 1)) * iw);
  const y = (v: number) => PAD.t + ih - ((v - 1) / 4) * ih;
  const step = Math.max(1, Math.ceil(days.length / 7));
  const dot = days.length <= 31;

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-soft" aria-label="legend">
        {metrics.map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className="h-[3px] w-4 rounded-full" style={{ background: SERIES[k] }} />
            {labels[k]}
          </li>
        ))}
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label={metrics.map((k) => labels[k]).join(", ")}>
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#ebe4d8" strokeWidth={1} />
            <text x={PAD.l - 10} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#a3a4a8">
              {v}
            </text>
          </g>
        ))}
        {days.map((d, i) =>
          i % step === 0 || i === days.length - 1 ? (
            <text key={d} x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill="#a3a4a8">
              {dayLabel(d)}
            </text>
          ) : null,
        )}
        {metrics.map((k) => {
          // Отрезки только между соседними днями с отметками.
          const segs: string[] = [];
          let cur = "";
          days.forEach((d, i) => {
            const v = byDay.get(d)?.[k];
            if (typeof v === "number") cur += `${cur ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
            else if (cur) {
              segs.push(cur);
              cur = "";
            }
          });
          if (cur) segs.push(cur);
          return (
            <g key={k}>
              {segs.map((p, i) => (
                <path key={i} d={p} fill="none" stroke={SERIES[k]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {days.map((d, i) => {
                const v = byDay.get(d)?.[k];
                if (typeof v !== "number") return null;
                return (
                  <g key={d}>
                    {dot && <circle cx={x(i)} cy={y(v)} r={4} fill={SERIES[k]} stroke="#fffdf9" strokeWidth={2} />}
                    {/* Широкая невидимая зона для подсказки при наведении */}
                    <circle cx={x(i)} cy={y(v)} r={10} fill="transparent">
                      <title>{`${dayLabel(d)} · ${labels[k]}: ${v}`}</title>
                    </circle>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Колесо баланса: восемь сфер 0–10. Прошлая оценка — пунктиром.
export function BalanceWheel({ labels, now, before }: { labels: string[]; now: number[]; before?: number[] }) {
  const S = 320;
  const c = S / 2;
  const R = 110;
  const n = labels.length;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [c + Math.cos(a) * (R * v) / 10, c + Math.sin(a) * (R * v) / 10] as const;
  };
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).map((p) => p.toFixed(1)).join(",")).join(" ");
  return (
    <svg viewBox={`-120 -14 ${S + 240} ${S + 28}`} className="mx-auto h-auto w-full max-w-[560px]" role="img" aria-label={labels.join(", ")}>
      {[2, 4, 6, 8, 10].map((r) => (
        <polygon key={r} points={poly(Array(n).fill(r))} fill="none" stroke="#ebe4d8" strokeWidth={1} />
      ))}
      {labels.map((_, i) => {
        const [x2, y2] = pt(i, 10);
        return <line key={i} x1={c} y1={c} x2={x2} y2={y2} stroke="#ebe4d8" strokeWidth={1} />;
      })}
      {before && <polygon points={poly(before)} fill="none" stroke="#a3a4a8" strokeWidth={2} strokeDasharray="5 4" />}
      <polygon points={poly(now)} fill="#6250d6" fillOpacity={0.14} stroke="#6250d6" strokeWidth={2} strokeLinejoin="round" />
      {now.map((v, i) => {
        const [px, py] = pt(i, v);
        return (
          <g key={i}>
            <circle cx={px} cy={py} r={4} fill="#6250d6" stroke="#fffdf9" strokeWidth={2} />
            <circle cx={px} cy={py} r={10} fill="transparent">
              <title>{`${labels[i]}: ${v}${before ? ` (${before[i]})` : ""}`}</title>
            </circle>
          </g>
        );
      })}
      {labels.map((l, i) => {
        const [lx, ly] = pt(i, 12.4);
        const anchor = Math.abs(lx - c) < 8 ? "middle" : lx > c ? "start" : "end";
        return (
          <text key={l} x={lx} y={ly + 4} textAnchor={anchor} fontSize={11.5} fill="#6c6f75">
            {l} · {now[i]}
          </text>
        );
      })}
    </svg>
  );
}
