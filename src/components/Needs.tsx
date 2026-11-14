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

const ROW = "group flex w-full items-center gap-3 rounded-xl border border-line bg-paper px-3.5 py-3 text-left transition-colors hover:border-lilac hover:bg-[#fbfaff]";

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
      <ArrowIcon className="size-4 shrink-0 text-ink-soft transition-colors group-hover:text-lilac-deep" />
    </>
  );

  return (
    <section aria-labelledby="home-needs" className="rounded-[22px] border border-line bg-paper p-4 sm:p-5">
      <h2 id="home-needs" className="text-lg leading-tight font-semibold tracking-[-0.022em] text-ink">{m.title}</h2>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-labelledby="home-needs">
        {NEEDS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={n === need}
            onClick={() => pick(n)}
            className={`min-h-11 rounded-lg border px-3 text-sm font-medium transition-colors ${n === need ? "border-lilac bg-lilac-soft text-ink" : "border-line bg-paper text-ink-soft hover:bg-milk hover:text-ink"}`}
          >
            {m.needs[n].title}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-ink-soft" aria-live="polite">{m.needs[need].hint}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
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
