import { headers } from "next/headers";
import { requireUser } from "@/lib/supabase/server";
import { myClients, myPsychologist, siteOrigin } from "@/lib/pro";
import { dashboardMessages } from "@/i18n/dashboard";
import { revokeInvite } from "@/lib/pro-actions";
import { relativeDate } from "@/lib/format";
import { getLocale } from "@/i18n/server";
import { proMessages } from "@/i18n/pro";
import { Card, PageHeader } from "@/components/ui";
import { CreateInvite } from "@/components/pro/Invites";
import { ShareLink } from "@/components/pro/ShareLink";
import { shareMessages } from "@/i18n/share";
import { inviteEmailEnabled } from "@/lib/invite-email";

export default async function InvitesPage() {
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = proMessages[locale].invites;
  const me = (await myPsychologist(supabase, user!.id))!;
  const dm = dashboardMessages[locale];
  const [{ data: invites }, all] = await Promise.all([
    supabase.from("invites").select("id, code, label, views, created_at, revoked_at").eq("psychologist_id", me.user_id).order("created_at", { ascending: false }),
    myClients(supabase, me.user_id, true),
  ]);
  // Воронка по ссылкам: переходы → подключились → работают сейчас → делятся хотя бы одним видом данных.
  const byInvite = all.filter((c) => c.link.invite_id);
  const joined = (id: string) => byInvite.filter((c) => c.link.invite_id === id).length;
  const activeBy = (id: string) => byInvite.filter((c) => c.link.invite_id === id && c.link.status === "active").length;
  const totalViews = (invites ?? []).reduce((n, i) => n + (i.views ?? 0), 0);
  const funnel = [
    [dm.funnel.views, totalViews],
    [dm.funnel.joined, byInvite.length],
    [dm.funnel.active, byInvite.filter((c) => c.link.status === "active").length],
    [dm.funnel.sharing, byInvite.filter((c) => c.link.status === "active" && c.scopes.length > 0).length],
  ] as const;
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const origin = siteOrigin(await headers());
  const sm = shareMessages[locale];
  const approved = me.status === "approved";
  const emailEnabled = inviteEmailEnabled();
  const joinUrl = `${origin}/pro/join?from=${encodeURIComponent(me.slug)}`;

  return (
    <>
      <PageHeader title={m.title}>{m.intro}</PageHeader>
      <div className="stagger space-y-5">
        {me.status !== "approved" && <p className="rounded-2xl bg-mist/60 px-5 py-3 text-sm text-sky-deep">{m.notApproved}</p>}
        <Card className="p-5 sm:p-6">
          <CreateInvite />
        </Card>

        {(invites?.length ?? 0) > 0 && (
          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 text-[15px] font-medium text-ink">{dm.funnel.title}</h2>
            {totalViews ? (
              <>
                <ol className="space-y-2.5">
                  {funnel.map(([label, n]) => (
                    <li key={label} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-sm sm:grid-cols-[10rem_1fr_3rem]">
                      <span className="text-ink-soft">{label}</span>
                      <span className="h-2.5 overflow-hidden rounded-full bg-sand/70">
                        <span className="block h-full rounded-full bg-[#6c63ff]" style={{ width: `${Math.max(n ? 2 : 0, pct(n, totalViews))}%` }} />
                      </span>
                      <span className="text-right font-medium text-ink">{n}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 text-sm text-ink-soft">{dm.funnel.conversion(pct(byInvite.length, totalViews))}</p>
              </>
            ) : (
              <p className="text-sm text-ink-faint">{dm.funnel.noData}</p>
            )}
          </Card>
        )}

        {invites?.length ? (
          <ul className="space-y-3">
            {invites.map((inv) => {
              const url = `${origin}/invite/${inv.code}`;
              const off = Boolean(inv.revoked_at);
              return (
                <li key={inv.id} className={`rounded-[24px] bg-paper shadow-soft p-5 shadow-soft ${off ? "opacity-60" : ""}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium text-ink">{inv.label || m.untitled}</p>
                      <p className="mt-1 truncate font-mono text-xs text-ink-faint">{url}</p>
                      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                        <span>
                          <b className="font-medium text-ink">{inv.views}</b> {m.views}
                        </span>
                        <span>
                          <b className="font-medium text-ink">{joined(inv.id)}</b> {m.joined}
                        </span>
                        <span>
                          <b className="font-medium text-ink">{activeBy(inv.id)}</b> {dm.invite.active}
                        </span>
                        {inv.views > 0 && (
                          <span>
                            <b className="font-medium text-ink">{pct(joined(inv.id), inv.views)}%</b> {dm.invite.conversion}
                          </span>
                        )}
                        <span className="text-ink-faint">{relativeDate(inv.created_at, locale)}</span>
                      </p>
                    </div>
                    {off ? (
                      <span className="text-sm text-ink-faint">{m.revoked}</span>
                    ) : (
                      <form action={revokeInvite} className="shrink-0">
                        <input type="hidden" name="id" value={inv.id} />
                        <button className="h-10 rounded-full px-4 text-sm text-ink-soft transition hover:bg-[#ffeeec] hover:text-[#c2453d]">{m.revoke}</button>
                      </form>
                    )}
                  </div>
                  {!off && approved && (
                    <div className="mt-4 border-t border-line/60 pt-4">
                      <ShareLink url={url} text={sm.clientText(me.full_name)} kind="client" invite={inv.id} emailEnabled={emailEnabled} mailSubject={sm.clientEmail.subject(me.full_name)} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-[24px] border border-dashed border-line px-6 py-10 text-center text-[15px] text-ink-soft">{m.empty}</p>
        )}

        {approved && (
          <Card className="bg-gradient-to-br from-paper to-lilac-soft/50 p-5 sm:p-6">
            <h2 className="text-[17px] font-medium text-ink">{sm.colleague.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{sm.colleague.lead}</p>
            <p className="mb-4 mt-2 truncate font-mono text-xs text-ink-faint">{joinUrl}</p>
            <ShareLink url={joinUrl} text={sm.colleagueText(me.full_name)} kind="colleague" emailEnabled={emailEnabled} mailSubject={sm.colleagueEmail.subject(me.full_name)} />
          </Card>
        )}
      </div>
    </>
  );
}
