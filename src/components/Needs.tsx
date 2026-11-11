"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/i18n/client";
import { needsMessages } from "@/i18n/needs";
import { gamesMessages } from "@/i18n/games";
import { NEEDS, NEED_ITEMS, type Need } from "@/lib/needs";
import { StartForm } from "./StartForm";
import { ArrowIcon } from "./icons";
import { sendEvent } from "./Track";

const TONES: Record<Need, string> = {
  rest: "bg-sage-soft",
  ground: "bg-mist",
  together: "bg-peach-soft",
  worth: "bg-rose-soft",
  self: "bg-lilac-soft",
};

const ROW = "group flex w-full items-center gap-3 rounded-[20px] bg-paper/80 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:bg-paper hover:shadow-soft";

// «Что вам сейчас нужно?»: пять потребностей, под выбранной три подходящих шага.
export function Needs({ initial }: { initial: Need }) {
  const locale = useLocale();
  const m = needsMessages[locale];
  const games = gamesMessages[locale].catalog;
  const [need, setNeed] = useState<Need>(initial);
  const pick = (n: Need) => {
    if (n === need) return;
    setNeed(n);
    sendEvent("need_pick", { need: n });
  };
  const body = (title: string, hint: string) => (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-ink">{title}</span>
        <span className="block text-[13px] leading-snug text-ink-soft">{hint}</span>
      </span>
      <ArrowIcon className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
    </>
  );

  return (
    <section className={`mb-4 rounded-[30px] p-5 transition-colors duration-500 sm:p-6 ${TONES[need]}`}>
      <h2 className="font-display text-[17px] font-medium tracking-[-0.02em] text-ink">{m.title}</h2>
      <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" role="tablist">
        {NEEDS.map((n) => (
          <button
            key={n}
            type="button"
            role="tab"
            aria-selected={n === need}
            onClick={() => pick(n)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${n === need ? "bg-ink text-paper shadow-soft" : "bg-paper/70 text-ink hover:bg-paper"}`}
          >
            {m.needs[n].title}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-ink-soft">{m.needs[need].hint}</p>
      <div key={need} className="mt-3 grid animate-fade gap-2 sm:grid-cols-3">
        {NEED_ITEMS[need].map((item) => {
          if (item.kind === "game")
            return (
              <Link key={item.slug} href={`/play/${item.slug}`} className={ROW}>
                {body(games[item.slug].title, games[item.slug].hint)}
              </Link>
            );
          if (item.kind === "place")
            return (
              <Link key={item.to} href={`/${item.to}`} className={ROW}>
                {body(m.places[item.to].title, m.places[item.to].hint)}
              </Link>
            );
          const talk = m.talk[need as keyof typeof m.talk];
          return (
            <StartForm key="talk" prompt={talk.prompt} className={ROW}>
              {body(talk.title, talk.hint)}
            </StartForm>
          );
        })}
      </div>
    </section>
  );
}
