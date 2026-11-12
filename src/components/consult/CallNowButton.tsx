"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { callClientNow } from "@/lib/session-actions";
import { useMsg } from "@/i18n/client";
import { consultMessages } from "@/i18n/consult";

// «Созвониться сейчас» в карточке клиента: создаёт онлайн-встречу на текущее время и открывает лобби.
export function CallNowButton({ client }: { client: string }) {
  const m = useMsg(consultMessages).now;
  const [state, action] = useActionState(callClientNow, undefined);
  return (
    <form action={action} className="flex flex-1 flex-col gap-1 sm:flex-none">
      <input type="hidden" name="client" value={client} />
      <Submit label={m.call} pending={m.calling} />
      {state?.error && <span className="max-w-60 text-xs text-[#a2392f]">{state.error}</span>}
    </form>
  );
}

function Submit({ label, pending }: { label: string; pending: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button
      disabled={busy}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm text-paper shadow-soft transition hover:opacity-90 disabled:opacity-60"
      data-call-now
    >
      <span className="h-2 w-2 rounded-full bg-sage" /> {busy ? pending : label}
    </button>
  );
}
