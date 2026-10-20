import type { Locale } from "@/i18n/config";
import { analyticsMessages } from "@/i18n/analytics";
import type { Insight, Report, StoredReport } from "@/lib/analytics";

const TREND_TONE = {
  better: "bg-sage-soft text-sage-deep",
  worse: "bg-[#fbf1ec] text-[#94594a]",
  stable: "bg-mist text-sky-deep",
  unclear: "bg-sand text-ink-soft",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 text-[15px] font-medium text-ink">{title}</h3>
      {children}
    </section>
  );
}

// Пункт сводки: «факт» и «предположение» различаются и цветом, и подписью, и рамкой.
function InsightList({ items, locale }: { items: Insight[]; locale: Locale }) {
  const m = analyticsMessages[locale].report;
  if (!items.length) return <p className="text-sm text-ink-faint">{m.empty}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((i, n) => (
        <li
          key={n}
          className={`rounded-2xl px-4 py-3 ${i.basis === "fact" ? "border border-line/70 bg-paper" : "border border-dashed border-lilac-deep/40 bg-lilac-soft/30"}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto text-[15px] font-medium text-ink">{i.title}</p>
            <span className={`rounded-full px-2.5 py-0.5 text-xs ${i.basis === "fact" ? "bg-sage-soft text-sage-deep" : "bg-lilac-soft text-lilac-deep"}`}>
              {m.basis[i.basis]}
            </span>
            <span className="text-xs text-ink-faint">
              {m.confidenceLabel}: {m.confidence[i.confidence]}
            </span>
          </div>
          {i.detail && <p className="mt-1 text-sm leading-relaxed text-ink-soft">{i.detail}</p>}
          {i.evidence.length > 0 && (
            <ul className="mt-2 space-y-1 border-l-2 border-line pl-3 text-[13px] text-ink-soft" aria-label={m.evidence}>
              {i.evidence.map((e, k) => (
                <li key={k}>{e}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ReportView({ report, locale }: { report: Report; locale: Locale }) {
  const m = analyticsMessages[locale].report;
  return (
    <div className="space-y-7">
      <Section title={m.summary}>
        <p className="text-[15px] leading-relaxed text-ink">{report.summary}</p>
      </Section>
      <Section title={m.wellbeing}>
        <p className="text-[15px] leading-relaxed text-ink">
          <span className={`mr-2 inline-flex rounded-full px-2.5 py-0.5 text-xs ${TREND_TONE[report.wellbeing.trend]}`}>{m.trend[report.wellbeing.trend]}</span>
          {report.wellbeing.state}
        </p>
      </Section>
      <Section title={m.themes}>
        <InsightList items={report.themes} locale={locale} />
      </Section>
      <Section title={m.concerns}>
        <InsightList items={report.concerns} locale={locale} />
      </Section>
      <Section title={m.needs}>
        <InsightList items={report.needs} locale={locale} />
      </Section>
      {report.dynamics && (
        <Section title={m.dynamics}>
          <p className="text-[15px] leading-relaxed text-ink">{report.dynamics}</p>
        </Section>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <Section title={m.questions}>
          <ol className="list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink marker:text-ink-faint">
            {report.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </Section>
        <Section title={m.recommendations}>
          <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink marker:text-ink-faint">
            {report.recommendations.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </Section>
      </div>
      {report.limitations && (
        <Section title={m.limitations}>
          <p className="rounded-2xl bg-sand/50 px-4 py-3 text-sm leading-relaxed text-ink-soft">{report.limitations}</p>
        </Section>
      )}
    </div>
  );
}

const key = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .trim();

// Сравнение двух сводок: тренд и темы, которые появились или ушли.
export function CompareView({
  now,
  before,
  locale,
  dateLabel,
}: {
  now: StoredReport;
  before?: StoredReport;
  locale: Locale;
  dateLabel: (iso: string) => string;
}) {
  const m = analyticsMessages[locale];
  if (!before) return <p className="text-sm text-ink-faint">{m.compare.none}</p>;
  const a = new Set(before.report.themes.map((t) => key(t.title)));
  const b = new Set(now.report.themes.map((t) => key(t.title)));
  const added = now.report.themes.filter((t) => !a.has(key(t.title)));
  const gone = before.report.themes.filter((t) => !b.has(key(t.title)));
  const col = (title: string, r: StoredReport) => (
    <div className="rounded-2xl bg-sand/40 px-4 py-3">
      <p className="text-xs text-ink-faint">
        {title} · {m.report.period(dateLabel(r.period_from), dateLabel(r.period_to))}
      </p>
      <p className="mt-1 text-sm text-ink">
        {m.report.wellbeing}:{" "}
        <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-xs ${TREND_TONE[r.report.wellbeing.trend]}`}>
          {m.report.trend[r.report.wellbeing.trend]}
        </span>
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{r.report.summary}</p>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {col(m.compare.before, before)}
        {col(m.compare.now, now)}
      </div>
      {added.length || gone.length ? (
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <p className="mb-1 text-ink-soft">{m.compare.newThemes}</p>
            <ul className="space-y-1 text-ink">{added.length ? added.map((t, i) => <li key={i}>+ {t.title}</li>) : <li className="text-ink-faint">—</li>}</ul>
          </div>
          <div>
            <p className="mb-1 text-ink-soft">{m.compare.goneThemes}</p>
            <ul className="space-y-1 text-ink">{gone.length ? gone.map((t, i) => <li key={i}>− {t.title}</li>) : <li className="text-ink-faint">—</li>}</ul>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">{m.compare.same}</p>
      )}
    </div>
  );
}

export type TimelineEvent = { at: string; kind: "session" | "report" | "goal" | "balance" | "checkin"; text: string; href?: string };

const DOT: Record<TimelineEvent["kind"], string> = {
  session: "bg-sky-deep",
  report: "bg-lilac-deep",
  goal: "bg-sage-deep",
  balance: "bg-[#6250d6]",
  checkin: "bg-[#eb6834]",
};

export function Timeline({ events, locale, dateLabel }: { events: TimelineEvent[]; locale: Locale; dateLabel: (iso: string) => string }) {
  const m = analyticsMessages[locale].timeline;
  if (!events.length) return <p className="text-sm text-ink-faint">{m.empty}</p>;
  return (
    <ol className="relative space-y-3 border-l-2 border-line pl-5">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full ring-4 ring-paper ${DOT[e.kind]}`} aria-hidden />
          <p className="text-xs text-ink-faint">
            {dateLabel(e.at)} · {m[e.kind]}
          </p>
          {e.href ? (
            <a href={e.href} className="line-clamp-2 text-sm text-sky-deep hover:text-ink">
              {e.text}
            </a>
          ) : (
            <p className="line-clamp-2 text-sm text-ink">{e.text}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
