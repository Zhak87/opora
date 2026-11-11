"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/i18n/client";
import { gamesMessages, type Feeling } from "@/i18n/games";
import { ArrowIcon } from "../icons";
import { toneBg } from "../ui";
import { getGames } from "@/lib/games";
import { chime } from "@/lib/chime";

const FEELINGS: Feeling[] = ["anxious", "sad", "lonely", "calm", "lost", "grow"];
const TINT: Record<Feeling, string> = {
  anxious: "from-mist to-paper",
  sad: "from-lilac-soft to-paper",
  lonely: "from-peach-soft to-paper",
  calm: "from-sage-soft to-paper",
  lost: "from-sand to-paper",
  grow: "from-rose-soft to-paper",
};

// «Как вы себя чувствуете?» → 1–3 практики с объяснением, почему именно они.
export function FeelingPicker() {
  const locale = useLocale();
  const m = gamesMessages[locale];
  const games = getGames(locale);
  const [feel, setFeel] = useState<Feeling | null>(null);
  return (
    <section className={`rounded-[32px] bg-gradient-to-br ${feel ? TINT[feel] : "from-lilac-soft/60 to-paper"} p-5 shadow-soft transition-colors duration-700 sm:p-7`}>
      <h2 className="font-serif text-[22px] text-ink sm:text-[24px]">{m.page.feelTitle}</h2>
      <p className="mt-1 text-[14px] text-ink-soft">{m.page.feelHint}</p>
      <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {FEELINGS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={feel === f}
            onClick={() => {
              setFeel(f === feel ? null : f);
              chime(70 + FEELINGS.indexOf(f) * 2, 0.03);
            }}
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition ${feel === f ? "bg-ink text-paper shadow-soft" : "bg-paper/80 text-ink hover:bg-paper"}`}
          >
            {m.feelings[f].label}
          </button>
        ))}
      </div>
      {feel && (
        <div key={feel} className="stagger mt-5 grid gap-3 sm:grid-cols-3">
          {m.feelings[feel].items.map(([slug, why]) => {
            const g = games.find((x) => x.slug === slug)!;
            return (
              <Link
                key={slug}
                href={`/play/${slug}`}
                className={`group flex flex-col justify-between gap-3 rounded-[24px] ${toneBg[g.tone]} p-4 transition hover:-translate-y-0.5 hover:shadow-lift sm:min-h-[150px]`}
              >
                <span>
                  <span className="block text-[15.5px] font-medium text-ink">{g.title}</span>
                  <span className="mt-1.5 block text-[13.5px] leading-snug text-ink-soft">
                    <span className="text-ink-faint">{m.page.why}: </span>
                    {why}
                  </span>
                </span>
                <span className="flex items-center justify-between text-[12.5px] text-ink-faint">
                  {g.minutes} {m.page.min}
                  <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:text-ink" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
      {feel === "lonely" && (
        <p className="mt-4 text-[14px] text-ink-soft">
          {m.page.roomsLine}{" "}
          <Link href="/rooms" className="text-ink underline underline-offset-4">
            {m.page.rooms}
          </Link>
        </p>
      )}
    </section>
  );
}
