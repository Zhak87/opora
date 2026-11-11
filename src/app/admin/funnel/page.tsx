import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/pro";
import { getLocale } from "@/i18n/server";
import { funnelMessages } from "@/i18n/funnel";
import { getGame } from "@/lib/games";
import { PublicShell } from "@/components/pro/PublicShell";
import { Card, PageHeader } from "@/components/ui";

type Report = {
  days: number;
  steps: { landing: number; started: number; trial: number; account: number; useful: number; returned: number };
  north_star: number;
  retention: { d1_base: number; d1: number; d7_base: number; d7: number };
  events: { name: string; people: number; total: number }[];
  practices: { game: string; started: number; completed: number }[];
  daily: { day: string; people: number; useful: number }[];
};

const PERIODS = [7, 30, 90];
const STEP_KEYS = ["landing", "started", "account", "useful", "returned"] as const;
const STEP_TONES = ["bg-mist", "bg-lilac-soft", "bg-lilac", "bg-lilac-deep", "bg-ink"];

// Воронка для администратора. Доступ проверяет база: funnel_report откажет не-администратору.
export default async function FunnelPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: raw } = await searchParams;
  const days = PERIODS.includes(Number(raw)) ? Number(raw) : 30;
  const { supabase } = await requireUser();
  const locale = await getLocale();
  const m = funnelMessages[locale];

  if (!(await isAdmin(supabase))) {
    return (
      <PublicShell home="/">
        <p className="pt-10 text-center text-[15px] text-ink-soft">{m.forbidden}</p>
      </PublicShell>
    );
  }

  const { data } = await supabase.rpc("funnel_report", { p_days: days });
  const r = data as Report | null;
  const top = Math.max(1, ...(r ? STEP_KEYS.map((k) => r.steps[k]) : [1]));
  const peak = Math.max(1, ...(r?.daily ?? []).map((d) => d.people));
  const share = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

  return (
    <PublicShell home="/">
      <PageHeader eyebrow={m.eyebrow} title={m.title}>{m.intro}</PageHeader>

      <div className="mb-6 flex gap-2">
        {PERIODS.map((d) => (
          <Link
            key={d}
            href={`/admin/funnel?days=${d}`}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${d === days ? "bg-ink text-paper" : "bg-paper text-ink-soft shadow-soft hover:text-ink"}`}
          >
            {m.period(d)}
          </Link>
        ))}
      </div>

      {!r || r.events.length === 0 ? (
        <Card className="p-8 text-center text-[15px] text-ink-soft">{m.empty}</Card>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-5 rounded-[30px] bg-ink p-6 text-paper shadow-soft sm:p-8">
            <p className="font-serif text-[52px] leading-none">{r.north_star}</p>
            <div>
              <p className="text-[15px] font-medium">{m.northStar}</p>
              <p className="mt-1 text-sm leading-relaxed text-paper/65">{m.northStarHint}</p>
            </div>
          </div>

          <Card className="p-6 sm:p-8">
            <ol className="space-y-4">
              {STEP_KEYS.map((key, i) => {
                const value = r.steps[key];
                return (
                  <li key={key}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="text-[15px] text-ink">{m.steps[key]}</span>
                      <span className="font-serif text-xl text-ink">{value}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-sand">
                      <div className={`h-full rounded-full ${STEP_TONES[i]}`} style={{ width: `${Math.max(value > 0 ? 2 : 0, (value / top) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-ink-faint">
                      {i > 0 && r.steps.landing > 0 ? m.ofFirst(share(value, r.steps.landing)) : " "}
                      {key === "started" && r.steps.trial > 0 ? ` · ${m.trialNote(r.steps.trial)}` : ""}
                    </p>
                  </li>
                );
              })}
            </ol>
            <p className="mt-5 text-xs leading-relaxed text-ink-faint">{m.usefulNote}</p>
          </Card>

          <div className="grid gap-5 sm:grid-cols-2">
            {([["d1", m.d1], ["d7", m.d7]] as const).map(([key, label]) => {
              const base = r.retention[`${key}_base`];
              const value = r.retention[key];
              return (
                <Card key={key} className="p-6">
                  <p className="text-sm text-ink-soft">{m.retention}: {label.toLowerCase()}</p>
                  <p className="mt-2 font-serif text-[34px] leading-none text-ink">{base > 0 ? `${share(value, base)}%` : "–"}</p>
                  <p className="mt-2 text-xs text-ink-faint">{base > 0 ? m.of(value, base) : m.noBase}</p>
                </Card>
              );
            })}
          </div>

          <Card className="p-6 sm:p-8">
            <h2 className="text-[15px] font-medium text-ink">{m.daily}</h2>
            <p className="mt-1 text-xs text-ink-faint">{m.dailyHint}</p>
            <div className="mt-5 flex h-32 items-end gap-1">
              {r.daily.map((d) => (
                <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.day}: ${d.people} / ${d.useful}`}>
                  <div className="relative w-full overflow-hidden rounded-t-md bg-lilac-soft" style={{ height: `${Math.max(4, (d.people / peak) * 100)}%` }}>
                    <div className="absolute inset-x-0 bottom-0 bg-lilac-deep" style={{ height: `${d.people > 0 ? (d.useful / d.people) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-ink-faint">
              <span>{r.daily[0]?.day}</span>
              <span>{r.daily[r.daily.length - 1]?.day}</span>
            </div>
          </Card>

          {r.practices.length > 0 && (
            <Card className="p-6 sm:p-8">
              <h2 className="mb-4 text-[15px] font-medium text-ink">{m.practices}</h2>
              <Table head={m.practiceCols} rows={r.practices.map((p) => [getGame(p.game, locale)?.title ?? p.game, p.started, p.completed])} />
            </Card>
          )}

          <Card className="p-6 sm:p-8">
            <h2 className="mb-4 text-[15px] font-medium text-ink">{m.events}</h2>
            <Table head={m.eventCols} rows={r.events.map((e) => [m.names[e.name] ?? e.name, e.people, e.total])} />
          </Card>
        </div>
      )}
    </PublicShell>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-ink-faint">
          {head.map((h, i) => (
            <th key={h} className={`pb-2 font-normal ${i > 0 ? "w-20 text-right" : ""}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={String(row[0])} className="border-t border-line">
            {row.map((cell, i) => (
              <td key={i} className={`py-2.5 ${i > 0 ? "text-right tabular-nums text-ink" : "text-ink-soft"}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
