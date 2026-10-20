import { Nav } from "@/components/Nav";
import { MusicToggle } from "@/components/Music";
import { Bell } from "@/components/Bell";
import { requireUser } from "@/lib/supabase/server";
import { unreadCount } from "@/lib/notifications";
import { getLocale } from "@/i18n/server";
import { hasCare } from "@/lib/pro";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  const [unread, care, pro] = user
    ? await Promise.all([
        unreadCount(supabase, await getLocale()).catch(() => 0),
        hasCare(supabase, user.id).catch(() => false),
        supabase
          .from("psychologists")
          .select("user_id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .then(({ count }) => (count ?? 0) > 0, () => false),
      ])
    : [0, false, false];
  return (
    <div className="min-h-dvh md:pl-[88px] lg:pl-[232px]">
      <Nav unread={unread} care={care} pro={pro} />
      <div className="fixed right-4 top-4 z-30 flex items-center gap-2 pt-[env(safe-area-inset-top)] md:hidden">
        <Bell unread={unread} />
        <MusicToggle />
      </div>
      <main className="mx-auto w-full max-w-3xl px-5 pb-32 pt-8 sm:px-8 sm:pt-12 md:pb-16">{children}</main>
    </div>
  );
}
