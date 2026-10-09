"use client";

import { useState } from "react";
import { chime } from "@/lib/chime";
import { ResultActions } from "./ResultActions";
import { buttonStyles } from "../ui";

const PROMPTS = [
  "Что сейчас происходит в вашей жизни?",
  "Чего вы боитесь и на что надеетесь?",
  "Что вы хотите пожелать себе через год?",
  "За что вы можете поблагодарить себя уже сейчас?",
];

// Письмо себе через год: написать, «запечатать» в конверт и сохранить в дневник.
export function Letter() {
  const [text, setText] = useState("");
  const [sealed, setSealed] = useState(false);
  const [hint, setHint] = useState(0);

  if (sealed)
    return (
      <div className="flex flex-col items-center">
        <div className="relative h-[200px] w-[300px] animate-[card-in_0.6s_cubic-bezier(0.2,0.7,0.2,1)_both]" aria-hidden>
          <div className="absolute inset-0 rounded-[18px] bg-sand shadow-lift" />
          <svg viewBox="0 0 300 200" className="absolute inset-0 h-full w-full">
            <path d="M0 18 L150 120 L300 18" fill="none" stroke="#d8cfc0" strokeWidth="2" />
            <path d="M0 200 L120 100 M300 200 L180 100" stroke="#e6dccd" strokeWidth="2" />
          </svg>
          <span
            className="absolute left-1/2 top-[104px] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-lilac-deep font-serif text-lg text-paper shadow-lift"
            style={{ animation: "card-in 0.5s 0.5s cubic-bezier(0.3,1.6,0.5,1) both" }}
          >
            О
          </span>
        </div>
        <p className="mt-8 font-serif text-[24px] text-ink">Письмо запечатано</p>
        <p className="mt-2 max-w-md text-center text-[15px] leading-relaxed text-ink-soft">
          Сохраните его в дневник. Через год, а может и раньше, перечитайте и посмотрите, какой путь вы прошли.
        </p>
        <div className="mt-6">
          <ResultActions
            journal={`Письмо себе через год (написано ${new Date().toLocaleDateString("ru-RU")}):\n\n${text}`}
            prompt={`Я написал(а) письмо себе через год:\n\n${text}\n\nХочу поговорить о том, что я в нём заметил(а).`}
            kind="goal"
          />
        </div>
        <button onClick={() => setSealed(false)} className="mt-6 text-sm text-ink-faint hover:text-ink">
          Вернуться к письму
        </button>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative rounded-[28px] border border-line/70 bg-paper px-6 py-7 shadow-soft sm:px-9 sm:py-9">
        <p className="font-serif text-[20px] text-ink">Дорогой(ая) я через год,</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="Пишите как другу. Никто, кроме вас, это не прочитает."
          className="mt-3 w-full resize-none bg-[repeating-linear-gradient(transparent,transparent_31px,#ebe4d8_32px)] bg-local font-serif text-[17px] leading-[32px] text-ink outline-none placeholder:text-ink-faint"
          aria-label="Текст письма"
        />
      </div>
      <button
        onClick={() => setHint((hint + 1) % PROMPTS.length)}
        className="mt-4 block w-full animate-fade rounded-[20px] bg-lilac-soft/70 px-5 py-3 text-left text-[14.5px] text-ink-soft transition hover:text-ink"
        key={hint}
      >
        Подсказка: {PROMPTS[hint]} <span className="text-ink-faint">· другая</span>
      </button>
      <button
        disabled={text.trim().length < 10}
        onClick={() => {
          chime(72, 0.05);
          setTimeout(() => chime(79, 0.05), 180);
          setSealed(true);
        }}
        className={`${buttonStyles.primary} mt-6`}
      >
        Запечатать письмо
      </button>
    </div>
  );
}
