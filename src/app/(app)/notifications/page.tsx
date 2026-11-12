import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { buildNotifications, seenIds, type Notice } from "@/lib/notifications";
import { getLocale } from "@/i18n/server";
import { notificationMessages } from "@/i18n/notifications";
import { PageHeader } from "@/components/ui";
import { ArrowIcon } from "@/components/icons";
import { MarkSeen } from "@/components/MarkSeen";
import { PushOptIn } from "@/components/PushOptIn";
import { pushConfig } from "@/lib/push-config";
import { isGuest } from "@/lib/trial";
import { notificationEmailConfigured } from "@/lib/email";
import { adminConfigured } from "@/lib/supabase/admin";

const TONE: Record<Notice["kind"], { dot: string; bg: string }> = {
  course: { dot: "bg-lilac-deep", bg: "from-lilac-soft/80" },
  milestone: { dot: "bg-sage-deep", bg: "from-sage-soft/80" },
  tip: { dot: "bg-sky-deep", bg: "from-mist/80" },
  question: { dot: "bg-[#b0623f]", bg: "from-sand/80" },
  care: { dot: "bg-lilac-deep", bg: "from-lilac-soft/80" },
};

export default async function NotificationsPage() {
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const { data: session } = await supabase.auth.getClaims();
  const registered = Boolean(user && !isGuest(session?.claims));
  const push = registered ? pushConfig() : null;
  const emailAvailable = Boolean(registered && user?.email && adminConfigured() && notificationEmailConfigured());
  const m = notificationMessages[locale];
  const [list, seen, emailPreference] = await Promise.all([
    buildNotifications(supabase, locale),
    seenIds(),
    registered && user
      ? supabase.from("notification_email_preferences").select("user_id").eq("user_id", user.id).maybeSingle()
      : null,
  ]);
  const emailEnabled = Boolean(emailPreference?.data);
  const unseen = list.filter((n) => !seen.has(n.id)).map((n) => n.id);

  return (
    <>
      <PageHeader title={m.title}>{m.lead}</PageHeader>
      <MarkSeen ids={unseen} />
      {(push || emailAvailable || emailEnabled) && (
        <PushOptIn publicKey={push?.publicKey} locale={locale} email={{ available: emailAvailable, enabled: emailEnabled }} />
      )}
      {list.length === 0 ? (
        <p className="rounded-[24px] bg-paper shadow-soft p-6 text-center text-[15px] text-ink-soft">{m.empty}</p>
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
    </>
  );
}
