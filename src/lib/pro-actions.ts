"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { hasConsent } from "@/lib/consent";
import { getLocale } from "@/i18n/server";
import { careMessages } from "@/i18n/care";
import { proMessages, SPECIALIZATIONS, SESSION_LANGUAGES, FORMATS, CURRENCIES } from "@/i18n/pro";
import { CARE_CONSENT_VERSION, SLUG_RE, isScope, myPsychologist, slugify, type Education } from "@/lib/pro";

async function authed() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/welcome");
  return { supabase, user };
}

async function errors() {
  return proMessages[await getLocale()].profile.errors;
}

const pick = <T extends string>(values: FormDataEntryValue[], allowed: readonly T[]) =>
  [...new Set(values.map(String))].filter((v): v is T => (allowed as readonly string[]).includes(v));

const text = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? "").trim().slice(0, max);

const int = (formData: FormData, key: string, min: number, max: number) => {
  const raw = String(formData.get(key) ?? "").replace(/\s/g, "");
  if (!raw) return null;
  const n = Math.round(Number(raw));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};

// «КазНУ, психология, 2015» → { institution: "КазНУ", degree: "психология", year: 2015 }
function parseEducation(raw: string): Education[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((line) => {
      const parts = line.split(",").map((p) => p.trim()).filter(Boolean);
      const last = parts[parts.length - 1];
      const year = parts.length > 1 && /^(19|20)\d{2}$/.test(last) ? Number(parts.pop()) : null;
      const [institution, ...rest] = parts;
      return { institution: (institution ?? line).slice(0, 200), degree: rest.join(", ").slice(0, 200), year };
    });
}

/* ---------- Анкета ---------- */

export async function createPsychologist() {
  const { supabase, user } = await authed();
  if (await myPsychologist(supabase, user.id)) redirect("/pro");
  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
  const base = slugify(profile?.name ?? "") || "psy";
  for (let i = 0; i < 4; i++) {
    const slug = (i === 0 && base.length >= 3 ? base : `${base}-${randomBytes(2).toString("hex")}`).slice(0, 40);
    const { error } = await supabase.from("psychologists").insert({ user_id: user.id, slug, full_name: profile?.name ?? "" });
    if (!error) break;
    if (error.code !== "23505") throw new Error((await errors()).generic);
  }
  redirect("/pro/profile");
}

type State = { ok?: string; error?: string } | undefined;

export async function savePsychologist(_: State, formData: FormData): Promise<State> {
  const { supabase, user } = await authed();
  const locale = await getLocale();
  const m = proMessages[locale].profile;
  const slug = text(formData, "slug", 40).toLowerCase();
  if (!SLUG_RE.test(slug)) return { error: m.errors.slugFormat };

  const update = {
    slug,
    full_name: text(formData, "full_name", 120),
    headline: text(formData, "headline", 160),
    about: text(formData, "about", 4000),
    approach: text(formData, "approach", 4000),
    specializations: pick(formData.getAll("specializations"), SPECIALIZATIONS),
    education: parseEducation(text(formData, "education", 3000)),
    experience_years: int(formData, "experience_years", 0, 70),
    languages: pick(formData.getAll("languages"), SESSION_LANGUAGES),
    formats: pick(formData.getAll("formats"), FORMATS),
    city: text(formData, "city", 80) || null,
    price: int(formData, "price", 0, 10_000_000),
    currency: pick([formData.get("currency") ?? "KZT"], CURRENCIES)[0] ?? "KZT",
    session_minutes: int(formData, "session_minutes", 20, 180) ?? 50,
    accepting_clients: formData.get("accepting_clients") === "on",
  };
  if (!update.languages.length) update.languages = [locale];
  if (!update.formats.length) update.formats = ["online"];

  const { error } = await supabase.from("psychologists").update(update).eq("user_id", user.id);
  if (error) return { error: error.code === "23505" ? m.errors.slugTaken : m.errors.generic };
  revalidatePath("/pro", "layout");

  if (formData.get("intent") === "submit") {
    if (formData.get("terms") !== "on") return { error: m.errors.terms };
    const { error: submitError } = await supabase.rpc("submit_psychologist");
    if (submitError) return { error: /incomplete/.test(submitError.message) ? m.errors.incomplete : m.errors.generic };
  }
  revalidatePath("/pro", "layout");
  return { ok: m.saved };
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export async function uploadPhoto(_: State, formData: FormData): Promise<State> {
  const { supabase, user } = await authed();
  const m = proMessages[await getLocale()].profile;
  const file = formData.get("photo");
  if (!(file instanceof File) || !IMAGE_TYPES.includes(file.type) || file.size > 3 * 1024 * 1024 || file.size === 0) {
    return { error: m.errors.file };
  }
  const path = `${user.id}/photo-${Date.now()}.${EXT[file.type]}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: m.errors.file };
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const { data: old } = await supabase.from("psychologists").select("photo_url").eq("user_id", user.id).single();
  await supabase.from("psychologists").update({ photo_url: data.publicUrl }).eq("user_id", user.id);
  // Старое фото больше не нужно.
  const oldPath = old?.photo_url?.split("/avatars/")[1];
  if (oldPath?.startsWith(`${user.id}/`)) await supabase.storage.from("avatars").remove([oldPath]);
  revalidatePath("/pro", "layout");
  return { ok: m.saved };
}

export async function uploadDocument(_: State, formData: FormData): Promise<State> {
  const { supabase, user } = await authed();
  const m = proMessages[await getLocale()].profile;
  const file = formData.get("document");
  if (!(file instanceof File) || !EXT[file.type] || file.size > 10 * 1024 * 1024 || file.size === 0) return { error: m.errors.file };
  const safe = file.name.replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 60) || "document";
  const path = `${user.id}/${Date.now()}-${safe}.${EXT[file.type]}`;
  const { error } = await supabase.storage.from("credentials").upload(path, file, { contentType: file.type });
  if (error) return { error: m.errors.file };
  revalidatePath("/pro/profile");
  return { ok: m.saved };
}

export async function deleteDocument(formData: FormData) {
  const { supabase, user } = await authed();
  const name = String(formData.get("name") ?? "");
  if (!name || name.includes("/")) return;
  await supabase.storage.from("credentials").remove([`${user.id}/${name}`]);
  revalidatePath("/pro/profile");
}

/* ---------- Приглашения ---------- */

export async function createInvite(_: State, formData: FormData): Promise<State> {
  const { supabase } = await authed();
  const code = randomBytes(9).toString("base64url");
  const { error } = await supabase.from("invites").insert({ code, label: text(formData, "label", 80) });
  if (error) return { error: proMessages[await getLocale()].profile.errors.generic };
  revalidatePath("/pro/invites");
  return { ok: code };
}

export async function revokeInvite(formData: FormData) {
  const { supabase } = await authed();
  await supabase.from("invites").update({ revoked_at: new Date().toISOString() }).eq("id", String(formData.get("id")));
  revalidatePath("/pro/invites");
}

/* ---------- Клиенты ---------- */

// Завершить работу может любая сторона; база отзывает все согласия.
export async function endLink(formData: FormData) {
  const { supabase } = await authed();
  const back = String(formData.get("back") ?? "");
  await supabase.rpc("end_link", { p_link: String(formData.get("link")) });
  revalidatePath("/", "layout");
  redirect(back === "pro" ? "/pro/clients" : "/care?ended=1");
}

/* ---------- Сторона клиента ---------- */

type AcceptState = { error?: string } | undefined;

export async function acceptInvite(_: AcceptState, formData: FormData): Promise<AcceptState> {
  const { supabase, user } = await authed();
  const m = careMessages[await getLocale()].invite;
  if (formData.get("understand") !== "on") return { error: m.understand };
  // Без общего согласия на обработку данных подключаться к специалисту нельзя.
  const { data: auth } = await supabase.auth.getClaims();
  if (!hasConsent(auth?.claims)) redirect("/consent");
  const code = String(formData.get("code") ?? "");
  const scopes = formData.getAll("scopes").map(String).filter(isScope);
  const name = text(formData, "name", 60);
  if (name) await supabase.from("profiles").update({ name }).eq("id", user.id);
  const { error } = await supabase.rpc("accept_invite", { p_code: code, p_scopes: scopes, p_version: CARE_CONSENT_VERSION });
  if (error) return { error: m.failed };
  revalidatePath("/", "layout");
  redirect("/care?joined=1");
}

export async function setConsent(formData: FormData) {
  const { supabase } = await authed();
  const scope = String(formData.get("scope"));
  if (!isScope(scope)) return;
  await supabase.rpc("set_consent", {
    p_link: String(formData.get("link")),
    p_scope: scope,
    p_granted: formData.get("granted") === "1",
    p_version: CARE_CONSENT_VERSION,
  });
  revalidatePath("/care");
}

/* ---------- Администратор ---------- */

export async function reviewPsychologist(formData: FormData) {
  const { supabase } = await authed();
  const status = String(formData.get("status"));
  if (!["approved", "rejected", "suspended"].includes(status)) return;
  await supabase.rpc("review_psychologist", {
    p_user: String(formData.get("user")),
    p_status: status,
    p_note: text(formData, "note", 2000) || null,
  });
  revalidatePath("/admin/psychologists");
}

export async function countInviteView(code: string) {
  if (typeof code !== "string" || !/^[A-Za-z0-9_-]{8,32}$/.test(code)) return;
  const { supabase } = await requireUser();
  await supabase.rpc("count_invite_view", { p_code: code });
}
