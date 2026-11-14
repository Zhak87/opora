import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { INTL } from "@/i18n/config";
import { dreamMessages } from "@/i18n/dreams";
import { loadDream, panelsLeft } from "@/lib/dream-data";
import { imageProvider } from "@/lib/dream-image";
import { isGuest } from "@/lib/trial";
import { BackIcon, TalkIcon } from "@/components/icons";
import { buttonStyles } from "@/components/ui";
import { StartForm } from "@/components/StartForm";
import { DreamFlow } from "@/components/dreams/DreamFlow";

// Один сон: сценарий, комикс и размышление. Виден только владельцу (проверяет база).
export default async function DreamPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ failed?: string; limit?: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const dream = await loadDream(supabase, id);
  if (!dream) notFound();
  const locale = await getLocale();
  const m = dreamMessages[locale];
  const { data: session } = await supabase.auth.getClaims();
  const left = await panelsLeft(supabase, isGuest(session?.claims));
  const date = new Intl.DateTimeFormat(INTL[locale], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${dream.date}T00:00:00Z`));
  const query = await searchParams;
  const shown = dream.status === "comic" || dream.status === "complete";

  return (
    <>
      <Link href="/dreams" className="mb-5 inline-flex items-center gap-2 text-sm text-ink-soft transition hover:text-ink">
        <BackIcon className="h-4 w-4" /> {m.back}
      </Link>
      <header className="mb-8 animate-rise">
        <p className="text-sm text-ink-faint">
          {date}
          {dream.type !== "usual" && ` · ${m.types[dream.type]}`}
        </p>
        <h1 className="mt-1 font-serif text-[28px] leading-[1.1] text-ink sm:text-[38px]">{dream.title || m.untitled}</h1>
        {dream.emotions.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-1.5">
            {dream.emotions.map((e) => (
              <span key={e.emotion} className="rounded-full bg-lilac-soft px-3 py-1 text-[13px] text-lilac-deep">
                {m.emotions[e.emotion]} · {e.intensity}
              </span>
            ))}
          </p>
        )}
      </header>
      <DreamFlow key={`${shown ? "comic" : "board"}-${dream.panels.map((p) => p.id).join()}`} dream={dream} imagesOn={imageProvider() !== null} left={left} failed={query.failed === "1"} limited={query.limit === "1"}>
        <StartForm prompt={m.reflect.talkPrompt(dream.title, dream.text.slice(0, 3000))} className={`${buttonStyles.soft} h-13`}>
          <TalkIcon className="h-5 w-5" /> {m.reflect.talk}
        </StartForm>
      </DreamFlow>
    </>
  );
}
