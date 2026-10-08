"use client";

import { useActionState, useEffect, useState } from "react";
import { addJournalEntry } from "@/lib/actions";
import { SubmitButton } from "./SubmitButton";

// Практика «Три хороших вещи»: сохраняется в дневник как благодарность.
export function Gratitude() {
  const [state, action] = useActionState(addJournalEntry, undefined);
  const [items, setItems] = useState(["", "", ""]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (state && "ok" in state) {
      setDone(true);
      setItems(["", "", ""]);
    }
  }, [state]);

  const content = items
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t, i) => `${i + 1}. ${t}`)
    .join("\n");

  if (done) {
    return (
      <div className="animate-rise py-6 text-center">
        <p className="font-serif text-[22px] text-ink">Спасибо, что заметили хорошее.</p>
        <p className="mt-2 text-sm text-ink-soft">Запись сохранена в дневнике.</p>
        <button onClick={() => setDone(false)} className="mt-5 text-sm text-sage-deep hover:text-ink">
          Записать ещё
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="kind" value="gratitude" />
      <input type="hidden" name="content" value={content ? `Три хороших вещи сегодня:\n${content}` : ""} />
      {items.map((v, i) => (
        <label key={i} className="flex items-center gap-3">
          <span className="w-5 text-center font-serif text-lg text-sage-deep">{i + 1}</span>
          <input
            value={v}
            onChange={(e) => setItems((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))}
            placeholder={["Что-то маленькое и приятное", "Кто-то, кто был рядом", "Что получилось у вас"][i]}
            maxLength={300}
            className="h-12 flex-1 rounded-2xl border border-line/80 bg-paper/90 px-4 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-sage focus:ring-4 focus:ring-sage-soft"
          />
        </label>
      ))}
      <div className="flex justify-end pt-2">
        <SubmitButton pendingText="Сохраняем…" className="h-11" >
          Сохранить в дневник
        </SubmitButton>
      </div>
      {state && "error" in state && <p className="text-right text-sm text-[#94594a]">{state.error}</p>}
    </form>
  );
}
