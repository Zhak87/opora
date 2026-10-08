import { notFound } from "next/navigation";
import { getGame } from "@/lib/games";
import { GameShell } from "@/components/games/GameShell";
import { Bubbles } from "@/components/games/Bubbles";
import { BreathWave } from "@/components/games/BreathWave";
import { LightDraw } from "@/components/games/LightDraw";
import { Values } from "@/components/games/Values";
import { WhatIf } from "@/components/games/WhatIf";
import { Wheel } from "@/components/games/Wheel";

const COMPONENTS: Record<string, React.ComponentType> = {
  bubbles: Bubbles,
  breath: BreathWave,
  light: LightDraw,
  values: Values,
  "what-if": WhatIf,
  wheel: Wheel,
};

export default async function GamePage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  const meta = getGame(game);
  const Component = COMPONENTS[game];
  if (!meta || !Component) notFound();
  return (
    <GameShell title={meta.title} hint={meta.hint}>
      <Component />
    </GameShell>
  );
}
