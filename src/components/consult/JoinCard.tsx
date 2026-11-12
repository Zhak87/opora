import Link from "next/link";
import type { Session } from "@/lib/sessions";
import { joinState, joinWindow } from "@/lib/consult/config";
import { videoConfigured } from "@/lib/consult/server";
import { consultMessages } from "@/i18n/consult";
import { INTL, type Locale } from "@/i18n/config";
import { timeOf } from "@/lib/time";

// Кнопка «Войти в консультацию» в карточке онлайн-встречи. Появляется сама после записи;
// активна с момента, когда открывается комната (за 15 минут до начала), до 30 минут после конца.
export function JoinCard({ session, href, tz, locale, compact = false }: { session: Session; href: string; tz: string; locale: Locale; compact?: boolean }) {
  if (session.format !== "online" || session.status !== "scheduled") return null;
  const m = consultMessages[locale].join;
  const state = joinState(session);
  if (state === "ended") return compact ? null : <p className="text-sm text-ink-faint">{m.ended}</p>;
  const open = state === "open";
  const opens = timeOf(new Date(joinWindow(session).opensAt), tz, INTL[locale]);
  const button = open ? (
    <Link href={href} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[15px] text-paper shadow-soft transition hover:opacity-90" data-join-link>
      <span className="h-2 w-2 animate-pulse rounded-full bg-sage" /> {m.enter}
    </Link>
  ) : (
    <Link href={href} className="inline-flex h-11 items-center justify-center rounded-full border border-line bg-paper px-5 text-sm text-ink-soft transition hover:text-ink" data-join-link>
      {m.enter} · {m.opensAt(opens)}
    </Link>
  );
  if (compact) return button;
  return (
    <div className="flex flex-col gap-3 rounded-[24px] bg-gradient-to-r from-mist/70 to-lilac-soft/60 p-5 sm:flex-row sm:items-center">
      <p className="flex-1 text-sm leading-relaxed text-ink-soft">{videoConfigured() ? (open ? m.onlineHint : m.opensHint) : m.videoOff}</p>
      {button}
    </div>
  );
}
