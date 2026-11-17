import Link from "next/link";
import { getLocale } from "@/i18n/server";
import { companionAdminMessages } from "@/i18n/companion-admin";
import { getPractice } from "@/lib/catalog";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { Card, PageHeader } from "@/components/ui";

type Report = {
  replies: number;
  sessions: number;
  scored_sessions: number;
  avg_change: number | null;
  reached_takeaway: number;
  acute_sessions: number;
  insights_saved: number;
  focus: { focus: string; n: number }[];
  practices: { practice: string; n: number }[];
  programs: { started: number; reached_5: number; guided: number; by_step: Record<string, number> };
  scales: { kind: "phq9" | "gad7"; group: "reached" | "dropped"; people: number; first: number; last: number }[];
};

const PERIODS = [7, 30, 90];

// Метрики собеседника v3 для команды (раздел 11). Доступ проверяет база: companion_report откажет постороннему.
export default async function CompanionPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: raw } = await searchParams;
  const days = PERIODS.includes(Number(raw)) ? Number(raw) : 30;
  const m = companionAdminMessages[await getLocale()];
  return (
    <AdminFrame active="companion">
      {async ({ supabase }) => {
        const { data } = await supabase.rpc("companion_report", { p_days: days });
        const r = data as Report | null;
        const top = (list: { n: number }[]) => Math.max(1, ...list.map((x) => x.n));
        return (
          <>
            <PageHeader eyebrow={m.eyebrow} title={m.title}>{m.intro}</PageHeader>
            <div className="mb-6 flex gap-2">
              {PERIODS.map((d) => (
                <Link key={d} href={`/admin/companion?days=${d}`} className={`rounded-full px-4 py-2 text-sm font-medium transition ${d === days ? "bg-ink text-paper" : "bg-paper text-ink-soft shadow-soft hover:text-ink"}`}>
                  {m.period(d)}
                </Link>
              ))}
            </div>
            {!r || (r.replies === 0 && r.programs.started === 0) ? (
              <Card className="p-8 text-center text-[15px] text-ink-soft">{m.empty}</Card>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  {([
                    [m.sessions, r.sessions],
                    [m.replies, r.replies],
                    [m.scored, r.scored_sessions],
                    [m.change, r.avg_change === null ? "—" : (r.avg_change > 0 ? "+" : "") + r.avg_change],
                    [m.takeaway, r.reached_takeaway],
                    [m.insights, r.insights_saved],
                    [m.acute, r.acute_sessions],
                  ] as const).map(([label, value]) => (
                    <Card key={label} className="p-5">
                      <p className="font-serif text-[32px] leading-none text-ink">{value}</p>
                      <p className="mt-2 text-sm text-ink-soft">{label}</p>
                    </Card>
                  ))}
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  {([[m.focus, r.focus.map((f) => ({ label: f.focus, n: f.n }))], [m.practices, r.practices.map((p) => ({ label: `${p.practice} ${getPractice(p.practice)?.title ?? ""}`, n: p.n }))]] as const).map(([title, rows]) => (
                    <Card key={title} className="p-6">
                      <h2 className="mb-4 text-[15px] font-medium text-ink">{title}</h2>
                      <ul className="space-y-2">
                        {rows.map((row) => (
                          <li key={row.label} className="text-sm">
                            <div className="flex justify-between gap-3 text-ink"><span className="truncate">{row.label}</span><span className="tabular-nums">{row.n}</span></div>
                            <div className="mt-1 h-1.5 rounded-full bg-line/70"><div className="h-full rounded-full bg-lilac" style={{ width: `${(row.n / top(rows)) * 100}%` }} /></div>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ))}
                </div>
                <Card className="p-6">
                  <h2 className="mb-4 text-[15px] font-medium text-ink">{m.programs}</h2>
                  <div className="grid gap-3 text-sm sm:grid-cols-3">
                    <p><span className="font-serif text-[26px] text-ink">{r.programs.started}</span><br /><span className="text-ink-soft">{m.started}</span></p>
                    <p><span className="font-serif text-[26px] text-ink">{r.programs.reached_5}</span><br /><span className="text-ink-soft">{m.reached5}</span></p>
                    <p><span className="font-serif text-[26px] text-ink">{r.programs.guided}</span><br /><span className="text-ink-soft">{m.guided}</span></p>
                  </div>
                  <p className="mt-4 text-sm text-ink-soft">
                    {m.byStep}: {Object.entries(r.programs.by_step).sort().map(([s, n]) => `${s} — ${n}`).join(", ") || "—"}
                  </p>
                  {r.scales.length > 0 && (
                    <>
                      <h3 className="mt-5 text-sm font-medium text-ink">{m.scales}</h3>
                      <ul className="mt-2 space-y-1 text-sm text-ink">
                        {r.scales.map((s) => (
                          <li key={s.kind + s.group}>
                            {s.kind === "phq9" ? "PHQ-9" : "GAD-7"}, {s.group === "reached" ? m.reached : m.dropped} ({m.people(s.people)}): {s.first} → {s.last}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </Card>
              </div>
            )}
          </>
        );
      }}
    </AdminFrame>
  );
}
