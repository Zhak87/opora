"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestReset } from "@/lib/auth-actions";
import { Field, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default function ForgotPage() {
  const [state, action] = useActionState(requestReset, undefined);
  return (
    <>
      <h1 className="mb-1 font-serif text-[26px] text-ink">Восстановить доступ</h1>
      <p className="mb-7 text-[15px] text-ink-soft">Пришлём ссылку, чтобы задать новый пароль.</p>
      {state?.ok ? (
        <Notice>{state.ok}</Notice>
      ) : (
        <form action={action} className="space-y-4">
          <Field label="Почта" name="email" type="email" autoComplete="email" required />
          {state?.error && <Notice tone="error">{state.error}</Notice>}
          <SubmitButton className="w-full" pendingText="Отправляем…">Отправить ссылку</SubmitButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-ink-soft hover:text-ink">Вернуться ко входу</Link>
      </p>
    </>
  );
}
