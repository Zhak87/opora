import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { UUID_RE, getSession } from "@/lib/sessions";
import { getTimeZone } from "@/lib/tz";
import { getLocale } from "@/i18n/server";
import { consultState } from "@/lib/consult/actions";
import { ConsultCall } from "@/components/consult/ConsultCall";

export const metadata = { robots: { index: false } };

// Видеовстреча глазами клиента: подключение из своей записи.
export default async function ClientCall({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const { supabase, user } = await requireUser();
  const s = await getSession(supabase, id);
  if (!s || s.client_id !== user!.id || s.format !== "online") notFound();
  const [locale, tz, { data: psy }, initial] = await Promise.all([
    getLocale(),
    getTimeZone(),
    supabase.from("psychologists").select("full_name").eq("user_id", s.psychologist_id).maybeSingle(),
    consultState(id),
  ]);
  return (
    <ConsultCall
      session={id}
      role="client"
      peerName={psy?.full_name ?? ""}
      startsAt={s.starts_at}
      endsAt={s.ends_at}
      tz={tz}
      locale={locale}
      initial={initial}
    />
  );
}
