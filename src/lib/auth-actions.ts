"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type State = { error?: string; ok?: string; unconfirmed?: string } | undefined;

async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

function translate(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Неверная почта или пароль.";
  if (m.includes("email not confirmed")) return "Почта ещё не подтверждена. Проверьте письмо от нас.";
  if (m.includes("already registered")) return "Такая почта уже зарегистрирована. Попробуйте войти.";
  if (m.includes("password should be")) return "Пароль должен быть не короче 8 символов.";
  if (m.includes("rate limit") || m.includes("security purposes"))
    return "Слишком много попыток. Подождите немного и попробуйте снова.";
  if (m.includes("same as the old")) return "Новый пароль совпадает со старым.";
  return "Что-то пошло не так. Попробуйте ещё раз.";
}

export async function signIn(_: State, formData: FormData): Promise<State> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")).trim(),
    password: String(formData.get("password")),
  });
  if (error) {
    const unconfirmed = error.message.toLowerCase().includes("email not confirmed");
    return { error: translate(error.message), unconfirmed: unconfirmed ? String(formData.get("email")).trim() : undefined };
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
  if (error) return { error: translate(error.message) };
  return { ok: "Письмо отправлено ещё раз. Проверьте почту, в том числе папку «Спам»." };
}

export async function signUp(_: State, formData: FormData): Promise<State> {
  const password = String(formData.get("password"));
  if (password.length < 8) return { error: "Пароль должен быть не короче 8 символов." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email")).trim(),
    password,
    options: {
      data: { name: String(formData.get("name") || "").trim() },
      emailRedirectTo: `${await origin()}/auth/callback`,
    },
  });
  if (error) return { error: translate(error.message) };
  if (data.session) redirect("/");
  return { ok: "Мы отправили письмо для подтверждения. Откройте его, чтобы войти." };
}

export async function requestReset(_: State, formData: FormData): Promise<State> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(String(formData.get("email")).trim(), {
    redirectTo: `${await origin()}/auth/callback?next=/reset`,
  });
  if (error) return { error: translate(error.message) };
  return { ok: "Если такая почта зарегистрирована, мы отправили на неё ссылку для восстановления." };
}

export async function setNewPassword(_: State, formData: FormData): Promise<State> {
  const password = String(formData.get("password"));
  if (password.length < 8) return { error: "Пароль должен быть не короче 8 символов." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: translate(error.message) };
  redirect("/?welcome=back");
}
