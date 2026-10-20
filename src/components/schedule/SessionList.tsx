import Link from "next/link";
import type { Session } from "@/lib/sessions";
import { cancelSession } from "@/lib/session-actions";
import { dayLabel, timeOf } from "@/lib/time";
import { INTL, type Locale } from "@/i18n/config";
import { scheduleMessages } from "@/i18n/schedule";
import { proLabels } from "@/i18n/pro";
import { ConfirmForm } from "../ConfirmForm";

const STATUS_TONE = { scheduled: "bg-mist text-sky-deep", completed: "bg-sage-soft text-sage-deep", cancelled: "bg-sand text-ink-faint" };

// Встречи клиента: время, статус, итоги и задачи. manage — кнопки «Перенести» и «Отменить».
export function SessionList({
  sessions,
  tz,
  locale,
  empty,
  manage = false,
  href,
}: {
  sessions: Session[];
  tz: string;
  locale: Locale;
  empty: string;
  manage?: boolean;
  // Ссылка на страницу встречи (для кабинета психолога).
  href?: (s: Session) => string;
}) {
  const m = scheduleMessages[locale];
  const formats = proLabels[locale].formats;
  if (!sessions.length) return empty ? <p className="text-sm text-ink-faint">{empty}</p> : null;
  return (
    <ul className="space-y-3">
      {sessions.map((s) => (
        <li key={s.id} className="rounded-2xl border border-line/70 bg-paper/70 p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-lilac-soft/70 text-ink">
              <span className="font-serif text-[18px] leading-none">{new Intl.DateTimeFormat(INTL[locale], { timeZone: tz, day: "numeric" }).format(new Date(s.starts_at))}</span>
              <span className="text-[10px] uppercase text-ink-soft">{new Intl.DateTimeFormat(INTL[locale], { timeZone: tz, month: "short" }).format(new Date(s.starts_at))}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] text-ink">
                {href ? (
                  <Link href={href(s)} className="hover:text-lilac-deep">
                    {timeOf(s.starts_at, tz, INTL[locale])}–{timeOf(s.ends_at, tz, INTL[locale])}
                  </Link>
                ) : (
                  <>
                    {timeOf(s.starts_at, tz, INTL[locale])}–{timeOf(s.ends_at, tz, INTL[locale])}
                  </>
                )}
                <span className="text-ink-faint"> · {dayLabel(s.starts_at, tz, locale)}</span>
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                <span className={`rounded-full px-2 py-0.5 ${STATUS_TONE[s.status]}`}>{m.status[s.status]}</span>
                {formats[s.format]}
                {s.video_url && s.status === "scheduled" && (
                  <a href={s.video_url} target="_blank" rel="noopener noreferrer" className="text-sky-deep hover:text-ink">
                    {m.care.video}
                  </a>
                )}
              </p>
            </div>
            {manage && s.status === "scheduled" && (
              <div className="flex w-full gap-1 sm:w-auto">
                <Link href={`/care/sessions/${s.id}`} className="flex h-9 items-center rounded-full px-3 text-sm text-ink-soft transition hover:bg-sand/60 hover:text-ink">
                  {m.care.reschedule}
                </Link>
                <ConfirmForm action={cancelSession} question={m.care.cancelConfirm} hidden={{ session: s.id }}>
                  <button className="h-9 rounded-full px-3 text-sm text-ink-faint transition hover:bg-[#fbf1ec] hover:text-[#a0614f]">{m.care.cancel}</button>
                </ConfirmForm>
              </div>
            )}
          </div>
          {s.status === "cancelled" && s.cancel_reason && <p className="mt-3 text-sm text-ink-soft">{s.cancel_reason}</p>}
          {(s.summary || s.tasks) && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {s.summary && (
                <div className="rounded-xl bg-sage-soft/50 px-3 py-2.5">
                  <p className="text-xs uppercase tracking-[0.12em] text-sage-deep">{m.care.summary}</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{s.summary}</p>
                </div>
              )}
              {s.tasks && (
                <div className="rounded-xl bg-mist/60 px-3 py-2.5">
                  <p className="text-xs uppercase tracking-[0.12em] text-sky-deep">{m.care.tasks}</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{s.tasks}</p>
                </div>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
