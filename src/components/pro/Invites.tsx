"use client";

import { useActionState, useState } from "react";
import { createInvite } from "@/lib/pro-actions";
import { SubmitButton } from "../SubmitButton";
import { Notice } from "../ui";
import { CheckIcon, CopyIcon } from "../icons";
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
        className="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-paper px-4 text-[15px] text-ink placeholder:text-ink-faint outline-none transition focus:border-sky focus:ring-4 focus:ring-mist"
      />
      <SubmitButton pendingText={m.creating}>{m.create}</SubmitButton>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
    </form>
  );
}

export function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  const m = useMsg(proMessages).invites;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {}
      }}
      className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper transition hover:bg-ink/90"
    >
      {done ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
      {done ? m.copied : m.copy}
    </button>
  );
}
