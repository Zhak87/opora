import Link from "next/link";
import { redirect } from "next/navigation";
import { ProNav } from "@/components/pro/ProNav";
import { HomeIcon } from "@/components/icons";
import { requireUser } from "@/lib/supabase/server";
import { myPsychologist } from "@/lib/pro";
import { unreadTotal } from "@/lib/care-chat";
import { getLocale } from "@/i18n/server";
import { proMessages } from "@/i18n/pro";
import { PushOptIn } from "@/components/PushOptIn";
import { pushConfig } from "@/lib/push-config";

// Кабинет специалиста. Без анкеты сюда не попасть: сначала /pro/join.
export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login?next=/pro");
  if (!(await myPsychologist(supabase, user.id))) redirect("/pro/join");
  const [locale, unread] = await Promise.all([getLocale(), unreadTotal(supabase).catch(() => 0)]);
  const m = proMessages[locale];
  const push = pushConfig();
  return (
    <div className="min-h-dvh md:pl-20 lg:pl-[244px]">
      <ProNav unread={unread} />
      <Link
        href="/"
        aria-label={m.toSelf}
        className="fixed right-4 top-[calc(1rem+env(safe-area-inset-top))] z-30 grid size-11 place-items-center rounded-xl border border-line bg-paper text-ink-soft md:hidden"
      >
        <HomeIcon className="h-5 w-5" />
      </Link>
      <main className="mx-auto w-full max-w-5xl px-5 pb-32 pt-[calc(4.5rem+env(safe-area-inset-top))] sm:px-8 md:pb-16 md:pt-12">
        {children}
        {push && <PushOptIn publicKey={push.publicKey} locale={locale} />}
      </main>
    </div>
  );
}
