import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { buildNotifications, seenIds, type Notice } from "@/lib/notifications";
import { getLocale } from "@/i18n/server";
import { notificationMessages } from "@/i18n/notifications";
import { PageHeader } from "@/components/ui";
import { ArrowIcon } from "@/components/icons";
import { MarkSeen } from "@/components/MarkSeen";

const TONE: Record<Notice["kind"], { dot: string; bg: string }> = {
  course: { dot: "bg-lilac-deep", bg: "from-lilac-soft/80" },
  milestone: { dot: "bg-sage-deep", bg: "from-sage-soft/80" },
  tip: { dot: "bg-sky-deep", bg: "from-mist/80" },
  question: { dot: "bg-[#9a8466]", bg: "from-sand/80" },
  care: { dot: "bg-lilac-deep", bg: "from-lilac-soft/80" },
};

export default async function NotificationsPage() {
  const { supabase } = await requireUser();
  const locale = await getLocale();
  const m = notificationMessages[locale];
  const [list, seen] = await Promise.all([buildNotifications(supabase, locale), seenIds()]);
  const unseen = list.filter((n) => !seen.has(n.id)).map((n) => n.id);

  return (
    <>
      <PageHeader title={m.title}>{m.lead}</PageHeader>
      <MarkSeen ids={unseen} />
      {list.length === 0 ? (
        <p className="rounded-[24px] border border-line/70 bg-paper/70 p-6 text-center text-[15px] text-ink-soft">{m.empty}</p>
      ) : (
        <>
          <p className="mb-3 px-1 text-[15px] text-ink-soft">{m.today}</p>
          <ul className="stagger space-y-3">
            {list.map((n) => {
              const fresh = !seen.has(n.id);
              const tone = TONE[n.kind];
              return (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    className={`group flex items-start gap-4 rounded-[24px] border border-line/70 bg-gradient-to-r ${fresh ? tone.bg : "from-paper/80"} to-paper p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift`}
                  >
                    <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${fresh ? tone.dot : "bg-line"}`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="text-[16px] font-medium text-ink">{n.title}</span>
                        {fresh && <span className="text-[11px] uppercase tracking-[0.12em] text-lilac-deep">{m.newLabel}</span>}
                      </span>
                      {n.text && <span className="mt-1 block text-[14.5px] leading-relaxed text-ink-soft">{n.text}</span>}
                    </span>
                    <ArrowIcon className="mt-1.5 h-4 w-4 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="mt-10 flex items-center justify-center gap-2 text-center text-sm text-ink-faint">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
          <path d="m4.5 7 7.5 6 7.5-6" />
        </svg>
        {m.emailSoon}
      </p>
    </>
  );
}
