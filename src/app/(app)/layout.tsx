import { Nav } from "@/components/Nav";
import { MusicToggle } from "@/components/Music";
import { Bell } from "@/components/Bell";
import { requireUser } from "@/lib/supabase/server";
import { unreadCount } from "@/lib/notifications";
import { getLocale } from "@/i18n/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  const unread = user ? await unreadCount(supabase, await getLocale()).catch(() => 0) : 0;
  return (
    <div className="min-h-dvh md:pl-[88px] lg:pl-[232px]">
      <Nav unread={unread} />
      <div className="fixed right-4 top-4 z-30 flex items-center gap-2 pt-[env(safe-area-inset-top)] md:hidden">
        <Bell unread={unread} />
        <MusicToggle />
      </div>
      <main className="mx-auto w-full max-w-3xl px-5 pb-32 pt-8 sm:px-8 sm:pt-12 md:pb-16">{children}</main>
    </div>
  );
}
