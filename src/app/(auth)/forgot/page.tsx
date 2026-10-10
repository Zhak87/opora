"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestReset } from "@/lib/auth-actions";
import { Field, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { useMsg } from "@/i18n/client";
import { authMessages } from "@/i18n/auth";

export default function ForgotPage() {
  const [state, action] = useActionState(requestReset, undefined);
  const m = useMsg(authMessages);
  return (
    <>
      <h1 className="mb-1 font-serif text-[26px] text-ink">{m.forgot.title}</h1>
      <p className="mb-7 text-[15px] text-ink-soft">{m.forgot.subtitle}</p>
      {state?.ok ? (
        <Notice>{state.ok}</Notice>
      ) : (
        <form action={action} className="space-y-4">
          <Field label={m.email} name="email" type="email" autoComplete="email" required />
          {state?.error && <Notice tone="error">{state.error}</Notice>}
          <SubmitButton className="w-full" pendingText={m.forgot.submitting}>{m.forgot.submit}</SubmitButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-ink-soft hover:text-ink">{m.backToLogin}</Link>
      </p>
    </>
  );
}
