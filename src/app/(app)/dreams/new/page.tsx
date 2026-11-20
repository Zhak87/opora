import { getLocale } from "@/i18n/server";
import { dreamMessages } from "@/i18n/dreams";
import { getTimeZone } from "@/lib/tz";
import { dayKey } from "@/lib/time";
import { DreamForm } from "@/components/dreams/DreamForm";
import { requireUser } from "@/lib/supabase/server";
import { dreamLimits } from "@/lib/dream-data";
import { isGuest } from "@/lib/trial";
import { DreamBack } from "@/components/dreams/DreamJournal";

export default async function NewDreamPage() {
  const m = dreamMessages[await getLocale()];
  const today = dayKey(new Date(), await getTimeZone());
  const { supabase } = await requireUser();
  const { data: session } = await supabase.auth.getClaims();
  const limits = await dreamLimits(supabase, isGuest(session?.claims));
  return (
    <>
      <DreamBack>{m.back}</DreamBack>
      <DreamForm today={today} limits={limits} />
    </>
  );
}
