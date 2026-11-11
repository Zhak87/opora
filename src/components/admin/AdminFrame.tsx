import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { staffRole, type StaffRole } from "@/lib/admin";
import { getLocale } from "@/i18n/server";
import { panelMessages } from "@/i18n/admin";
import { PublicShell } from "@/components/pro/PublicShell";

const TABS = [
  ["overview", "/admin"],
  ["funnel", "/admin/funnel"],
  ["users", "/admin/users"],
  ["psychologists", "/admin/psychologists"],
] as const;

// Общая рамка страниц панели: проверка роли, вкладки и подпись, кто вы. Не-сотруднику показывает отказ.
// Это только оформление: сами данные и действия защищает база.
export async function AdminFrame({
  active,
  children,
}: {
  active: (typeof TABS)[number][0];
  children: (ctx: { role: StaffRole; supabase: Awaited<ReturnType<typeof requireUser>>["supabase"]; userId: string }) => React.ReactNode | Promise<React.ReactNode>;
}) {
  const { supabase, user } = await requireUser();
  const m = panelMessages[await getLocale()];
  const role = user ? await staffRole(supabase) : null;
  if (!user || !role) {
    return (
      <PublicShell home="/">
        <p className="pt-10 text-center text-[15px] text-ink-soft">{m.forbidden}</p>
      </PublicShell>
    );
  }
  return (
    <PublicShell home="/" wide>
      <nav className="mb-8 flex flex-wrap items-center gap-2">
        {TABS.map(([key, href]) => (
          <Link
            key={key}
            href={href}
            aria-current={key === active ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${key === active ? "bg-ink text-paper" : "bg-paper text-ink-soft shadow-soft hover:text-ink"}`}
          >
            {m.tabs[key]}
          </Link>
        ))}
        <span className="ml-auto rounded-full bg-lilac-soft px-3 py-1.5 text-xs font-medium text-lilac-deep" title={m.roleHints[role]}>
          {m.youAre}: {m.roles[role]}
        </span>
      </nav>
      {await children({ role, supabase, userId: user.id })}
    </PublicShell>
  );
}
