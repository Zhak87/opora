import { getLocale } from "@/i18n/server";
import { dreamMessages } from "@/i18n/dreams";
import { getTimeZone } from "@/lib/tz";
import { dayKey } from "@/lib/time";
import { DreamForm } from "@/components/dreams/DreamForm";
import { DreamBack } from "@/components/dreams/DreamJournal";

export default async function NewDreamPage() {
  const m = dreamMessages[await getLocale()];
  const today = dayKey(new Date(), await getTimeZone());
  return (
    <>
      <DreamBack>{m.back}</DreamBack>
      <DreamForm today={today} />
    </>
  );
}
