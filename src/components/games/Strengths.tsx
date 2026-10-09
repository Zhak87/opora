"use client";

import { useState } from "react";
import { chime, PENTATONIC } from "@/lib/chime";
import { ResultActions } from "./ResultActions";
import { buttonStyles } from "../ui";

const STRENGTHS = [
  "Доброта", "Терпение", "Честность", "Упорство", "Чувство юмора", "Любопытство", "Смелость", "Заботливость",
  "Ответственность", "Креативность", "Спокойствие", "Умение слушать", "Надёжность", "Оптимизм", "Трудолюбие", "Щедрость",
  "Внимательность", "Гибкость", "Справедливость", "Умение прощать", "Организованность", "Чуткость", "Скромность", "Жизнелюбие",
];

// Мои сильные стороны: выбрать свои качества и вспомнить, когда они проявились.
export function Strengths() {
  const [picked, setPicked] = useState<string[]>([]);
  const [phase, setPhase] = useState<"pick" | "recall" | "result">("pick");
  const [at, setAt] = useState(0);
  const [stories, setStories] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  const toggle = (s: string) => {
    if (picked.includes(s)) return setPicked(picked.filter((x) => x !== s));
    if (picked.length >= 3) return;
    chime(PENTATONIC[picked.length + 2], 0.05);
    setPicked([...picked, s]);
  };

  if (phase === "pick")
    return (
      <div>
        <p className="text-[15px] text-ink-soft">
          Выберите три качества, которые точно есть в вас. Не самые «правильные», а настоящие. Выбрано: {picked.length} из 3
        </p>
        <div className="stagger mt-6 flex flex-wrap gap-2">
          {STRENGTHS.map((s) => {
            const on = picked.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggle(s)}
                aria-pressed={on}
                className={`rounded-full px-5 py-3 text-[15px] transition-all duration-300 ${
                  on ? "scale-105 bg-sage-soft text-ink shadow-soft ring-1 ring-sage" : "border border-line bg-paper text-ink-soft hover:text-ink"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
        <button disabled={picked.length < 3} onClick={() => setPhase("recall")} className={`${buttonStyles.primary} mt-8`}>
          Дальше
        </button>
      </div>
    );

  if (phase === "recall") {
    const s = picked[at];
    const next = () => {
      const all = [...stories];
      all[at] = draft.trim();
      setStories(all);
      setDraft("");
      chime(PENTATONIC[at + 3], 0.05);
      if (at === picked.length - 1) setPhase("result");
      else setAt(at + 1);
    };
    return (
      <div key={s} className="mx-auto max-w-xl animate-rise">
        <p className="text-sm text-ink-faint">
          {at + 1} из {picked.length}
        </p>
        <p className="mt-3 font-serif text-[30px] text-ink">{s}</p>
        <label className="mt-4 block">
          <span className="mb-2 block text-[15px] text-ink-soft">Вспомните случай, когда это качество помогло вам или кому-то рядом.</span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder="Однажды я…"
            className="w-full resize-none rounded-[22px] border border-line bg-paper px-5 py-4 text-[15px] leading-relaxed text-ink outline-none transition placeholder:text-ink-faint focus:border-sky focus:ring-4 focus:ring-mist"
          />
        </label>
        <button onClick={next} className={`${buttonStyles.primary} mt-5`}>
          {draft.trim() ? "Дальше" : "Пропустить"}
        </button>
      </div>
    );
  }

  const text = picked.map((s, i) => `${s}${stories[i] ? `: ${stories[i]}` : ""}`).join("\n");
  return (
    <div className="animate-rise">
      <div className="rounded-[32px] bg-gradient-to-br from-sage-soft via-paper to-[#f6efe4] px-7 py-10 text-center shadow-soft">
        <p className="text-xs uppercase tracking-[0.16em] text-sage-deep">Ваши сильные стороны</p>
        <div className="mt-6 space-y-4">
          {picked.map((s, i) => (
            <div key={s} style={{ animation: `card-in 0.6s ${i * 0.18}s cubic-bezier(0.2,0.7,0.2,1) both` }}>
              <p className="font-serif text-[24px] text-ink">{s}</p>
              {stories[i] && <p className="mx-auto mt-1 max-w-md text-[14.5px] leading-relaxed text-ink-soft">{stories[i]}</p>}
            </div>
          ))}
        </div>
        <p className="mx-auto mt-7 max-w-md text-[15px] leading-relaxed text-ink-soft">
          Когда будет трудно, вспомните: эти качества уже не раз выручали вас. Они никуда не делись.
        </p>
      </div>
      <div className="mt-6">
        <ResultActions
          journal={`Мои сильные стороны:\n${text}`}
          prompt={`Я прошёл(а) упражнение «Мои сильные стороны». Вот что получилось:\n${text}\nПомоги мне понять, как опираться на эти качества в том, что сейчас происходит в моей жизни.`}
        />
      </div>
      <button
        onClick={() => {
          setPicked([]);
          setStories([]);
          setAt(0);
          setPhase("pick");
        }}
        className="mt-6 text-sm text-ink-faint hover:text-ink"
      >
        Пройти заново
      </button>
    </div>
  );
}
