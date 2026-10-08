"use client";

import { useActionState, useState } from "react";
import { updateProfile, deleteAllHistory, deleteAccount } from "@/lib/actions";
import { Field } from "./ui";
import { SubmitButton } from "./SubmitButton";

export function NameForm({ name }: { name: string }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Field label="Как к вам обращаться" name="name" defaultValue={name} maxLength={60} placeholder="Имя или как вам удобно" />
      </div>
      <SubmitButton variant="soft" pendingText="Сохраняем…">
        {state?.ok ? "Сохранено" : "Сохранить"}
      </SubmitButton>
    </form>
  );
}

export function DangerZone() {
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <form
        action={deleteAllHistory}
        onSubmit={(e) => {
          if (!confirm("Удалить все разговоры и записи дневника? Восстановить их будет нельзя.")) e.preventDefault();
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="text-[15px] text-ink">Очистить историю</p>
          <p className="text-sm text-ink-soft">Удалит все разговоры и записи дневника. Аккаунт останется.</p>
        </div>
        <SubmitButton variant="danger" pendingText="Удаляем…" className="shrink-0">
          Очистить
        </SubmitButton>
      </form>

      <div className="h-px bg-line/70" />

      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[15px] text-ink">Удалить аккаунт</p>
            <p className="text-sm text-ink-soft">Аккаунт и все данные будут удалены навсегда.</p>
          </div>
          {!open && (
            <button onClick={() => setOpen(true)} className="h-12 shrink-0 rounded-full border border-[#ecd6cd] px-6 text-[15px] text-[#a0614f] transition hover:bg-[#fbf1ec]">
              Удалить аккаунт
            </button>
          )}
        </div>
        {open && (
          <form action={deleteAccount} className="mt-5 animate-rise space-y-3 rounded-2xl bg-[#fbf1ec]/70 p-4">
            <label className="block text-sm text-ink-soft">
              Чтобы подтвердить, напишите слово <b className="font-medium text-ink">удалить</b>
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
                Отмена
              </button>
              <SubmitButton variant="danger" pendingText="Удаляем…" className="h-11">
                {confirmText === "удалить" ? "Удалить навсегда" : "Удалить"}
              </SubmitButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
