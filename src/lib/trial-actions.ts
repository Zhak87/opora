"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { getLocale, getMsg } from "@/i18n/server";
import { authMessages } from "@/i18n/auth";
import { legalMessages } from "@/i18n/legal";
import { trialMessages } from "@/i18n/trial";
import { consentRecord } from "@/lib/consent";
import { clientIp, tooMany } from "@/lib/rate-limit";
import { siteOrigin } from "@/lib/site-origin";
import { GUIDE_COOKIE } from "@/lib/guide";
import { TRIAL_COOKIE, TRIAL_MINUTES, isGuest } from "@/lib/trial";

const DAY = 24 * 60 * 60 * 1000;
// С одного адреса за сутки: защита от бесконечных пробных аккаунтов и перерасхода ИИ.
const STARTS_PER_DAY = 6;

// «Попробовать»: создаёт гостевой аккаунт на 20 минут и ведёт в приложение.
export async function startTrial(formData: FormData) {
  const supabase = await createClient();
  const { data: current } = await supabase.auth.getClaims();
  if (current?.claims) redirect("/");

  const jar = await cookies();
  if (jar.get(TRIAL_COOKIE)) redirect("/trial?state=used");
  // Срок пробного доступа ставит сервер служебным ключом; без него гостей не пускаем.
  if (!adminConfigured()) redirect("/trial?state=unavailable");
  const h = await headers();
  if (tooMany(`trial:${clientIp(new Request("http://x", { headers: h }))}`, STARTS_PER_DAY, DAY)) redirect("/trial?state=busy");

  const { data, error } = await supabase.auth.signInAnonymously({
    options: { data: { consent: consentRecord(await getLocale()) } },
  });
  if (error || !data.user) redirect("/trial?state=unavailable");

  const until = new Date(Date.now() + TRIAL_MINUTES * 60_000).toISOString();
  const { error: metaError } = await createAdminClient().auth.admin.updateUserById(data.user.id, { app_metadata: { trial_until: until } });
  if (metaError) {
    await supabase.auth.signOut();
    redirect("/trial?state=unavailable");
  }
  // Новый токен уже несёт срок пробного доступа.
  await supabase.auth.refreshSession();
  // Кто пришёл из знакомства, второй раз его не смотрит.
  if (formData.get("guide") === "seen") jar.set(GUIDE_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 365 * 2, sameSite: "lax" });
  jar.set(TRIAL_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  redirect("/");
}

type State = { error?: string; sent?: string } | undefined;

// Гость создаёт аккаунт: к тому же пользователю привязываются почта и пароль, поэтому разговоры и записи остаются.
// Аккаунт становится обычным после перехода по ссылке из письма.
export async function convertGuest(_: State, formData: FormData): Promise<State> {
  const auth = await getMsg(authMessages);
  const t = await getMsg(trialMessages);
  const password = String(formData.get("password"));
  const email = String(formData.get("email")).trim();
  if (password.length < 8) return { error: auth.errors.passwordShort };
  if (formData.get("consent") !== "on" || formData.get("adult") !== "on") return { error: (await getMsg(legalMessages)).consent.required };

  const supabase = await createClient();
  const { data: current } = await supabase.auth.getClaims();
  if (!isGuest(current?.claims)) redirect("/");

  const name = String(formData.get("name") || "").trim().slice(0, 60);
  const { data, error } = await supabase.auth.updateUser(
    { email, password, data: { name, consent: consentRecord(await getLocale()) } },
    { emailRedirectTo: `${siteOrigin(await headers())}/auth/callback` },
  );
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("already") || m.includes("exists")) return { error: t.form.taken };
    if (m.includes("password should be")) return { error: auth.errors.passwordShort };
    if (m.includes("rate limit") || m.includes("security purposes")) return { error: auth.errors.rateLimit };
    return { error: auth.errors.generic };
  }
  if (name) await supabase.from("profiles").update({ name }).eq("id", data.user.id);
  // Если подтверждение почты на сервере выключено, аккаунт готов сразу.
  if (!data.user.is_anonymous) {
    await supabase.auth.refreshSession();
    redirect("/");
  }
  return { sent: email };
}

// Гость уходит и ничего не оставляет: его временный аккаунт и все данные удаляются сразу.
export async function leaveTrial() {
  const supabase = await createClient();
  const { data: current } = await supabase.auth.getClaims();
  if (isGuest(current?.claims)) await supabase.rpc("delete_own_account");
  await supabase.auth.signOut();
  redirect("/welcome");
}
