"use client";

import { useActionState } from "react";
import { setNewPassword } from "@/lib/auth-actions";
import { Field, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default function ResetPage() {
  const [state, action] = useActionState(setNewPassword, undefined);
  return (
    <>
      <h1 className="mb-1 font-serif text-[26px] text-ink">Новый пароль</h1>
      <p className="mb-7 text-[15px] text-ink-soft">Придумайте пароль, который будет легко вспомнить вам.</p>
      <form action={action} className="space-y-4">
        <Field label="Новый пароль" name="password" type="password" autoComplete="new-password" minLength={8} required />
        {state?.error && <Notice tone="error">{state.error}</Notice>}
        <SubmitButton className="w-full" pendingText="Сохраняем…">Сохранить и войти</SubmitButton>
      </form>
    </>
  );
}
