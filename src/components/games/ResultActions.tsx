"use client";

import { useState, useTransition } from "react";
import { addJournalEntry } from "@/lib/actions";
import { StartForm } from "../StartForm";
import { buttonStyles } from "../ui";
import { useMsg } from "@/i18n/client";
import { gamesMessages } from "@/i18n/games";

export function ResultActions({ prompt, journal, kind = "thought" }: { prompt: string; journal: string; kind?: string }) {
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const m = useMsg(gamesMessages).result;

  const save = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("content", journal);
      const r = await addJournalEntry(undefined, fd);
      if (r && "ok" in r) setSaved(true);
    });

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <StartForm prompt={prompt} className={`${buttonStyles.primary} w-full sm:w-auto`}>
        {m.discuss}
      </StartForm>
      <button onClick={save} disabled={saved || pending} className={`${buttonStyles.soft} w-full sm:w-auto`}>
        {saved ? m.saved : pending ? m.saving : m.save}
      </button>
    </div>
  );
}
