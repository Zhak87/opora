import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { dreamMessages } from "@/i18n/dreams";
import { loadDream } from "@/lib/dream-data";
import { getTimeZone } from "@/lib/tz";
import { dayKey } from "@/lib/time";
import { DreamForm } from "@/components/dreams/DreamForm";
import { DreamBack } from "@/components/dreams/DreamJournal";

export default async function EditDreamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const dream = await loadDream(supabase, id);
  if (!dream) notFound();
  const m = dreamMessages[await getLocale()];
  const today = dayKey(new Date(), await getTimeZone());
  return (
    <>
      <DreamBack href={`/dreams/${dream.id}`}>{dream.title || m.untitled}</DreamBack>
      <DreamForm dream={dream} today={today} />
    </>
  );
}
