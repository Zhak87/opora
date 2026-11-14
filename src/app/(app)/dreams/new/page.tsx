import Link from "next/link";
import { getLocale } from "@/i18n/server";
import { dreamMessages } from "@/i18n/dreams";
import { getTimeZone } from "@/lib/tz";
import { dayKey } from "@/lib/time";
import { BackIcon } from "@/components/icons";
import { DreamForm } from "@/components/dreams/DreamForm";
import { requireUser } from "@/lib/supabase/server";
import { dreamLimits } from "@/lib/dream-data";
import { isGuest } from "@/lib/trial";

export default async function NewDreamPage() {
  const m = dreamMessages[await getLocale()];
  const today = dayKey(new Date(), await getTimeZone());
  const { supabase } = await requireUser();
  const { data: session } = await supabase.auth.getClaims();
  const limits = await dreamLimits(supabase, isGuest(session?.claims));
  return (
    <>
      <Link href="/dreams" className="mb-5 inline-flex items-center gap-2 text-sm text-ink-soft transition hover:text-ink">
        <BackIcon className="h-4 w-4" /> {m.back}
      </Link>
      <DreamForm today={today} limits={limits} />
    </>
  );
}
