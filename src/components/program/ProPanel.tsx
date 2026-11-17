import type { Locale } from "@/i18n/config";
import { INTL } from "@/i18n/config";
import { programMessages } from "@/i18n/program";
import type { ClientProgram } from "@/lib/program-data";
import type { Screening } from "@/lib/program";

type Row = Pick<Screening, "kind" | "score" | "step" | "created_at"> & { item9?: number | null };

// Сопровождение психолога (собеседник v3, раздел 7): динамика PHQ-9 и GAD-7 и задания программы.
// Данные приходят только по согласию «Самочувствие» (функции client_program и client_screenings).
export function ProgramPanel({ program, screenings, locale }: { program: ClientProgram | null; screenings: Row[]; locale: Locale }) {
  const t = programMessages[locale];
  const series = (kind: Row["kind"]) => screenings.filter((s) => s.kind === kind).reverse();
  const date = (iso: string) => new Date(iso).toLocaleDateString(INTL[locale], { day: "numeric", month: "short" });
  const latestPhq = series("phq9").at(-1);
  return (
    <div>
      <h2 className="text-[15px] font-medium text-ink">{t.pro.title}</h2>
      {!program ? (
        <p className="mt-2 text-sm text-ink-faint">{t.pro.none}</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink">{program.status === "done" ? t.pro.done : t.pro.step(program.step)}</p>
          {program.wish && <p className="mt-1 text-sm text-ink-soft">{t.goal}: {program.wish}</p>}
          {program.guided && <p className="mt-2 rounded-2xl bg-lilac-soft/60 px-4 py-2 text-sm text-ink">{t.pro.guided}</p>}
          <ul className="mt-3 space-y-1 text-sm text-ink-soft">
            {Object.entries(program.progress).map(([n, p]) => (
              <li key={n}>{t.pro.task(Number(n), Boolean(p.task_done))}</li>
            ))}
          </ul>
        </>
      )}
      {latestPhq && (latestPhq.score >= 20 || (latestPhq.item9 ?? 0) > 0) && <p className="mt-3 rounded-2xl bg-peach-soft px-4 py-2 text-sm text-ink" role="alert">{t.pro.risk}</p>}
      {(["phq9", "gad7"] as const).map((kind) => {
        const list = series(kind);
        if (!list.length) return null;
        return (
          <p key={kind} className="mt-3 text-sm text-ink">
            <span className="text-ink-soft">{kind === "phq9" ? t.phq : t.gad}: </span>
            {list.map((s) => `${s.score} (${date(s.created_at)})`).join(" → ")}
          </p>
        );
      })}
    </div>
  );
}
