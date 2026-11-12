"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { getSession, UUID_RE } from "@/lib/sessions";
import { HOUR, tooMany } from "@/lib/rate-limit";
import { getLocale } from "@/i18n/server";
import { consultMessages } from "@/i18n/consult";
import { consultAiEnabled } from "./server";
import { buildDraft, draftExpires, DRAFT_KEYS, emptyDraft, type Draft } from "./assistant";

type State = { ok?: string; error?: string; draft?: Draft } | undefined;

async function mine(id: string) {
  if (!UUID_RE.test(id)) return null;
  const { supabase, user } = await requireUser();
  if (!user) return null;
  const s = await getSession(supabase, id);
  if (!s || s.psychologist_id !== user.id) return null;
  return { supabase, s, user };
}

// Черновик итогов с ИИ. При сбое ИИ ничего не теряется: психолог заполняет черновик вручную.
export async function generateDraft(_: State, formData: FormData): Promise<State> {
  const m = consultMessages[await getLocale()].draft;
  const ctx = await mine(String(formData.get("session") ?? ""));
  if (!ctx) return { error: m.failed };
  if (!consultAiEnabled()) return { error: m.aiOff };
  if (tooMany(`consult-draft:${ctx.user.id}`, 20, HOUR)) return { error: m.failed };
  let draft: Draft;
  try {
    draft = await buildDraft(ctx.supabase, ctx.s, await getLocale());
  } catch (e) {
    console.error("consult draft failed", (e as { status?: number }).status ?? "error");
    return { error: m.failed };
  }
  const { error } = await ctx.supabase.from("consult_drafts").upsert({
    session_id: ctx.s.id,
    psychologist_id: ctx.user.id,
    body: draft,
    source: "ai",
    updated_at: new Date().toISOString(),
    expires_at: draftExpires(ctx.s),
  });
  if (error) return { error: m.failed };
  revalidatePath(`/pro/sessions/${ctx.s.id}`);
  return { ok: m.saved, draft };
}

// Ручное сохранение: каждая строка поля — отдельный пункт. Строки, начинающиеся с «~», — предположения.
export async function saveDraft(_: State, formData: FormData): Promise<State> {
  const m = consultMessages[await getLocale()].draft;
  const ctx = await mine(String(formData.get("session") ?? ""));
  if (!ctx) return { error: m.failed };
  const draft = emptyDraft();
  for (const k of DRAFT_KEYS) {
    draft[k] = String(formData.get(k) ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 20)
      .map((l) => (l.startsWith("~") ? { text: l.slice(1).trim().slice(0, 500), assumption: true } : { text: l.slice(0, 500) }))
      .filter((x) => x.text);
  }
  const { data: prev } = await ctx.supabase.from("consult_drafts").select("source").eq("session_id", ctx.s.id).maybeSingle();
  const { error } = await ctx.supabase.from("consult_drafts").upsert({
    session_id: ctx.s.id,
    psychologist_id: ctx.user.id,
    body: draft,
    source: prev?.source ?? "manual",
    updated_at: new Date().toISOString(),
    expires_at: draftExpires(ctx.s),
  });
  if (error) return { error: m.failed };
  revalidatePath(`/pro/sessions/${ctx.s.id}`);
  return { ok: m.saved, draft };
}

// Удалить всё приватное по встрече: расшифровку, подсказки, вопросы и черновик.
export async function deleteConsultData(formData: FormData) {
  const ctx = await mine(String(formData.get("session") ?? ""));
  if (!ctx) return;
  await Promise.all([
    ctx.supabase.from("consult_transcript").delete().eq("session_id", ctx.s.id),
    ctx.supabase.from("consult_ai_messages").delete().eq("session_id", ctx.s.id),
    ctx.supabase.from("consult_drafts").delete().eq("session_id", ctx.s.id),
  ]);
  revalidatePath(`/pro/sessions/${ctx.s.id}`);
}
