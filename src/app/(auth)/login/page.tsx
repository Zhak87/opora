"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { signIn } from "@/lib/auth-actions";
import { Field, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

function LoginForm() {
  const [state, action] = useActionState(signIn, undefined);
  const expired = useSearchParams().get("link") === "expired";
  return (
    <>
      <h1 className="mb-1 font-serif text-[26px] text-ink">С возвращением</h1>
      <p className="mb-7 text-[15px] text-ink-soft">Рады видеть вас снова.</p>
      <form action={action} className="space-y-4">
        {expired && <Notice tone="error">Ссылка устарела или уже использована. Попробуйте ещё раз.</Notice>}
        <Field label="Почта" name="email" type="email" autoComplete="email" required />
        <Field label="Пароль" name="password" type="password" autoComplete="current-password" required />
        {state?.error && <Notice tone="error">{state.error}</Notice>}
        <SubmitButton className="w-full" pendingText="Входим…">Войти</SubmitButton>
      </form>
      <div className="mt-6 flex flex-col items-center gap-2 text-sm text-ink-soft">
        <Link href="/forgot" className="hover:text-ink">Забыли пароль?</Link>
        <p>
          Впервые здесь?{" "}
          <Link href="/signup" className="text-sky-deep hover:text-ink">Создать аккаунт</Link>
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
