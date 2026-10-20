import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { UUID_RE, freeSlots, getSession } from "@/lib/sessions";
import { getTimeZone } from "@/lib/tz";
import { whenLabel } from "@/lib/time";
import { getLocale } from "@/i18n/server";
import { scheduleMessages } from "@/i18n/schedule";
import { common } from "@/i18n/common";
import { Card, PageHeader } from "@/components/ui";
import { RescheduleForm } from "@/components/schedule/SlotPicker";
import { BackIcon } from "@/components/icons";

// Перенос встречи клиентом: только на свободные окна психолога.
export default async function ClientSession({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const { supabase, user } = await requireUser();
  const s = await getSession(supabase, id);
  if (!s || s.client_id !== user!.id) notFound();
  const locale = await getLocale();
  const m = scheduleMessages[locale];
  const tz = await getTimeZone();
  const slots = s.status === "scheduled" ? await freeSlots(supabase, s.psychologist_id, 30) : [];
  return (
    <>
      <Link href="/care" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {common[locale].back}
      </Link>
      <PageHeader title={m.care.rescheduleTitle}>
        {m.care.current}: {whenLabel(s.starts_at, tz, locale)}
      </PageHeader>
      <Card className="p-6 sm:p-8">
        {s.status === "scheduled" ? <RescheduleForm session={s.id} slots={slots} /> : <p className="text-ink-soft">{m.status[s.status]}</p>}
      </Card>
    </>
  );
}
