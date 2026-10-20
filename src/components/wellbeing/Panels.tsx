import Link from "next/link";
import { INTL, type Locale } from "@/i18n/config";
import { AREAS, METRICS, wellbeingMessages } from "@/i18n/wellbeing";
import { PERIODS, balanceAreas, periodStats, topFeelings, type Assessment, type Checkin, type Goal, type Period } from "@/lib/wellbeing";
import { deleteGoal, setGoalStatus } from "@/lib/wellbeing-actions";
import { BalanceWheel, SERIES, TrendChart } from "./Charts";
import { GoalStepForm } from "./Forms";
import { ConfirmForm } from "../ConfirmForm";

const fmtDay = (locale: Locale, opts: Intl.DateTimeFormatOptions) => (day: string) =>
  new Intl.DateTimeFormat(INTL[locale], { timeZone: "UTC", ...opts }).format(new Date(`${day}T12:00:00Z`));

// Динамика самочувствия за период: переключатель периода, средние с изменением, график, таблица.
export function TrendPanel({
  rows,
  period,
  from,
  days,
  locale,
  href,
  showNotes = true,
}: {
  rows: Checkin[];
  period: Period;
  from: string;
  days: string[];
  locale: Locale;
  href: (p: Period) => string;
  showNotes?: boolean;
}) {
  const m = wellbeingMessages[locale];
  const cur = rows.filter((r) => r.day >= from);
  const stats = periodStats(rows, from);
  const short = fmtDay(locale, { day: "numeric", month: "short" });
  const feelings = topFeelings(cur);
  const notes = cur
    .filter((r) => r.note)
    .reverse()
    .slice(0, 5);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-[15px] font-medium text-ink">
          {m.chart.title} <span className="font-normal text-ink-faint">· {m.chart.count(cur.length)}</span>
        </h2>
        <div className="flex rounded-full bg-sand/60 p-1" role="tablist">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={href(p)}
              scroll={false}
              role="tab"
              aria-selected={p === period}
              className={`rounded-full px-3 py-1.5 text-sm transition ${p === period ? "bg-paper text-ink shadow-soft" : "text-ink-soft hover:text-ink"}`}
            >
              {m.chart.periods[p]}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(({ metric, now, before }) => {
          const delta = now !== null && before !== null ? now - before : null;
          return (
            <div key={metric} className="rounded-2xl border border-line/70 bg-paper/70 px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs text-ink-soft">
                <span className="h-2 w-2 rounded-full" style={{ background: SERIES[metric] }} />
                {m.checkin.scales[metric].label}
              </p>
              <p className="mt-1 font-serif text-[26px] leading-none text-ink">{now === null ? "—" : now.toFixed(1)}</p>
              <p className="mt-1 text-[11px] text-ink-faint">
                {delta === null ? m.chart.noPrev : m.chart.vsPrev(`${delta > 0 ? "+" : delta < 0 ? "−" : "±"}${Math.abs(delta).toFixed(1)}`)}
              </p>
            </div>
          );
        })}
      </div>

      {cur.length ? (
        <TrendChart rows={cur} days={days} labels={Object.fromEntries(METRICS.map((k) => [k, m.checkin.scales[k].label])) as never} dayLabel={short} />
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-6 py-8 text-center text-sm text-ink-soft">{m.chart.noData}</p>
      )}

      {feelings.length > 0 && (
        <p className="text-sm text-ink-soft">
          {m.chart.feelingsTop}: {feelings.map(([f, n]) => `${m.checkin.feelingNames[f as keyof typeof m.checkin.feelingNames] ?? f} (${n})`).join(", ")}
        </p>
      )}

      {showNotes && notes.length > 0 && (
        <div>
          <p className="mb-2 text-sm text-ink-soft">{m.chart.notes}</p>
          <ul className="space-y-2">
            {notes.map((r) => (
              <li key={r.id} className="rounded-xl bg-sand/40 px-3 py-2 text-sm text-ink">
                <span className="mr-2 text-xs text-ink-faint">{short(r.day)}</span>
                {r.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {cur.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-ink-soft hover:text-ink">{m.chart.table}</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left">
              <thead className="text-xs text-ink-faint">
                <tr>
                  <th className="py-1.5 pr-3 font-normal">{m.chart.date}</th>
                  {METRICS.map((k) => (
                    <th key={k} className="py-1.5 pr-3 font-normal">
                      {m.checkin.scales[k].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-ink">
                {[...cur].reverse().map((r) => (
                  <tr key={r.id} className="border-t border-line/60">
                    <td className="py-1.5 pr-3 text-ink-soft">{short(r.day)}</td>
                    {METRICS.map((k) => (
                      <td key={k} className="py-1.5 pr-3">
                        {r[k] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

// Колесо баланса: последняя оценка против предыдущей и история.
export function BalancePanel({ list, locale }: { list: Assessment[]; locale: Locale }) {
  const m = wellbeingMessages[locale].balance;
  if (!list.length) return <p className="text-sm text-ink-faint">{m.none}</p>;
  const [now, before] = list;
  const labels = AREAS.map((a) => m.areas[a]);
  const date = (iso: string) => new Intl.DateTimeFormat(INTL[locale], { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  const cur = balanceAreas(now);
  const prev = before ? balanceAreas(before) : undefined;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="h-[3px] w-4 rounded-full bg-[#6250d6]" /> {m.current} · {date(now.created_at)}
        </span>
        {before && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-ink-faint" /> {m.previous} · {date(before.created_at)}
          </span>
        )}
      </div>
      <BalanceWheel labels={labels} now={cur} before={prev} />
      <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
        {AREAS.map((a, i) => {
          const d = prev ? cur[i] - prev[i] : 0;
          return (
            <li key={a} className="flex justify-between rounded-xl bg-sand/30 px-3 py-1.5">
              <span className="text-ink-soft">{m.areas[a]}</span>
              <span className={d > 0 ? "text-sage-deep" : d < 0 ? "text-[#a0614f]" : "text-ink-faint"}>{prev ? `${prev[i]} → ${cur[i]}` : cur[i]}</span>
            </li>
          );
        })}
      </ul>
      {now.note && <p className="rounded-xl bg-lilac-soft/50 px-3 py-2 text-sm text-ink">{now.note}</p>}
    </div>
  );
}

const STATUS_TONE = {
  active: "bg-mist text-sky-deep",
  done: "bg-sage-soft text-sage-deep",
  paused: "bg-sand text-ink-soft",
  dropped: "bg-sand text-ink-faint",
};

// Цели: прогресс, отметки и (у самого клиента) управление.
export function GoalList({ goals, locale, editable = false }: { goals: Goal[]; locale: Locale; editable?: boolean }) {
  const m = wellbeingMessages[locale].goals;
  const date = (d: string) => new Intl.DateTimeFormat(INTL[locale], { day: "numeric", month: "long" }).format(new Date(d.length === 10 ? `${d}T12:00:00Z` : d));
  const open = goals.filter((g) => g.status === "active" || g.status === "paused");
  const closed = goals.filter((g) => g.status === "done" || g.status === "dropped");
  const card = (g: Goal) => (
    <li key={g.id} className="rounded-2xl border border-line/70 bg-paper/80 p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-2">
        <p className="mr-auto text-[16px] font-medium text-ink">{g.title}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs ${STATUS_TONE[g.status]}`}>{m.status[g.status]}</span>
      </div>
      {g.why && <p className="mt-1 text-sm text-ink-soft">{g.why}</p>}
      <div className="mt-3 flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-sand"
          role="progressbar"
          aria-valuenow={g.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={m.progress}
        >
          <div className="h-full rounded-full bg-[#6250d6]" style={{ width: `${g.progress}%` }} />
        </div>
        <span className="w-10 text-right text-sm text-ink">{g.progress}%</span>
      </div>
      {g.target_date && <p className="mt-1 text-xs text-ink-faint">{m.until(date(g.target_date))}</p>}
      {g.updates.length > 0 && (
        <ul className="mt-3 space-y-1 border-l-2 border-line pl-3 text-sm">
          {g.updates.slice(0, 3).map((u, i) => (
            <li key={i} className="text-ink-soft">
              <span className="mr-2 text-xs text-ink-faint">{date(u.at)}</span>
              {u.note}
              {u.progress !== null && <span className="ml-1 text-xs text-ink-faint">· {u.progress}%</span>}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div className="mt-4 space-y-3 border-t border-line/60 pt-4">
          {g.status === "active" && <GoalStepForm goal={g.id} progress={g.progress} />}
          <div className="flex flex-wrap gap-1">
            {g.status === "active" && <StatusButton goal={g.id} status="done" label={m.markDone} strong />}
            {g.status === "active" && <StatusButton goal={g.id} status="paused" label={m.pause} />}
            {g.status !== "active" && <StatusButton goal={g.id} status="active" label={m.resume} />}
            {g.status !== "dropped" && g.status !== "done" && <StatusButton goal={g.id} status="dropped" label={m.drop} />}
            <ConfirmForm action={deleteGoal} question={m.removeConfirm} hidden={{ goal: g.id }}>
              <button className="h-9 rounded-full px-3 text-sm text-ink-faint transition hover:bg-[#fbf1ec] hover:text-[#a0614f]">{m.remove}</button>
            </ConfirmForm>
          </div>
        </div>
      )}
    </li>
  );
  return (
    <div className="space-y-4">
      {open.length > 0 && <ul className="space-y-3">{open.map(card)}</ul>}
      {closed.length > 0 && (
        <details open={!open.length}>
          <summary className="cursor-pointer text-sm text-ink-soft hover:text-ink">
            {m.archived} ({closed.length})
          </summary>
          <ul className="mt-3 space-y-3">{closed.map(card)}</ul>
        </details>
      )}
    </div>
  );
}

function StatusButton({ goal, status, label, strong = false }: { goal: string; status: string; label: string; strong?: boolean }) {
  return (
    <form action={setGoalStatus}>
      <input type="hidden" name="goal" value={goal} />
      <input type="hidden" name="status" value={status} />
      <button
        className={`h-9 rounded-full px-3 text-sm transition ${strong ? "bg-sage-soft text-sage-deep hover:bg-sage hover:text-paper" : "text-ink-soft hover:bg-sand/60 hover:text-ink"}`}
      >
        {label}
      </button>
    </form>
  );
}
