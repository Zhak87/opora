import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { INTL } from "@/i18n/config";
import { dreamMessages } from "@/i18n/dreams";
import { loadDream, panelsLeft } from "@/lib/dream-data";
import { imageProvider } from "@/lib/dream-image";
import { isGuest } from "@/lib/trial";
import { TalkIcon } from "@/components/icons";
import { StartForm } from "@/components/StartForm";
import { DreamFlow } from "@/components/dreams/DreamFlow";
import { DreamBack } from "@/components/dreams/DreamJournal";
import styles from "@/components/dreams/DreamJournal.module.css";

// Один сон: сценарий, комикс и размышление. Виден только владельцу (проверяет база).
export default async function DreamPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ failed?: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const dream = await loadDream(supabase, id);
  if (!dream) notFound();
  const locale = await getLocale();
  const m = dreamMessages[locale];
  const { data: session } = await supabase.auth.getClaims();
  const left = await panelsLeft(supabase, isGuest(session?.claims));
  const date = new Intl.DateTimeFormat(INTL[locale], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${dream.date}T00:00:00Z`));
  const shown = dream.status === "comic" || dream.status === "complete";

  return (
    <>
      <DreamBack>{m.back}</DreamBack>
      <header className="mb-6">
        <p className="mb-2 text-sm text-ink-soft">
          <time dateTime={dream.date}>{date}</time>
          {dream.type !== "usual" && ` · ${m.types[dream.type]}`}
        </p>
        <h1 className={styles.dreamTitle}>{dream.title || m.untitled}</h1>
        {dream.emotions.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-1.5">
            {dream.emotions.map((e) => (
              <span key={e.emotion} className={styles.tag}>
                {m.emotions[e.emotion]} · {e.intensity}
              </span>
            ))}
          </p>
        )}
      </header>
      <DreamFlow key={`${shown ? "comic" : "board"}-${dream.panels.map((p) => p.id).join()}`} dream={dream} imagesOn={imageProvider() !== null} left={left} failed={(await searchParams).failed === "1"}>
        <StartForm prompt={m.reflect.talkPrompt(dream.title, dream.text.slice(0, 3000))} className={styles.secondary}>
          <TalkIcon className="h-5 w-5" /> {m.reflect.talk}
        </StartForm>
      </DreamFlow>
    </>
  );
}
