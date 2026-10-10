"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { resendConfirmation, signIn } from "@/lib/auth-actions";
import { Field, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { DemoNote } from "@/components/DemoNote";
import { useMsg } from "@/i18n/client";
import { authMessages } from "@/i18n/auth";

function ResendForm({ email }: { email?: string }) {
  const [state, action] = useActionState(resendConfirmation, undefined);
  const m = useMsg(authMessages);
  if (state?.ok) return <Notice>{state.ok}</Notice>;
  return (
    <form action={action} className="space-y-3 rounded-2xl bg-sand/60 p-4">
      <p className="text-sm leading-relaxed text-ink-soft">{m.login.resendText}</p>
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <Field label={m.email} name="email" type="email" autoComplete="email" required />
      )}
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton variant="soft" className="h-11 w-full" pendingText={m.login.sending}>
        {m.login.resend}
      </SubmitButton>
    </form>
  );
}

function LoginForm() {
  const [state, action] = useActionState(signIn, undefined);
  const expired = useSearchParams().get("link") === "expired";
  const m = useMsg(authMessages);
  return (
    <>
      <h1 className="mb-1 font-serif text-[26px] text-ink">{m.login.title}</h1>
      <p className="mb-7 text-[15px] text-ink-soft">{m.login.subtitle}</p>
      <DemoNote />
      <div className="space-y-4">
        {expired && (
          <>
            <Notice tone="error">{m.login.expired}</Notice>
            <p className="text-sm leading-relaxed text-ink-soft">{m.login.expiredHint}</p>
          </>
        )}
        <form action={action} className="space-y-4">
          <Field label={m.email} name="email" type="email" autoComplete="email" required />
          <Field label={m.password} name="password" type="password" autoComplete="current-password" required />
          {state?.error && <Notice tone="error">{state.error}</Notice>}
          <SubmitButton className="w-full" pendingText={m.login.submitting}>{m.login.submit}</SubmitButton>
        </form>
        {(state?.unconfirmed || expired) && <ResendForm email={state?.unconfirmed} />}
      </div>
      <div className="mt-6 flex flex-col items-center gap-2 text-sm text-ink-soft">
        <Link href="/forgot" className="hover:text-ink">{m.login.forgot}</Link>
        <p>
          {m.login.firstTime}{" "}
          <Link href="/signup" className="text-sky-deep hover:text-ink">{m.login.createAccount}</Link>
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
