"use client";

import { useActionState } from "react";
import { createInvite } from "@/lib/pro-actions";
import { SubmitButton } from "../SubmitButton";
import { Notice } from "../ui";
import { useMsg } from "@/i18n/client";
import { proMessages } from "@/i18n/pro";

export function CreateInvite() {
  const [state, action] = useActionState(createInvite, undefined);
  const m = useMsg(proMessages).invites;
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row">
      <input
        name="label"
        maxLength={80}
        placeholder={m.labelPlaceholder}
        className="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-paper px-4 text-[15px] text-ink placeholder:text-ink-faint outline-none transition focus:border-lilac-deep/60 focus:ring-4 focus:ring-lilac-soft"
      />
      <SubmitButton pendingText={m.creating}>{m.create}</SubmitButton>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
    </form>
  );
}
