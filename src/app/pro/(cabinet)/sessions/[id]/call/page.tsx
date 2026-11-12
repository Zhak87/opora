import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { myPsychologist } from "@/lib/pro";
import { UUID_RE, getSession } from "@/lib/sessions";
import { getLocale } from "@/i18n/server";
import { proMessages } from "@/i18n/pro";
import { consultState } from "@/lib/consult/actions";
import { buildPrep } from "@/lib/consult/prep";
import { ConsultCall } from "@/components/consult/ConsultCall";

export const metadata = { robots: { index: false } };

// Видеовстреча глазами психолога: звонок и панель помощника.
export default async function ProCall({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const { supabase, user } = await requireUser();
  const s = await getSession(supabase, id);
  if (!s || s.psychologist_id !== user!.id || s.format !== "online") notFound();
  const locale = await getLocale();
  const me = (await myPsychologist(supabase, user!.id))!;
  const [{ data: client }, initial, prep] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", s.client_id).maybeSingle(),
    consultState(id),
    buildPrep(supabase, s, locale, me.timezone),
  ]);
  return (
    <ConsultCall
      session={id}
      role="psychologist"
      peerName={client?.name ?? proMessages[locale].clients.noName}
      startsAt={s.starts_at}
      endsAt={s.ends_at}
      tz={me.timezone}
      locale={locale}
      initial={initial}
      prep={prep}
    />
  );
}
