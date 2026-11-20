import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame, isTool, TOOL_HOME, TOOLS } from "@/lib/games";
import { ToolFlow } from "@/components/games/PracticeFlow";
import { BackIcon } from "@/components/icons";
import { Letter } from "@/components/games/Letter";
import { Unsaid } from "@/components/games/Unsaid";
import { Wins } from "@/components/games/Wins";
import { Strengths } from "@/components/games/Strengths";
import { Wheel } from "@/components/games/Wheel";
import { Compass } from "@/components/games/Compass";
import { OneStep } from "@/components/games/OneStep";
import { Mirror } from "@/components/games/Mirror";
import { requireUser } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/server";
import { playMessages } from "@/i18n/play";

const COMPONENTS = {
  letter: Letter,
  unsaid: Unsaid,
  day: Wins,
  strengths: Strengths,
  wheel: Wheel,
  compass: Compass,
  step: OneStep,
  mirror: Mirror,
} satisfies Record<keyof typeof TOOLS, React.ComponentType>;

export const maxDuration = 60;

// Инструменты, переехавшие из каталога игр (аудит 19.11.2026): письма — в дневник, победы и хорошее — в «Мой день»,
// колесо, компас и шаг — в планирование, сильные стороны — в профиль, зеркало — в «Разобраться в себе».
export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  if (!isTool(tool)) notFound();
  await requireUser();
  const locale = await getLocale();
  const p = playMessages[locale];
  const base = getGame(TOOLS[tool], locale)!;
  const meta = tool === "day" ? { ...base, title: p.day.title, hint: p.day.intro } : base;
  const home = TOOL_HOME[tool];
  const Component = COMPONENTS[tool];
  return (
    <>
      <Link href={home.href} className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {p.tools.back[home.place]}
      </Link>
      <ToolFlow game={meta}>
        <Component />
      </ToolFlow>
    </>
  );
}
