"use server";

import { headers } from "next/headers";
import { requireUser } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { shareMessages } from "@/i18n/share";
import { isAdmin, myPsychologist, siteOrigin } from "@/lib/pro";
import { sendEmail } from "@/lib/email";
import { inviteEmailEnabled, renderClientInvite, renderColleagueInvite } from "@/lib/invite-email";
import { tooMany, HOUR } from "@/lib/rate-limit";

export type ShareState = { ok?: string; error?: string } | undefined;

const EMAIL_RE = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]{2,}$/;

// Отправка ссылки-приглашения письмом. kind=client — клиенту по ссылке психолога, kind=colleague — психологу.
// Отправлять могут только проверенные психологи (и администратор — коллегам), не больше 20 писем в час.
export async function sendInviteEmail(_: ShareState, formData: FormData): Promise<ShareState> {
  const locale = await getLocale();
  const m = shareMessages[locale];
  const { supabase, user } = await requireUser();
  if (!user) return { error: m.errors.failed };

  const to = String(formData.get("email") ?? "").trim().slice(0, 200);
  if (!EMAIL_RE.test(to)) return { error: m.errors.email };
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  const kind = formData.get("kind") === "colleague" ? "colleague" : "client";

  const me = await myPsychologist(supabase, user.id);
  const approved = me?.status === "approved";
  const origin = siteOrigin(await headers());

  let mail: { subject: string; html: string; text: string };
  if (kind === "client") {
    if (!me || !approved) return { error: m.errors.notApproved };
    // RLS отдаёт только свои ссылки, отключённые не отправляем.
    const { data: inv } = await supabase
      .from("invites")
      .select("code, revoked_at")
      .eq("id", String(formData.get("invite") ?? ""))
      .eq("psychologist_id", me.user_id)
      .maybeSingle();
    if (!inv || inv.revoked_at) return { error: m.errors.failed };
    mail = renderClientInvite({ locale, name: me.full_name, headline: me.headline, photo: me.photo_url, note, link: `${origin}/invite/${inv.code}` });
  } else {
    if (!approved && !(await isAdmin(supabase))) return { error: m.errors.notApproved };
    const link = approved ? `${origin}/pro/join?from=${encodeURIComponent(me!.slug)}` : `${origin}/pro/join`;
    mail = renderColleagueInvite({ locale, name: approved ? me!.full_name : m.team, photo: approved ? me!.photo_url : null, note, link });
  }

  if (!inviteEmailEnabled()) return { error: m.errors.failed };
  if (tooMany(`invite-email:${user.id}`, 20, HOUR)) return { error: m.errors.tooMany };
  try {
    // Ответ на письмо уйдёт самому отправителю, а не на служебный адрес.
    await sendEmail({ to, ...mail, replyTo: user.email || undefined });
  } catch (e) {
    console.error("invite email", e);
    return { error: m.errors.failed };
  }
  return { ok: m.sent(to) };
}
