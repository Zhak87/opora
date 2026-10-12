"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/lib/auth-actions";
import { Field, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { DemoNote } from "@/components/DemoNote";
import { ConsentChecks } from "@/components/ConsentChecks";
import { useMsg } from "@/i18n/client";
import { authMessages } from "@/i18n/auth";

export default function SignupPage() {
  const [state, action] = useActionState(signUp, undefined);
  const m = useMsg(authMessages);
  if (state?.ok) {
    return (
      <div className="text-center">
        <h1 className="mb-3 font-serif text-[26px] text-ink">{m.signup.doneTitle}</h1>
        <p className="text-[15px] leading-relaxed text-ink-soft">{state.ok}</p>
        <p className="mt-3 text-sm text-ink-faint">{m.signup.doneHint}</p>
        <DemoNote after />
        <Link href="/login" className="mt-6 inline-block text-sm text-sky-deep hover:text-ink">{m.backToLogin}</Link>
      </div>
    );
  }
  return (
    <>
      <h1 className="mb-1 font-serif text-[26px] text-ink">{m.signup.title}</h1>
      <p className="mb-7 text-[15px] text-ink-soft">{m.signup.subtitle}</p>
      <DemoNote />
      <form action={action} className="space-y-4">
        <Field label={m.signup.name} name="name" autoComplete="given-name" placeholder={m.signup.namePlaceholder} />
        <Field label={m.email} name="email" type="email" autoComplete="email" required />
        <Field label={m.password} name="password" type="password" autoComplete="new-password" minLength={8} placeholder={m.signup.passwordPlaceholder} required />
        <ConsentChecks />
        {state?.error && <Notice tone="error">{state.error}</Notice>}
        <SubmitButton className="w-full" pendingText={m.signup.submitting}>{m.signup.submit}</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        {m.signup.haveAccount} <Link href="/login" className="text-sky-deep hover:text-ink">{m.signup.signIn}</Link>
      </p>
    </>
  );
}
