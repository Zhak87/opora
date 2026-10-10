"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { resendConfirmation, signIn } from "@/lib/auth-actions";
import { Field, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { DemoNote } from "@/components/DemoNote";

function ResendForm({ email }: { email?: string }) {
  const [state, action] = useActionState(resendConfirmation, undefined);
  if (state?.ok) return <Notice>{state.ok}</Notice>;
  return (
    <form action={action} className="space-y-3 rounded-2xl bg-sand/60 p-4">
      <p className="text-sm leading-relaxed text-ink-soft">Можно отправить письмо для подтверждения ещё раз.</p>
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <Field label="Почта" name="email" type="email" autoComplete="email" required />
      )}
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton variant="soft" className="h-11 w-full" pendingText="Отправляем…">
        Отправить письмо ещё раз
      </SubmitButton>
    </form>
  );
}

function LoginForm() {
  const [state, action] = useActionState(signIn, undefined);
  const expired = useSearchParams().get("link") === "expired";
  return (
    <>
      <h1 className="mb-1 font-serif text-[26px] text-ink">С возвращением</h1>
      <p className="mb-7 text-[15px] text-ink-soft">Рады видеть вас снова.</p>
      <DemoNote />
      <div className="space-y-4">
        {expired && (
          <>
            <Notice tone="error">Ссылка из письма устарела или уже была использована.</Notice>
            <p className="text-sm leading-relaxed text-ink-soft">
              Если почта уже подтверждена, просто войдите. Если нет, отправьте письмо ещё раз.
            </p>
          </>
        )}
        <form action={action} className="space-y-4">
          <Field label="Почта" name="email" type="email" autoComplete="email" required />
          <Field label="Пароль" name="password" type="password" autoComplete="current-password" required />
          {state?.error && <Notice tone="error">{state.error}</Notice>}
          <SubmitButton className="w-full" pendingText="Входим…">Войти</SubmitButton>
        </form>
        {(state?.unconfirmed || expired) && <ResendForm email={state?.unconfirmed} />}
      </div>
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
