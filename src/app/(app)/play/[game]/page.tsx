import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame } from "@/lib/games";
import { PracticeFlow } from "@/components/games/PracticeFlow";
import { BackIcon } from "@/components/icons";
import { Bubbles } from "@/components/games/Bubbles";
import { BreathWave } from "@/components/games/BreathWave";
import { LightDraw } from "@/components/games/LightDraw";
import { Values } from "@/components/games/Values";
import { WhatIf } from "@/components/games/WhatIf";
import { Wheel } from "@/components/games/Wheel";
import { Grounding } from "@/components/games/Grounding";
import { GratitudeJar } from "@/components/games/GratitudeJar";
import { ZenGarden } from "@/components/games/ZenGarden";
import { Strengths } from "@/components/games/Strengths";
import { Letter } from "@/components/games/Letter";
import { EmptyBowl } from "@/components/games/EmptyBowl";
import { ThoughtJar } from "@/components/games/ThoughtJar";
import { EmotionName } from "@/components/games/EmotionName";
import { OneStep } from "@/components/games/OneStep";
import { TalkOut } from "@/components/games/TalkOut";
import { requireUser } from "@/lib/supabase/server";
import { normalizeVoice } from "@/lib/voices";
import { getLocale, getMsg } from "@/i18n/server";
import { gamesMessages } from "@/i18n/games";

const COMPONENTS: Record<string, React.ComponentType> = {
  "empty-bowl": EmptyBowl,
  "thought-jar": ThoughtJar,
  emotion: EmotionName,
  "one-step": OneStep,
  "talk-out": TalkOut,
  bubbles: Bubbles,
  breath: BreathWave,
  light: LightDraw,
  values: Values,
  "what-if": WhatIf,
  wheel: Wheel,
  grounding: Grounding,
  jar: GratitudeJar,
  garden: ZenGarden,
  strengths: Strengths,
  letter: Letter,
};

// Практики, которые сами решают, когда закончиться (кнопку «Завершить» внизу не показываем).
const OWN_FINISH = new Set(["empty-bowl", "talk-out"]);

export default async function GamePage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  const meta = getGame(game, await getLocale());
  const Component = COMPONENTS[game];
  if (!meta || !Component) notFound();
  const { supabase, user } = await requireUser();
  const { data: profile } = user ? await supabase.from("profiles").select("voice").eq("id", user.id).maybeSingle() : { data: null };
  const m = await getMsg(gamesMessages);
  return (
    <>
      <Link href="/play" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {m.shell.back}
      </Link>
      <PracticeFlow game={meta} voice={normalizeVoice(profile?.voice)} ownFinish={OWN_FINISH.has(game)}>
        <Component />
      </PracticeFlow>
    </>
  );
}
