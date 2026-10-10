"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getMsg } from "@/i18n/server";
import { authMessages } from "@/i18n/auth";
import { legalMessages } from "@/i18n/legal";
import { consentRecord } from "@/lib/consent";

type State = { error?: string; ok?: string; unconfirmed?: string } | undefined;

async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

async function translate(message: string) {
  const { errors } = await getMsg(authMessages);
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return errors.invalidLogin;
  if (m.includes("email not confirmed")) return errors.notConfirmed;
  if (m.includes("already registered")) return errors.alreadyRegistered;
  if (m.includes("password should be")) return errors.passwordShort;
  if (m.includes("rate limit") || m.includes("security purposes")) return errors.rateLimit;
  if (m.includes("same as the old")) return errors.samePassword;
  return errors.generic;
}

export async function signIn(_: State, formData: FormData): Promise<State> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")).trim(),
    password: String(formData.get("password")),
  });
  if (error) {
    const unconfirmed = error.message.toLowerCase().includes("email not confirmed");
    return { error: await translate(error.message), unconfirmed: unconfirmed ? String(formData.get("email")).trim() : undefined };
  }
  redirect("/");
}

export async function resendConfirmation(_: State, formData: FormData): Promise<State> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: String(formData.get("email")).trim(),
    options: { emailRedirectTo: `${await origin()}/auth/callback` },
  });
  if (error) return { error: await translate(error.message) };
  return { ok: (await getMsg(authMessages)).notices.resent };
}

// Обе галочки обязательны: согласие на обработку данных и подтверждение возраста с условиями.
function consentGiven(formData: FormData) {
  return formData.get("consent") === "on" && formData.get("adult") === "on";
}

export async function signUp(_: State, formData: FormData): Promise<State> {
  const password = String(formData.get("password"));
  if (password.length < 8) return { error: (await getMsg(authMessages)).errors.passwordShort };
  if (!consentGiven(formData)) return { error: (await getMsg(legalMessages)).consent.required };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email")).trim(),
    password,
    options: {
      data: { name: String(formData.get("name") || "").trim().slice(0, 60), consent: consentRecord(await getLocale()) },
      emailRedirectTo: `${await origin()}/auth/callback`,
    },
  });
  if (error) return { error: await translate(error.message) };
  if (data.session) redirect("/");
  return { ok: (await getMsg(authMessages)).notices.confirmSent };
}

export async function requestReset(_: State, formData: FormData): Promise<State> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(String(formData.get("email")).trim(), {
    redirectTo: `${await origin()}/auth/callback?next=/reset`,
  });
  if (error) return { error: await translate(error.message) };
  return { ok: (await getMsg(authMessages)).notices.resetSent };
}

export async function setNewPassword(_: State, formData: FormData): Promise<State> {
  const password = String(formData.get("password"));
  if (password.length < 8) return { error: (await getMsg(authMessages)).errors.passwordShort };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: await translate(error.message) };
  redirect("/?welcome=back");
}

// Согласие для тех, кто зарегистрировался раньше, чем оно появилось.
export async function acceptConsent(_: State, formData: FormData): Promise<State> {
  const { consent } = await getMsg(legalMessages);
  if (!consentGiven(formData)) return { error: consent.required };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { consent: consentRecord(await getLocale()) } });
  if (error) return { error: consent.failed };
  // Новый токен уже содержит отметку о согласии, иначе middleware вернул бы человека сюда.
  await supabase.auth.refreshSession();
  redirect("/");
}
