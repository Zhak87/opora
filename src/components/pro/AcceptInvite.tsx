"use client";

import { useActionState, useEffect } from "react";
import { acceptInvite, countInviteView } from "@/lib/pro-actions";
import { Field, Notice } from "../ui";
import { SubmitButton } from "../SubmitButton";
import { useMsg } from "@/i18n/client";
import { careMessages } from "@/i18n/care";
import { SCOPES } from "@/lib/pro";

// Переход по ссылке считается один раз за сеанс браузера.
export function InviteView({ code }: { code: string }) {
  useEffect(() => {
    const key = `opora-invite-${code}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    countInviteView(code);
  }, [code]);
  return null;
}

export function AcceptInvite({ code, name }: { code: string; name: string }) {
  const [state, action] = useActionState(acceptInvite, undefined);
  const m = useMsg(careMessages);
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="code" value={code} />
      <div>
        <h2 className="font-serif text-[24px] text-ink">{m.invite.connectTitle}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{m.invite.connectLead}</p>
      </div>
      <Field label={m.invite.yourName} name="name" defaultValue={name} maxLength={60} required />
      <div>
        <p className="text-[15px] font-medium text-ink">{m.invite.chooseShare}</p>
        <p className="mt-0.5 text-sm text-ink-faint">{m.invite.shareHint}</p>
        <div className="mt-3 space-y-2">
          {SCOPES.map((s) => (
            <label key={s} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line/70 bg-paper px-4 py-3 transition has-[:checked]:border-sage has-[:checked]:bg-sage-soft/50">
              <input type="checkbox" name="scopes" value={s} className="mt-[3px] h-[18px] w-[18px] shrink-0 accent-ink" />
              <span>
                <span className="block text-[15px] text-ink">{m.scopes[s].title}</span>
                <span className="block text-sm leading-relaxed text-ink-soft">{m.scopes[s].text}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-faint">{m.invite.always} {m.care.noTraining}</p>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-sand/60 p-4 text-[13px] leading-relaxed text-ink-soft">
        <input type="checkbox" name="understand" required className="mt-[3px] h-[18px] w-[18px] shrink-0 accent-ink" />
        {m.invite.understand}
      </label>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton className="w-full" pendingText={m.invite.submitting}>
        {m.invite.submit}
      </SubmitButton>
    </form>
  );
}
