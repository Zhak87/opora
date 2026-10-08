"use client";

import { useState } from "react";
import { chime } from "@/lib/chime";
import { ResultActions } from "./ResultActions";

const VALUES = [
  "Семья", "Свобода", "Творчество", "Здоровье", "Любовь", "Развитие", "Покой", "Честность",
  "Дружба", "Природа", "Вера", "Приключения", "Знания", "Помощь другим", "Красота", "Стабильность",
  "Признание", "Юмор", "Независимость", "Смысл", "Справедливость", "Достаток", "Дом", "Доброта",
];

type Phase = "sort" | "pick" | "result";

export function Values() {
  const [index, setIndex] = useState(0);
  const [important, setImportant] = useState<string[]>([]);
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);
  const [phase, setPhase] = useState<Phase>("sort");
  const [top, setTop] = useState<string[]>([]);

  const answer = (yes: boolean) => {
    if (leaving) return;
    setLeaving(yes ? "right" : "left");
    if (yes) chime(76, 0.04);
    setTimeout(() => {
      const nextImportant = yes ? [...important, VALUES[index]] : important;
      setImportant(nextImportant);
      setLeaving(null);
      if (index + 1 >= VALUES.length) {
        if (nextImportant.length <= 3) {
          setTop(nextImportant);
          setPhase("result");
        } else setPhase("pick");
      } else setIndex(index + 1);
    }, 380);
  };

  const restart = () => {
    setIndex(0);
    setImportant([]);
    setTop([]);
    setPhase("sort");
  };

  if (phase === "sort") {
    const value = VALUES[index];
    return (
      <div className="flex flex-col items-center">
        <p className="mb-5 text-sm text-ink-faint">
          {index + 1} из {VALUES.length}
        </p>
        <div className="relative h-[280px] w-full max-w-sm">
          <div className="absolute inset-x-6 top-4 h-full rounded-[32px] bg-sand/60" aria-hidden />
          <div className="absolute inset-x-3 top-2 h-full rounded-[32px] bg-sand" aria-hidden />
          <div
            key={value}
            className="absolute inset-0 flex flex-col items-center justify-center rounded-[32px] border border-line/70 bg-paper shadow-lift"
            style={{
              animation: leaving
                ? `card-out-${leaving} 0.38s ease-in forwards`
                : "card-in 0.4s cubic-bezier(0.2,0.7,0.2,1) both",
            }}
          >
            <p className="text-xs uppercase tracking-[0.16em] text-ink-faint">Для меня это…</p>
            <p className="mt-4 px-6 text-center font-serif text-[34px] text-ink">{value}</p>
          </div>
        </div>
        <div className="mt-8 grid w-full max-w-sm grid-cols-2 gap-3">
          <button onClick={() => answer(false)} className="h-14 rounded-full border border-line bg-paper text-[15px] text-ink-soft transition hover:border-sand-deep hover:text-ink">
            Не очень
          </button>
          <button onClick={() => answer(true)} className="h-14 rounded-full bg-ink text-[15px] text-paper shadow-soft transition hover:bg-ink/90">
            Важно
          </button>
        </div>
        <p className="mt-5 text-center text-sm text-ink-faint">Отвечайте быстро, по первому чувству.</p>
      </div>
    );
  }

  if (phase === "pick") {
    const toggle = (v: string) =>
      setTop((t) => (t.includes(v) ? t.filter((x) => x !== v) : t.length < 3 ? [...t, v] : t));
    return (
      <div className="animate-rise">
        <p className="font-serif text-[22px] text-ink">Важного оказалось много — это хорошо.</p>
        <p className="mt-2 text-[15px] text-ink-soft">Теперь выберите три самых главных. Выбрано: {top.length} из 3</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {important.map((v) => {
            const on = top.includes(v);
            return (
              <button
                key={v}
                onClick={() => toggle(v)}
                aria-pressed={on}
                className={`rounded-full px-5 py-3 text-[15px] transition-all duration-300 ${
                  on ? "scale-105 bg-lilac-soft text-ink shadow-soft" : "border border-line bg-paper text-ink-soft hover:text-ink"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
        <button
          disabled={top.length === 0}
          onClick={() => {
            chime(79, 0.05);
            setPhase("result");
          }}
          className="mt-8 h-12 rounded-full bg-ink px-7 text-[15px] text-paper shadow-soft transition hover:bg-ink/90 disabled:opacity-40"
        >
          Готово
        </button>
      </div>
    );
  }

  const list = top.join(", ");
  return (
    <div className="animate-rise">
      <div className="rounded-[32px] bg-gradient-to-br from-[#f6efe4] via-lilac-soft to-mist px-7 py-10 text-center shadow-soft">
        <p className="text-xs uppercase tracking-[0.16em] text-lilac-deep">Ваши главные ценности</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {top.map((v, i) => (
            <span
              key={v}
              className="rounded-full bg-paper/90 px-6 py-3 font-serif text-[22px] text-ink shadow-soft"
              style={{ animation: `card-in 0.6s ${i * 0.15}s cubic-bezier(0.2,0.7,0.2,1) both` }}
            >
              {v}
            </span>
          ))}
        </div>
        <p className="mx-auto mt-7 max-w-md text-[15px] leading-relaxed text-ink-soft">
          Подумайте: сколько места эти ценности занимают в вашей жизни сейчас? Иногда тревога и усталость появляются, когда
          мы живём далеко от того, что нам по-настоящему важно.
        </p>
      </div>
      <div className="mt-6">
        <ResultActions
          prompt={`Я прошёл(а) упражнение «Мои ценности». Мои главные ценности: ${list}. Помоги мне подумать, насколько моя жизнь сейчас им соответствует.`}
          journal={`Мои главные ценности: ${list}.`}
        />
      </div>
      <button onClick={restart} className="mt-6 text-sm text-ink-faint hover:text-ink">
        Пройти заново
      </button>
    </div>
  );
}
