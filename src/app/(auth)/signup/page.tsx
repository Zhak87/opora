"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/lib/auth-actions";
import { Field, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default function SignupPage() {
  const [state, action] = useActionState(signUp, undefined);
  if (state?.ok) {
    return (
      <div className="text-center">
        <h1 className="mb-3 font-serif text-[26px] text-ink">Почти готово</h1>
        <p className="text-[15px] leading-relaxed text-ink-soft">{state.ok}</p>
        <Link href="/login" className="mt-6 inline-block text-sm text-sky-deep hover:text-ink">Вернуться ко входу</Link>
      </div>
    );
  }
  return (
    <>
      <h1 className="mb-1 font-serif text-[26px] text-ink">Ваше место</h1>
      <p className="mb-7 text-[15px] text-ink-soft">Разговоры и записи будут видны только вам.</p>
      <form action={action} className="space-y-4">
        <Field label="Как к вам обращаться" name="name" autoComplete="given-name" placeholder="Можно не указывать" />
        <Field label="Почта" name="email" type="email" autoComplete="email" required />
        <Field label="Пароль" name="password" type="password" autoComplete="new-password" minLength={8} placeholder="Не короче 8 символов" required />
        {state?.error && <Notice tone="error">{state.error}</Notice>}
        <SubmitButton className="w-full" pendingText="Создаём…">Создать аккаунт</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        Уже есть аккаунт? <Link href="/login" className="text-sky-deep hover:text-ink">Войти</Link>
      </p>
    </>
  );
}
