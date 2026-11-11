"use client";

import { useActionState } from "react";
import { convertGuest } from "@/lib/trial-actions";
import { Field, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { ConsentChecks } from "@/components/ConsentChecks";
import { useMsg } from "@/i18n/client";
import { authMessages } from "@/i18n/auth";
import { trialMessages } from "@/i18n/trial";

// Гость превращается в обычного пользователя: почта и пароль привязываются к тому же аккаунту.
export function ConvertForm() {
  const [state, action] = useActionState(convertGuest, undefined);
  const m = useMsg(authMessages);
  const t = useMsg(trialMessages);
  if (state?.sent) {
    return (
      <div className="rounded-2xl bg-sage-soft/70 px-5 py-4">
        <p className="text-[15px] font-medium text-ink">{t.form.sentTitle}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{t.form.sent(state.sent)}</p>
        <p className="mt-2 text-xs text-ink-faint">{t.form.sentHint}</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <Field label={m.signup.name} name="name" autoComplete="given-name" placeholder={m.signup.namePlaceholder} />
      <Field label={m.email} name="email" type="email" autoComplete="email" required />
      <Field label={m.password} name="password" type="password" autoComplete="new-password" minLength={8} placeholder={m.signup.passwordPlaceholder} required />
      <ConsentChecks />
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton className="w-full" pendingText={t.form.submitting}>{t.form.submit}</SubmitButton>
    </form>
  );
}
