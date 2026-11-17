import { requireUser } from "@/lib/supabase/server";
import { currentProgram, myScreenings } from "@/lib/program-data";
import { myCare } from "@/lib/pro";
import { ProgramView, type CareInfo } from "@/components/program/Program";

// Программа «Пять шагов» (собеседник v3, раздел 7).
export default async function ProgramPage() {
  const { supabase, user } = await requireUser();
  const [program, screenings, care] = await Promise.all([
    currentProgram(supabase),
    myScreenings(supabase),
    user ? myCare(supabase, user.id) : Promise.resolve([]),
  ]);
  const active = care.find((c) => c.link.status === "active" && c.psychologist);
  const info: CareInfo = active
    ? { psychologistId: active.link.psychologist_id, linkId: active.link.id, name: active.psychologist!.full_name, wellbeing: active.scopes.includes("wellbeing") }
    : null;
  return <ProgramView program={program} screenings={screenings} care={info} />;
}
