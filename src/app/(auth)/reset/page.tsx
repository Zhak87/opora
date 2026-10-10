"use client";

import { useActionState } from "react";
import { setNewPassword } from "@/lib/auth-actions";
import { Field, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { useMsg } from "@/i18n/client";
import { authMessages } from "@/i18n/auth";

export default function ResetPage() {
  const [state, action] = useActionState(setNewPassword, undefined);
  const m = useMsg(authMessages);
  return (
    <>
      <h1 className="mb-1 font-serif text-[26px] text-ink">{m.reset.title}</h1>
      <p className="mb-7 text-[15px] text-ink-soft">{m.reset.subtitle}</p>
      <form action={action} className="space-y-4">
        <Field label={m.reset.label} name="password" type="password" autoComplete="new-password" minLength={8} required />
        {state?.error && <Notice tone="error">{state.error}</Notice>}
        <SubmitButton className="w-full" pendingText={m.reset.submitting}>{m.reset.submit}</SubmitButton>
      </form>
    </>
  );
}
