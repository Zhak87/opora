import Link from "next/link";
import { redirect } from "next/navigation";
import { ProNav } from "@/components/pro/ProNav";
import { HomeIcon } from "@/components/icons";
import { requireUser } from "@/lib/supabase/server";
import { myPsychologist } from "@/lib/pro";
import { getMsg } from "@/i18n/server";
import { proMessages } from "@/i18n/pro";

// Кабинет специалиста. Без анкеты сюда не попасть: сначала /pro/join.
export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login?next=/pro");
  if (!(await myPsychologist(supabase, user.id))) redirect("/pro/join");
  const m = await getMsg(proMessages);
  return (
    <div className="min-h-dvh md:pl-[88px] lg:pl-[248px]">
      <ProNav />
      <Link
        href="/"
        aria-label={m.toSelf}
        className="fixed right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-paper/80 text-ink-soft shadow-soft backdrop-blur md:hidden"
      >
        <HomeIcon className="h-5 w-5" />
      </Link>
      <main className="mx-auto w-full max-w-5xl px-5 pb-32 pt-8 sm:px-8 sm:pt-12 md:pb-16">{children}</main>
    </div>
  );
}
