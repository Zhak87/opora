import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { dreamMessages } from "@/i18n/dreams";
import { loadDream } from "@/lib/dream-data";
import { getTimeZone } from "@/lib/tz";
import { dayKey } from "@/lib/time";
import { BackIcon } from "@/components/icons";
import { DreamForm } from "@/components/dreams/DreamForm";

export default async function EditDreamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const dream = await loadDream(supabase, id);
  if (!dream) notFound();
  const m = dreamMessages[await getLocale()];
  const today = dayKey(new Date(), await getTimeZone());
  return (
    <>
      <Link href={`/dreams/${dream.id}`} className="mb-5 inline-flex items-center gap-2 text-sm text-ink-soft transition hover:text-ink">
        <BackIcon className="h-4 w-4" /> {dream.title || m.untitled}
      </Link>
      <DreamForm dream={dream} today={today} />
    </>
  );
}
