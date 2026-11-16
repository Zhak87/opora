import { requireUser } from "@/lib/supabase/server";
import { myPsychologist } from "@/lib/pro";
import { getSession, UUID_RE } from "@/lib/sessions";
import { getLocale } from "@/i18n/server";
import { buildPrep } from "./prep";

// Для мобильного приложения: то, что сайт собирает на сервере перед звонком психолога (панель «Подготовка»).
// Только психолог этой встречи; остальные получают null.
export async function consultPrep(id: string) {
  if (!UUID_RE.test(id)) return null;
  const { supabase, user } = await requireUser();
  if (!user) return null;
  const s = await getSession(supabase, id);
  if (!s || s.psychologist_id !== user.id) return null;
  const me = await myPsychologist(supabase, user.id);
  return buildPrep(supabase, s, await getLocale(), me?.timezone ?? "Asia/Almaty");
}
