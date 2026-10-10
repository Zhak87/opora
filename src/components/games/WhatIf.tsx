"use client";

import { useEffect, useState } from "react";
import { chime } from "@/lib/chime";
import { ResultActions } from "./ResultActions";
import { useMsg } from "@/i18n/client";
import { whatIfMessages } from "@/i18n/game-what-if";

const ORDER = Array.from({ length: whatIfMessages.ru.questions.length }, (_, i) => i);

function shuffle<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export function WhatIf() {
  const m = useMsg(whatIfMessages);
  // Колода хранит номера вопросов, текст берётся на текущем языке.
  const [deck, setDeck] = useState(ORDER);
  // Перемешиваем после загрузки, чтобы сервер и браузер показали одинаковую страницу.
  useEffect(() => setDeck(shuffle(ORDER)), []);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answer, setAnswer] = useState("");
  const q = m.questions[deck[i % deck.length]];

  const next = () => {
    setFlipped(false);
    setAnswer("");
    setTimeout(() => setI((n) => n + 1), 300);
  };

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => {
          if (!flipped) chime(74, 0.04);
          setFlipped(true);
        }}
        className="flip-card h-[300px] w-full max-w-md"
        data-flipped={flipped}
        aria-label={flipped ? q : m.flip}
      >
        <div className="flip-inner relative h-full w-full">
          <div className="flip-face absolute inset-0 flex flex-col items-center justify-center rounded-[32px] bg-gradient-to-br from-lilac-soft via-mist to-sage-soft shadow-lift">
            <span className="font-serif text-[64px] leading-none text-lilac-deep/70">?</span>
            <span className="mt-4 text-sm text-ink-soft">{m.tapOpen}</span>
          </div>
          <div className="flip-face flip-back absolute inset-0 flex items-center justify-center rounded-[32px] border border-line/70 bg-paper px-8 shadow-lift">
            <p className="text-center font-serif text-[23px] leading-snug text-ink">{q}</p>
          </div>
        </div>
      </button>

      {flipped && (
        <div className="mt-8 w-full max-w-md animate-rise">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            placeholder={m.placeholder}
            className="w-full resize-none rounded-[22px] border border-line bg-paper px-5 py-4 font-serif text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:border-sky focus:ring-4 focus:ring-mist"
          />
          <div className="mt-4">
            <ResultActions
              prompt={answer.trim() ? m.promptAnswer(q, answer.trim()) : m.promptThink(q)}
              journal={`${q}\n\n${answer.trim() || m.noAnswer}`}
            />
          </div>
        </div>
      )}

      <button onClick={next} className="mt-6 rounded-full px-5 py-2.5 text-sm text-ink-soft transition hover:bg-sand hover:text-ink">
        {m.another}
      </button>
    </div>
  );
}
