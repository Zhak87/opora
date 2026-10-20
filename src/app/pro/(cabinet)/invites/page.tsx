import { headers } from "next/headers";
import { requireUser } from "@/lib/supabase/server";
import { myPsychologist, siteOrigin } from "@/lib/pro";
import { revokeInvite } from "@/lib/pro-actions";
import { relativeDate } from "@/lib/format";
import { getLocale } from "@/i18n/server";
import { proMessages } from "@/i18n/pro";
import { Card, PageHeader } from "@/components/ui";
import { CopyLink, CreateInvite } from "@/components/pro/Invites";

export default async function InvitesPage() {
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = proMessages[locale].invites;
  const me = (await myPsychologist(supabase, user!.id))!;
  const [{ data: invites }, { data: links }] = await Promise.all([
    supabase.from("invites").select("id, code, label, views, created_at, revoked_at").eq("psychologist_id", me.user_id).order("created_at", { ascending: false }),
    supabase.from("client_links").select("invite_id").eq("psychologist_id", me.user_id).not("invite_id", "is", null),
  ]);
  const joined = (id: string) => (links ?? []).filter((l) => l.invite_id === id).length;
  const origin = siteOrigin(await headers());

  return (
    <>
      <PageHeader title={m.title}>{m.intro}</PageHeader>
      <div className="stagger space-y-5">
        {me.status !== "approved" && <p className="rounded-2xl bg-mist/60 px-5 py-3 text-sm text-sky-deep">{m.notApproved}</p>}
        <Card className="p-5 sm:p-6">
          <CreateInvite />
        </Card>

        {invites?.length ? (
          <ul className="space-y-3">
            {invites.map((inv) => {
              const url = `${origin}/invite/${inv.code}`;
              const off = Boolean(inv.revoked_at);
              return (
                <li key={inv.id} className={`rounded-[24px] border border-line/70 bg-paper/80 p-5 shadow-soft ${off ? "opacity-60" : ""}`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium text-ink">{inv.label || m.untitled}</p>
                      <p className="mt-1 truncate font-mono text-xs text-ink-faint">{url}</p>
                      <p className="mt-2 flex gap-4 text-sm text-ink-soft">
                        <span>
                          <b className="font-medium text-ink">{inv.views}</b> {m.views}
                        </span>
                        <span>
                          <b className="font-medium text-ink">{joined(inv.id)}</b> {m.joined}
                        </span>
                        <span className="text-ink-faint">{relativeDate(inv.created_at, locale)}</span>
                      </p>
                    </div>
                    {off ? (
                      <span className="text-sm text-ink-faint">{m.revoked}</span>
                    ) : (
                      <div className="flex shrink-0 items-center gap-2">
                        <CopyLink url={url} />
                        <form action={revokeInvite}>
                          <input type="hidden" name="id" value={inv.id} />
                          <button className="h-10 rounded-full px-4 text-sm text-ink-soft transition hover:bg-[#fbf1ec] hover:text-[#a0614f]">{m.revoke}</button>
                        </form>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-[24px] border border-dashed border-line px-6 py-10 text-center text-[15px] text-ink-soft">{m.empty}</p>
        )}
      </div>
    </>
  );
}
