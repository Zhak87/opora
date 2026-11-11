import type { Metadata } from "next";
import { getLocale } from "@/i18n/server";
import { INTL } from "@/i18n/config";
import { panelMessages } from "@/i18n/admin";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { Live } from "@/components/admin/Live";
import { InsightsCard } from "@/components/admin/InsightsCard";
import { Card } from "@/components/ui";
import type { AdminAction, Overview } from "@/lib/admin";

export const metadata: Metadata = { robots: { index: false } };
export const dynamic = "force-dynamic";

// Главная страница панели: что происходит прямо сейчас, общие цифры, разбор от ИИ и журнал действий.
export default async function AdminHome() {
  const locale = await getLocale();
  const m = panelMessages[locale];
  return (
    <AdminFrame active="overview">
      {async ({ supabase }) => {
        const [{ data: overview }, { data: log }] = await Promise.all([supabase.rpc("admin_overview"), supabase.rpc("admin_actions", { p_limit: 15 })]);
        const actions = (log ?? []) as AdminAction[];
        if (!overview) return <p className="text-sm text-ink-soft">{m.forbidden}</p>;
        return (
          <div className="space-y-5">
            <h1 className="font-serif text-[30px] leading-[1.1] text-ink sm:text-[40px]">{m.title}</h1>
            <Live initial={overview as Overview} />
            <InsightsCard />
            <Card className="p-6 sm:p-8">
              <h2 className="mb-4 text-[15px] font-medium text-ink">{m.actions}</h2>
              {actions.length === 0 ? (
                <p className="text-sm text-ink-soft">{m.actionsEmpty}</p>
              ) : (
                <ul className="divide-y divide-line text-sm">
                  {actions.map((a, i) => (
                    <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
                      <span className="w-32 shrink-0 text-xs tabular-nums text-ink-faint">
                        {new Date(a.at).toLocaleString(INTL[locale], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Almaty" })}
                      </span>
                      <span className="font-medium text-ink">{m.actionNames[a.action] ?? a.action}</span>
                      <span className="text-ink-soft">
                        {a.target ?? "–"}
                        {a.details?.to ? ` → ${m.roles[a.details.to] ?? a.details.to}` : ""}
                        {a.details?.status ? ` → ${a.details.status}` : ""}
                      </span>
                      <span className="ml-auto text-xs text-ink-faint">{a.actor ?? ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        );
      }}
    </AdminFrame>
  );
}
