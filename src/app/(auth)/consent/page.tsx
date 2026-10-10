"use client";

import { useActionState } from "react";
import { acceptConsent } from "@/lib/auth-actions";
import { signOut } from "@/lib/actions";
import { Notice } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { ConsentChecks } from "@/components/ConsentChecks";
import { useMsg } from "@/i18n/client";
import { legalMessages } from "@/i18n/legal";

export default function ConsentPage() {
  const [state, action] = useActionState(acceptConsent, undefined);
  const { consent } = useMsg(legalMessages);
  return (
    <>
      <h1 className="mb-1 font-serif text-[26px] text-ink">{consent.title}</h1>
      <p className="mb-7 text-[15px] text-ink-soft">{consent.subtitle}</p>
      <form action={action} className="space-y-5">
        <ConsentChecks />
        {state?.error && <Notice tone="error">{state.error}</Notice>}
        <SubmitButton className="w-full" pendingText={consent.submitting}>{consent.submit}</SubmitButton>
      </form>
      <form action={signOut} className="mt-4 text-center">
        <button className="text-sm text-ink-soft hover:text-ink">{consent.decline}</button>
      </form>
    </>
  );
}
