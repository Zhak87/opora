"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpPro } from "@/lib/auth-actions";
import { Field, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { ConsentChecks } from "@/components/ConsentChecks";
import { useMsg } from "@/i18n/client";
import { authMessages } from "@/i18n/auth";
import { cabinetMessages } from "@/i18n/cabinet";

// Регистрация психолога на странице «Для психологов»: аккаунт и сразу анкета.
export function ProSignupForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUpPro, undefined);
  const a = useMsg(authMessages);
  const m = useMsg(cabinetMessages).proJoin;
  if (state?.ok) {
    return (
      <div className="text-center">
        <h2 className="mb-3 font-serif text-[24px] text-ink">{a.signup.doneTitle}</h2>
        <p className="text-[15px] leading-relaxed text-ink-soft">{state.ok}</p>
        <p className="mt-3 text-sm text-ink-faint">{a.signup.doneHint}</p>
      </div>
    );
  }
  return (
    <>
      <h2 className="font-serif text-[24px] leading-tight text-ink">{m.formTitle}</h2>
      <p className="mb-6 mt-2 text-sm leading-relaxed text-ink-soft">{m.formLead}</p>
      <form action={action} className="space-y-4" data-pro-signup>
        <input type="hidden" name="next" value={next} />
        <Field label={m.name} name="name" autoComplete="name" placeholder={m.namePlaceholder} minLength={2} maxLength={60} required />
        <Field label={a.email} name="email" type="email" autoComplete="email" required />
        <Field label={a.password} name="password" type="password" autoComplete="new-password" minLength={8} placeholder={a.signup.passwordPlaceholder} required />
        <ConsentChecks />
        {state?.error && <Notice tone="error">{state.error}</Notice>}
        <SubmitButton className="w-full" pendingText={m.submitting}>{m.submit}</SubmitButton>
      </form>
      <p className="mt-5 text-center text-sm text-ink-soft">
        {m.have}{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-sky-deep hover:text-ink">
          {m.signIn}
        </Link>
      </p>
    </>
  );
}
