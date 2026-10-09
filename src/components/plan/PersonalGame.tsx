"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PlanGame } from "@/lib/plan";
import { markGamePlayed } from "@/lib/plan-actions";
import { chime, PENTATONIC } from "@/lib/chime";
import { ResultActions } from "../games/ResultActions";
import { buttonStyles } from "../ui";

type Props = { planId: string; index: number; game: PlanGame };

export function PersonalGame(props: Props) {
  const { game } = props;
  const [finished, setFinished] = useState(false);
  const finish = () => {
    setFinished(true);
    chime(81, 0.05);
    markGamePlayed(props.planId, props.index);
  };
  const [round, setRound] = useState(0);
  const again = () => {
    setFinished(false);
    setRound((r) => r + 1);
  };

  if (finished) return <Finish game={game} onAgain={again} />;
  if (game.type === "cards") return <Cards key={round} game={game} onDone={finish} />;
  if (game.type === "reframe") return <Reframe key={round} game={game} onDone={finish} />;
  if (game.type === "choice") return <Choice key={round} game={game} onDone={finish} />;
  return <Steps key={round} game={game} onDone={finish} />;
}

function Progress({ at, total }: { at: number; total: number }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-1.5" aria-label={`${at + 1} из ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ${i === at ? "w-6 bg-ink/70" : i < at ? "w-1.5 bg-ink/40" : "w-1.5 bg-line"}`}
        />
      ))}
    </div>
  );
}

/* ---------- Карточки поддержки: переверните, чтобы прочитать ответ ---------- */

function Cards({ game, onDone }: { game: Extract<PlanGame, { type: "cards" }>; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = game.cards[i];
  const last = i === game.cards.length - 1;

  const next = () => {
    if (last) return onDone();
    setFlipped(false);
    setTimeout(() => setI(i + 1), 250);
  };

  return (
    <div className="flex flex-col items-center">
      <Progress at={i} total={game.cards.length} />
      <button
        key={i}
        onClick={() => {
          if (!flipped) chime(PENTATONIC[i % PENTATONIC.length] + 12, 0.04);
          setFlipped(!flipped);
        }}
        data-flipped={flipped}
        className="flip-card h-[320px] w-full max-w-sm animate-[card-in_0.5s_cubic-bezier(0.2,0.7,0.2,1)_both] text-left"
        aria-label={flipped ? "Перевернуть обратно" : "Перевернуть карточку"}
      >
        <span className="flip-inner relative block h-full w-full">
          <span className="flip-face absolute inset-0 flex flex-col items-center justify-center rounded-[32px] border border-line/70 bg-paper px-8 text-center shadow-lift">
            <span className="text-xs uppercase tracking-[0.16em] text-ink-faint">Когда кажется, что…</span>
            <span className="mt-4 font-serif text-[23px] leading-snug text-ink">{card.front}</span>
            <span className="mt-8 text-sm text-ink-faint">Нажмите, чтобы перевернуть</span>
          </span>
          <span className="flip-face flip-back absolute inset-0 flex flex-col items-center justify-center rounded-[32px] bg-gradient-to-br from-lilac-soft via-paper to-mist px-8 text-center shadow-lift">
            <span className="text-xs uppercase tracking-[0.16em] text-lilac-deep">Напомните себе</span>
            <span className="mt-4 text-[17px] leading-relaxed text-ink">{card.back}</span>
          </span>
        </span>
      </button>
      <div className="mt-8 h-12">
        {flipped && (
          <button onClick={next} className={`${buttonStyles.primary} animate-fade`}>
            {last ? "Завершить" : "Следующая"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Другой взгляд: сначала свой вариант, потом подсказка ---------- */

function Reframe({ game, onDone }: { game: Extract<PlanGame, { type: "reframe" }>; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [shown, setShown] = useState(false);
  const answers = useRef<string[]>([]);
  const item = game.items[i];
  const last = i === game.items.length - 1;

  const next = () => {
    answers.current[i] = text.trim();
    if (last) return onDone();
    setI(i + 1);
    setText("");
    setShown(false);
  };

  return (
    <div className="mx-auto max-w-xl">
      <Progress at={i} total={game.items.length} />
      <div key={i} className="animate-rise">
        <div className="rounded-[28px] bg-mist px-6 py-7 shadow-soft">
          <p className="text-xs uppercase tracking-[0.16em] text-sky-deep">Тяжёлая мысль</p>
          <p className="mt-3 font-serif text-[22px] leading-snug text-ink">«{item.thought}»</p>
        </div>
        <label className="mt-5 block">
          <span className="mb-2 block px-1 text-[15px] text-ink-soft">Как бы вы ответили на неё другу? Напишите своими словами.</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Например: это неправда, потому что…"
            className="w-full resize-none rounded-[22px] border border-line bg-paper px-5 py-4 text-[15px] leading-relaxed text-ink outline-none transition placeholder:text-ink-faint focus:border-sky focus:ring-4 focus:ring-mist"
          />
        </label>
        {shown ? (
          <div className="mt-4 animate-rise rounded-[24px] border border-sage/40 bg-sage-soft/70 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-sage-deep">Можно посмотреть и так</p>
            <p className="mt-2 text-[15.5px] leading-relaxed text-ink">{item.example}</p>
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          {!shown && (
            <button
              onClick={() => {
                chime(76, 0.04);
                setShown(true);
              }}
              className={buttonStyles.soft}
            >
              Показать другой взгляд
            </button>
          )}
          {(shown || text.trim()) && (
            <button onClick={next} className={`${buttonStyles.primary} animate-fade`}>
              {last ? "Завершить" : "Дальше"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Что бы вы сделали: выбор и мягкий отклик ---------- */

function Choice({ game, onDone }: { game: Extract<PlanGame, { type: "choice" }>; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const s = game.scenarios[i];
  const last = i === game.scenarios.length - 1;

  return (
    <div className="mx-auto max-w-xl">
      <Progress at={i} total={game.scenarios.length} />
      <div key={i} className="animate-rise">
        <p className="rounded-[28px] bg-sand px-6 py-7 font-serif text-[21px] leading-snug text-ink shadow-soft">{s.situation}</p>
        <div className="mt-5 space-y-3">
          {s.options.map((o, k) => {
            const on = picked === k;
            return (
              <button
                key={k}
                onClick={() => {
                  if (picked !== k) chime(PENTATONIC[k + 2], 0.04);
                  setPicked(k);
                }}
                aria-pressed={on}
                className={`block w-full rounded-[22px] border px-5 py-4 text-left transition-all duration-300 ${
                  on ? "border-lilac bg-paper shadow-lift" : picked !== null ? "border-line/60 bg-paper/60 opacity-70 hover:opacity-100" : "border-line bg-paper hover:border-sand-deep hover:shadow-soft"
                }`}
              >
                <span className="text-[15.5px] text-ink">{o.text}</span>
                {on && <span className="mt-2 block animate-fade text-[14.5px] leading-relaxed text-ink-soft">{o.feedback}</span>}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <p className="mt-3 px-1 text-sm text-ink-faint">Можно нажать и на другие варианты, чтобы сравнить.</p>
        )}
        <div className="mt-6 h-12">
          {picked !== null && (
            <button
              onClick={() => {
                if (last) return onDone();
                setI(i + 1);
                setPicked(null);
              }}
              className={`${buttonStyles.primary} animate-fade`}
            >
              {last ? "Завершить" : "Следующая ситуация"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Практика: шаги с мягким таймером ---------- */

function Steps({ game, onDone }: { game: Extract<PlanGame, { type: "steps" }>; onDone: () => void }) {
  const [i, setI] = useState(0);
  const step = game.steps[i];
  const [left, setLeft] = useState(step.seconds);
  const last = i === game.steps.length - 1;

  useEffect(() => {
    setLeft(game.steps[i].seconds);
    if (!game.steps[i].seconds) return;
    const id = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(id);
          chime(76, 0.05);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [i, game.steps]);

  const r = 52;
  const c = 2 * Math.PI * r;
  const part = step.seconds ? left / step.seconds : 0;

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center text-center">
      <Progress at={i} total={game.steps.length} />
      <div className="relative flex h-40 w-40 items-center justify-center" aria-hidden>
        <span className="absolute h-28 w-28 animate-breathe rounded-full bg-sage-soft" />
        <span className="absolute h-16 w-16 animate-breathe rounded-full bg-paper/80 [animation-delay:-4s]" />
        {step.seconds > 0 && (
          <svg viewBox="0 0 120 120" className="absolute h-40 w-40 -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-line)" strokeWidth="3" />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="var(--color-sage-deep)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - part)}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
        )}
        {step.seconds > 0 && <span className="relative font-serif text-[26px] text-ink">{left}</span>}
      </div>
      <p key={i} className="mt-8 animate-rise font-serif text-[22px] leading-snug text-ink">
        {step.text}
      </p>
      <div className="mt-8 flex gap-3">
        <button onClick={() => (last ? onDone() : setI(i + 1))} className={step.seconds && left > 0 ? buttonStyles.soft : buttonStyles.primary}>
          {last ? "Завершить" : step.seconds && left > 0 ? "Дальше, не дожидаясь" : "Дальше"}
        </button>
      </div>
    </div>
  );
}

/* ---------- Финал ---------- */

function Finish({ game, onAgain }: { game: PlanGame; onAgain: () => void }) {
  return (
    <div className="animate-rise">
      <div className="rounded-[32px] bg-gradient-to-br from-sage-soft via-paper to-lilac-soft px-7 py-10 text-center shadow-soft">
        <span className="relative mx-auto flex h-16 w-16 items-center justify-center" aria-hidden>
          <span className="absolute h-16 w-16 animate-breathe rounded-full bg-paper" />
          <span className="absolute h-8 w-8 animate-breathe rounded-full bg-sage/60 [animation-delay:-3s]" />
        </span>
        <p className="mt-5 font-serif text-[26px] text-ink">Вы прошли «{game.title}»</p>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
          Спасибо, что уделили себе это время. Возвращайтесь к этой игре, когда снова станет непросто: с каждым разом новые мысли
          приходят легче.
        </p>
      </div>
      <div className="mt-6">
        <ResultActions
          prompt={`Я прошёл(а) личную игру «${game.title}» в разделе «Для вас». Хочу поговорить о том, что почувствовал(а).`}
          journal={`Прошёл(а) игру «${game.title}». Что я заметил(а): `}
        />
      </div>
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <button onClick={onAgain} className="text-ink-faint hover:text-ink">
          Пройти ещё раз
        </button>
        <Link href="/play/me" className="text-ink-faint hover:text-ink">
          Все мои игры и советы
        </Link>
      </div>
    </div>
  );
}
