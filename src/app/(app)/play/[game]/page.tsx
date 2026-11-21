import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getGame, kindHref, movedHref } from "@/lib/games";
import { playMessages } from "@/i18n/play";
import { PracticeFlow } from "@/components/games/PracticeFlow";
import { BackIcon } from "@/components/icons";
import { BreathWave } from "@/components/games/BreathWave";
import { LightDraw } from "@/components/games/LightDraw";
import { Boundaries } from "@/components/games/Boundaries";
import { Grounding } from "@/components/games/Grounding";
import { ZenGarden } from "@/components/games/ZenGarden";
import { EmptyBowl } from "@/components/games/EmptyBowl";
import { ThoughtJar } from "@/components/games/ThoughtJar";
import { EmotionName } from "@/components/games/EmotionName";
import { requireUser } from "@/lib/supabase/server";
import { normalizeVoice } from "@/lib/voices";
import { getLocale, getMsg } from "@/i18n/server";

const COMPONENTS: Record<string, React.ComponentType> = {
  boundaries: Boundaries,
  garden: ZenGarden,
  "thought-jar": ThoughtJar,
  breath: BreathWave,
  grounding: Grounding,
  light: LightDraw,
  "empty-bowl": EmptyBowl,
  emotion: EmotionName,
};

// Практики, которые сами решают, когда закончиться (кнопку «Завершить» внизу не показываем).
const OWN_FINISH = new Set(["empty-bowl"]);

export default async function GamePage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  // Практики, переехавшие из каталога по аудиту 19.11.2026: старые ссылки ведут в новое место.
  const moved = movedHref(game);
  if (moved) redirect(moved);
  const meta = getGame(game, await getLocale());
  const Component = COMPONENTS[game];
  if (!meta || !Component) notFound();
  const { supabase, user } = await requireUser();
  const { data: profile } = user ? await supabase.from("profiles").select("voice").eq("id", user.id).maybeSingle() : { data: null };
  const p = await getMsg(playMessages);
  return (
    <>
      {/* «Назад» ведёт в ту вкладку, откуда пришли: игры или практики. */}
      <Link href={kindHref(meta.kind)} className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {p.page.tabs[meta.kind].label}
      </Link>
      <PracticeFlow game={meta} voice={normalizeVoice(profile?.voice)} ownFinish={OWN_FINISH.has(game)}>
        <Component />
      </PracticeFlow>
    </>
  );
}
