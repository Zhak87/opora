"use client";

import { useActionState, useState } from "react";
import { updateProfile, deleteAllHistory, deleteAccount } from "@/lib/actions";
import { Field } from "./ui";
import { SubmitButton } from "./SubmitButton";
import { useMsg } from "@/i18n/client";
import { profileMessages } from "@/i18n/profile";

export function NameForm({ name }: { name: string }) {
  const [state, action] = useActionState(updateProfile, undefined);
  const m = useMsg(profileMessages);
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Field label={m.nameLabel} name="name" defaultValue={name} maxLength={60} placeholder={m.namePlaceholder} />
      </div>
      <SubmitButton variant="soft" pendingText={m.saving}>
        {state?.ok ? m.saved : m.save}
      </SubmitButton>
    </form>
  );
}

export function DangerZone() {
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);
  const m = useMsg(profileMessages);

  return (
    <div className="space-y-6">
      <form
        action={deleteAllHistory}
        onSubmit={(e) => {
          if (!confirm(m.confirmClear)) e.preventDefault();
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="text-[15px] text-ink">{m.clearTitle}</p>
          <p className="text-sm text-ink-soft">{m.clearHint}</p>
        </div>
        <SubmitButton variant="danger" pendingText={m.deleting} className="shrink-0">
          {m.clear}
        </SubmitButton>
      </form>

      <div className="h-px bg-line/70" />

      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[15px] text-ink">{m.deleteTitle}</p>
            <p className="text-sm text-ink-soft">{m.deleteHint}</p>
          </div>
          {!open && (
            <button onClick={() => setOpen(true)} className="h-12 shrink-0 rounded-full border border-[#ecd6cd] px-6 text-[15px] text-[#a0614f] transition hover:bg-[#fbf1ec]">
              {m.deleteTitle}
            </button>
          )}
        </div>
        {open && (
          <form action={deleteAccount} className="mt-5 animate-rise space-y-3 rounded-2xl bg-[#fbf1ec]/70 p-4">
            <label className="block text-sm text-ink-soft">
              {m.confirmPrompt} <b className="font-medium text-ink">{m.confirmWord}</b>
              <input
                name="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toLowerCase())}
                autoComplete="off"
                className="mt-2 h-12 w-full rounded-2xl border border-[#ecd6cd] bg-paper px-4 text-[15px] text-ink outline-none focus:ring-4 focus:ring-[#fbf1ec]"
              />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-full px-5 text-sm text-ink-soft hover:bg-paper">
                {m.cancel}
              </button>
              <SubmitButton variant="danger" pendingText={m.deleting} className="h-11">
                {confirmText.trim() === m.confirmWord ? m.deleteForever : m.delete}
              </SubmitButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
