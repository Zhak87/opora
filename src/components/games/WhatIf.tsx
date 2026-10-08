"use client";

import { useEffect, useState } from "react";
import { chime } from "@/lib/chime";
import { ResultActions } from "./ResultActions";

const QUESTIONS = [
  "Если бы у вас был целый свободный год, чем бы вы его наполнили?",
  "Если бы страх исчез на один день, что бы вы сделали первым делом?",
  "Если бы вы могли написать письмо себе десятилетнему, что бы вы сказали?",
  "Если бы деньги не имели значения, чем бы вы занимались каждый день?",
  "Если бы вы могли научиться чему угодно за неделю, что бы это было?",
  "Если бы ваш лучший друг описал вас тремя словами, какими?",
  "Если бы вы могли изменить одну привычку, какую бы выбрали?",
  "Если бы у вас был день только для себя, как бы он прошёл?",
  "Если бы вы могли поговорить с собой через 10 лет, о чём бы спросили?",
  "Если бы вы перестали ждать одобрения, что бы изменилось?",
  "Если бы вы жили у моря, кем бы вы были там?",
  "Если бы каждый ваш день оставлял след, каким бы вы хотели его видеть?",
  "Если бы вы могли простить кого-то прямо сейчас, кто бы это был?",
  "Если бы вы знали, что не ошибётесь, за что бы взялись?",
  "Если бы ваша жизнь была книгой, как бы называлась текущая глава?",
  "Если бы можно было вернуть одно чувство из детства, какое?",
  "Если бы вы могли подарить себе одно разрешение, какое бы оно было?",
  "Если бы вы гордились собой через год, за что именно?",
];

function shuffle<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export function WhatIf() {
  const [deck, setDeck] = useState(QUESTIONS);
  // Перемешиваем после загрузки, чтобы сервер и браузер показали одинаковую страницу.
  useEffect(() => setDeck(shuffle(QUESTIONS)), []);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answer, setAnswer] = useState("");
  const q = deck[i % deck.length];

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
        aria-label={flipped ? q : "Перевернуть карточку"}
      >
        <div className="flip-inner relative h-full w-full">
          <div className="flip-face absolute inset-0 flex flex-col items-center justify-center rounded-[32px] bg-gradient-to-br from-lilac-soft via-mist to-sage-soft shadow-lift">
            <span className="font-serif text-[64px] leading-none text-lilac-deep/70">?</span>
            <span className="mt-4 text-sm text-ink-soft">Коснитесь, чтобы открыть</span>
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
            placeholder="Можно ответить здесь или просто подумать…"
            className="w-full resize-none rounded-[22px] border border-line bg-paper px-5 py-4 font-serif text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:border-sky focus:ring-4 focus:ring-mist"
          />
          <div className="mt-4">
            <ResultActions
              prompt={answer.trim() ? `Вопрос: «${q}»\n\nМой ответ: ${answer.trim()}` : `Хочу подумать над вопросом: «${q}»`}
              journal={`${q}\n\n${answer.trim() || "(пока без ответа)"}`}
            />
          </div>
        </div>
      )}

      <button onClick={next} className="mt-6 rounded-full px-5 py-2.5 text-sm text-ink-soft transition hover:bg-sand hover:text-ink">
        Другой вопрос
      </button>
    </div>
  );
}
