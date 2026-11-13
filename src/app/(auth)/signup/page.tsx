"use client";

import Link from "next/link";
import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signUp } from "@/lib/auth-actions";
import { Field, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { ConsentChecks } from "@/components/ConsentChecks";
import { Track } from "@/components/Track";
import { useMsg } from "@/i18n/client";
import { authMessages } from "@/i18n/auth";
import { cabinetMessages } from "@/i18n/cabinet";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const [state, action] = useActionState(signUp, undefined);
  const m = useMsg(authMessages);
  const role = useMsg(cabinetMessages).role;
  const from = useSearchParams().get("next") ?? "";
  // Роль спрашиваем только при обычной регистрации: по приглашению или из анкеты психолога путь уже известен.
  const [pro, setPro] = useState(false);
  const next = from || (pro ? "/pro/join" : "");
  if (state?.ok) {
    return (
      <div className="text-center">
        <h1 className="mb-3 font-serif text-[26px] text-ink">{m.signup.doneTitle}</h1>
        <p className="text-[15px] leading-relaxed text-ink-soft">{state.ok}</p>
        <p className="mt-3 text-sm text-ink-faint">{m.signup.doneHint}</p>
        <Link href="/login" className="mt-6 inline-block text-sm text-sky-deep hover:text-ink">{m.backToLogin}</Link>
      </div>
    );
  }
  return (
    <>
      <Track name="signup_start" />
      <h1 className="mb-1 font-serif text-[26px] text-ink">{m.signup.title}</h1>
      <p className="mb-7 text-[15px] text-ink-soft">{m.signup.subtitle}</p>
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {!from && (
          <fieldset data-role-choice>
            <legend className="mb-2 text-sm text-ink-soft">{role.title}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {([false, true] as const).map((isPro) => (
                <button
                  key={String(isPro)}
                  type="button"
                  aria-pressed={pro === isPro}
                  onClick={() => setPro(isPro)}
                  className={`rounded-[18px] border-2 px-4 py-3 text-left transition ${pro === isPro ? "border-lilac-deep/60 bg-lilac-soft/60" : "border-transparent bg-milk hover:bg-sand/60"}`}
                  data-role={isPro ? "pro" : "client"}
                >
                  <span className="block text-[15px] font-medium text-ink">{isPro ? role.pro : role.client}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{isPro ? role.proHint : role.clientHint}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-faint">{role.later}</p>
          </fieldset>
        )}
        <Field label={m.signup.name} name="name" autoComplete="given-name" placeholder={m.signup.namePlaceholder} />
        <Field label={m.email} name="email" type="email" autoComplete="email" required />
        <Field label={m.password} name="password" type="password" autoComplete="new-password" minLength={8} placeholder={m.signup.passwordPlaceholder} required />
        <ConsentChecks />
        {state?.error && <Notice tone="error">{state.error}</Notice>}
        <SubmitButton className="w-full" pendingText={m.signup.submitting}>{m.signup.submit}</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        {m.signup.haveAccount} <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-sky-deep hover:text-ink">{m.signup.signIn}</Link>
      </p>
    </>
  );
}
