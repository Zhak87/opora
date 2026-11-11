"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Orb } from "@/components/Orb";
import { buttonStyles } from "@/components/ui";
import { ArrowIcon, BackIcon, CheckIcon, GridIcon, HeartHandIcon, ShieldIcon, TalkIcon, UsersIcon } from "@/components/icons";
import { useMsg } from "@/i18n/client";
import { guideMessages } from "@/i18n/guide";
import { chime } from "@/lib/chime";
import { sendEvent } from "@/components/Track";
import { finishGuide } from "@/lib/guide-actions";
import { startTrial } from "@/lib/trial-actions";
import { trialMessages } from "@/i18n/trial";

// Знакомство с «Опорой»: рассказ из семи сцен. Листается сам, как истории, или по нажатию;
// удержание ставит на паузу. Каждая сцена появляется с анимацией и тихим звуком.

const SOUND_KEY = "opora-guide-sound";
// Сколько сцена держится на экране (мс). 0 — ждёт человека: первая и последняя.
const DURATIONS = [0, 8000, 9000, 8000, 8000, 9000, 0];
// Звуки сцены: [задержка, нота]. Пентатоника, чтобы любые сочетания звучали мягко.
const CUES: [number, number][][] = [
  [[200, 69], [450, 76], [700, 81]],
  [[300, 72], [2900, 79], [4300, 84]],
  [[200, 64], [1500, 72], [1750, 76], [2000, 79], [2250, 84]],
  [[400, 69], [750, 72], [1100, 76], [1450, 79], [1800, 84]],
  [[300, 72], [900, 76], [1900, 84]],
  [[900, 69], [1500, 72], [2100, 76]],
  [[100, 72], [220, 76], [340, 79], [600, 84]],
];
// Мягкое цветное пятно за сценой: у каждой свой оттенок.
const GLOWS = ["#e6e4ff", "#dcebfb", "#d6f2e6", "#ffe4d8", "#fbe4f0", "#dcebfb", "#e6e4ff"];

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export function Story({ authed }: { authed: boolean }) {
  const m = useMsg(guideMessages);
  const t = useMsg(trialMessages);
  const total = DURATIONS.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [calm, setCalm] = useState(false);
  const soundRef = useRef(true);
  const held = useRef(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(SOUND_KEY) === "off") {
        setSound(false);
        soundRef.current = false;
      }
    } catch {}
    // Кто просил меньше движения, листает сам: без автоперехода.
    setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Аналитика: человек начал знакомство и дошёл до конца.
  useEffect(() => {
    if (index === 1) sendEvent("guide_start");
    if (index === total - 1) sendEvent("guide_complete");
  }, [index, total]);

  // Звуки текущей сцены.
  useEffect(() => {
    const timers = CUES[index].map(([at, note]) =>
      window.setTimeout(() => {
        if (soundRef.current) chime(note, 0.06);
      }, at),
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [index]);

  const go = useCallback(
    (step: number) => {
      setPaused(false);
      setIndex((i) => Math.min(total - 1, Math.max(0, i + step)));
    },
    [total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const toggleSound = () => {
    const on = !sound;
    setSound(on);
    soundRef.current = on;
    try { localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch {}
    if (on) chime(76, 0.06);
  };

  const interactive = (target: EventTarget | null) => Boolean((target as Element | null)?.closest?.("button, a, form"));
  const last = index === total - 1;
  const auto = DURATIONS[index] > 0 && !calm;

  return (
    <div
      className={`fixed inset-0 z-50 flex select-none flex-col overflow-hidden bg-milk ${paused ? "guide-paused" : ""}`}
      onPointerDown={(e) => {
        if (interactive(e.target)) return;
        held.current = Date.now();
        setPaused(true);
      }}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
      onClick={(e) => {
        // Короткое нажатие листает дальше; долгое было паузой.
        if (interactive(e.target) || Date.now() - held.current > 350 || last) return;
        go(1);
      }}
    >
      {/* Цветное пятно сцены плавно перетекает из одной в другую */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[30%] h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-90 blur-3xl transition-colors duration-[1400ms]"
        style={{ backgroundColor: GLOWS[index] }}
      />

      <div className="relative mx-auto flex h-full w-full max-w-[480px] flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        {/* Полоски прогресса, как в историях */}
        <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1} aria-label={m.progress(index + 1, total)}>
          {DURATIONS.map((d, i) => (
            <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-ink/10">
              {i < index && <span className="block h-full w-full bg-lilac-deep" />}
              {i === index &&
                (auto ? (
                  <span
                    key={index}
                    className="block h-full w-full origin-left bg-lilac-deep [animation:guide-fill_linear_forwards]"
                    style={{ animationDuration: `${d}ms` }}
                    onAnimationEnd={() => go(1)}
                  />
                ) : (
                  <span className="block h-full w-full bg-lilac-deep" />
                ))}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={toggleSound}
            aria-label={sound ? m.soundOff : m.soundOn}
            aria-pressed={sound}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-paper/80 text-ink-soft shadow-soft transition hover:text-ink"
          >
            <SoundIcon on={sound} />
          </button>
          {!last &&
            (authed ? (
              <form action={finishGuide}>
                <input type="hidden" name="to" value="/" />
                <button type="submit" className="h-10 rounded-full px-4 text-sm text-ink-soft transition hover:bg-paper/80 hover:text-ink">
                  {m.skip}
                </button>
              </form>
            ) : (
              <Link href="/welcome" className="flex h-10 items-center rounded-full px-4 text-sm text-ink-soft transition hover:bg-paper/80 hover:text-ink">
                {m.skip}
              </Link>
            ))}
        </div>

        {/* Сцена пересоздаётся при каждом шаге, поэтому анимации начинаются заново */}
        <div key={index} className="flex min-h-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            {index === 0 && <IntroArt feelings={m.intro.feelings} />}
            {index === 1 && <TalkArt you={m.talk.you} reply={m.talk.reply} voice={m.talk.voice} />}
            {index === 2 && <PracticeArt inhale={m.practices.inhale} exhale={m.practices.exhale} chips={m.practices.chips} />}
            {index === 3 && <RoomsArt live={m.rooms.live} topic={m.rooms.topic} />}
            {index === 4 && <ProsArt names={m.pros.names} role={m.pros.role} verified={m.pros.verified} book={m.pros.book} />}
            {index === 5 && <AccountArt points={m.account.points} />}
            {index === 6 && <Orb size={150} face mood={5} className="g-in" />}
          </div>

          <Caption scene={[m.intro, m.talk, m.practices, m.rooms, m.pros, m.account, m.finish][index]} />

          {last && (
            <div className="g-in mt-5" style={delay(500)}>
              {authed ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <Choice to="talk" title={m.finish.talk} hint={m.finish.talkHint} tone="bg-ink text-paper" iconTone="bg-lilac-deep text-paper" Icon={TalkIcon} wide />
                  <Choice to="/play" title={m.finish.practice} hint={m.finish.practiceHint} tone="bg-paper text-ink" iconTone="bg-sage-soft text-sage-deep" Icon={GridIcon} />
                  <Choice to="/rooms" title={m.finish.rooms} hint={m.finish.roomsHint} tone="bg-paper text-ink" iconTone="bg-peach-soft text-peach-deep" Icon={UsersIcon} />
                  <Choice to="/specialists" title={m.finish.pros} hint={m.finish.prosHint} tone="bg-paper text-ink" iconTone="bg-rose-soft text-lilac-deep" Icon={HeartHandIcon} wide />
                  <form action={finishGuide} className="col-span-2 text-center">
                    <input type="hidden" name="to" value="/" />
                    <button type="submit" className="h-10 px-4 text-sm text-ink-soft underline-offset-4 transition hover:text-ink hover:underline">
                      {m.finish.home}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <Link href="/signup" className={`${buttonStyles.primary} h-14`}>{m.finish.signup}</Link>
                  <form action={startTrial} className="contents">
                    <input type="hidden" name="guide" value="seen" />
                    <button type="submit" className={`${buttonStyles.soft} h-14`}>{m.finish.demo}</button>
                  </form>
                  <p className="text-center text-xs leading-relaxed text-ink-faint">
                    {t.startNote[0]}
                    <Link href="/terms" className="underline underline-offset-2 hover:text-ink-soft">{t.startNote[1]}</Link>
                    {t.startNote[2]}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {!last && (
          <div className="mt-5 flex items-center gap-3">
            {index > 0 && (
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={m.back}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-paper text-ink-soft shadow-soft transition hover:text-ink active:scale-95"
              >
                <BackIcon className="h-5 w-5" />
              </button>
            )}
            <button type="button" onClick={() => go(1)} className={`${buttonStyles.primary} group h-14 flex-1 text-base`}>
              {index === 0 ? m.begin : m.next}
              <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-1" />
            </button>
          </div>
        )}
        {/* Строка подсказки всегда занимает место, чтобы кнопки не прыгали между сценами */}
        {!last && (
          <p className="mt-3 h-4 text-center text-xs text-ink-faint">
            {index === 1 && <span className="g-in inline-block" style={delay(1500)}>{m.holdHint}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function Caption({ scene }: { scene: { eyebrow: string; title: string; text: string } }) {
  return (
    <div className="text-center">
      <p className="g-in inline-flex rounded-full bg-paper/80 px-3 py-1 text-xs font-medium text-lilac-deep shadow-soft" style={delay(100)}>
        {scene.eyebrow}
      </p>
      <h1 className="g-in mt-3 font-serif text-[26px] leading-[1.12] text-ink sm:text-[32px]" style={delay(220)}>{scene.title}</h1>
      <p className="g-in mx-auto mt-3 max-w-[26rem] text-[15px] leading-relaxed text-ink-soft sm:text-base" style={delay(380)}>{scene.text}</p>
    </div>
  );
}

function Choice({
  to,
  title,
  hint,
  tone,
  iconTone,
  Icon,
  wide = false,
}: {
  to: string;
  title: string;
  hint: string;
  tone: string;
  iconTone: string;
  Icon: (p: { className?: string }) => ReactNode;
  wide?: boolean;
}) {
  return (
    <form action={finishGuide} className={wide ? "col-span-2" : ""}>
      <input type="hidden" name="to" value={to} />
      <button type="submit" className={`lift flex w-full items-center gap-3 rounded-[22px] p-3.5 text-left shadow-soft ${tone}`}>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${iconTone}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-medium leading-tight">{title}</span>
          <span className="mt-0.5 block text-xs opacity-60">{hint}</span>
        </span>
      </button>
    </form>
  );
}

/* ---------- Сцены ---------- */

function IntroArt({ feelings }: { feelings: string[] }) {
  const spots = ["left-[2%] top-[14%] bg-peach-soft", "right-[2%] top-[30%] bg-sage-soft", "left-[10%] bottom-[10%] bg-mist"];
  return (
    <div className="relative flex h-full max-h-[320px] w-full items-center justify-center">
      <div className="[animation:guide-drop_1.1s_cubic-bezier(0.3,1.4,0.5,1)_both]">
        <Orb size={190} face mood={4} />
      </div>
      {feelings.slice(0, 3).map((f, i) => (
        <span key={f} className={`g-in absolute ${spots[i]} rounded-full`} style={delay(700 + i * 250)}>
          <span className="block animate-float whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-ink shadow-soft" style={{ animationDelay: `${-i * 1.6}s` }}>
            {f}
          </span>
        </span>
      ))}
    </div>
  );
}

function TalkArt({ you, reply, voice }: { you: string; reply: string; voice: string }) {
  return (
    <div className="flex w-full max-w-[360px] flex-col gap-3">
      <div className="g-in ml-auto max-w-[82%] rounded-[22px] rounded-br-md bg-ink px-4 py-3 text-[15px] leading-snug text-paper shadow-soft" style={delay(300)}>
        {you}
      </div>
      <div className="flex items-end gap-2">
        <Orb size={44} face mood={4} className="g-in" />
        <div className="grid">
          {/* Собеседник «печатает», затем на этом же месте появляется ответ */}
          <div className="col-start-1 row-start-1 flex h-11 w-16 items-center justify-center gap-1.5 self-end rounded-[22px] rounded-bl-md bg-paper shadow-soft [animation:guide-typing_1.6s_ease_1.2s_both]">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-ink-faint [animation:guide-dot_0.9s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <div className="g-in col-start-1 row-start-1 max-w-[260px] rounded-[22px] rounded-bl-md bg-paper px-4 py-3 text-[15px] leading-snug text-ink shadow-soft" style={delay(2900)}>
            {reply}
          </div>
        </div>
      </div>
      <div className="g-in mx-auto mt-2 flex items-center gap-2 rounded-full bg-lilac-soft px-4 py-2 text-sm text-lilac-deep" style={delay(4300)}>
        <span className="flex h-4 items-end gap-[3px]" aria-hidden>
          {[0.5, 1, 0.7, 0.9].map((h, i) => (
            <span key={i} className="w-[3px] origin-bottom rounded-full bg-lilac-deep [animation:music-bar_0.7s_ease-in-out_infinite_alternate]" style={{ height: `${h * 16}px`, animationDelay: `${i * 0.12}s` }} />
          ))}
        </span>
        {voice}
      </div>
    </div>
  );
}

function PracticeArt({ inhale, exhale, chips }: { inhale: string; exhale: string; chips: string[] }) {
  const tones = ["bg-mist text-sky-deep", "bg-sage-soft text-sage-deep", "bg-lilac-soft text-lilac-deep", "bg-peach-soft text-peach-deep"];
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="g-in relative flex h-[170px] w-[170px] items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-sage/50 [animation:guide-breath_8s_ease-in-out_infinite]" />
        <span className="absolute inset-[14%] rounded-full bg-sage-soft [animation:guide-breath_8s_ease-in-out_infinite]" />
        <span className="relative grid text-center font-display text-[15px] text-sage-deep">
          <span className="col-start-1 row-start-1 [animation:guide-in-out_8s_ease-in-out_infinite]">{inhale}</span>
          <span className="col-start-1 row-start-1 [animation:guide-in-out_8s_ease-in-out_-4s_infinite]">{exhale}</span>
        </span>
      </div>
      <div className="flex max-w-[340px] flex-wrap justify-center gap-2">
        {chips.map((c, i) => (
          <span key={c} className={`g-pop rounded-full px-3.5 py-2 text-sm font-medium shadow-soft ${tones[i % tones.length]}`} style={delay(1500 + i * 250)}>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function RoomsArt({ live, topic }: { live: string; topic: string }) {
  // Люди в комнате: маленькие капли вокруг темы. Одна сейчас говорит.
  const seats: [string, number][] = [
    ["left-1/2 top-0 -translate-x-1/2", 4],
    ["right-[4%] top-[26%]", 3],
    ["right-[14%] bottom-[2%]", 5],
    ["left-[14%] bottom-[2%]", 2],
    ["left-[4%] top-[26%]", 4],
  ];
  return (
    <div className="relative h-[250px] w-full max-w-[320px]">
      {seats.map(([pos, mood], i) => (
        <span key={i} className={`absolute ${pos}`}>
          <span className="g-pop relative block" style={delay(400 + i * 350)}>
            {i === 0 && (
              <>
                <span className="absolute inset-0 rounded-full border-2 border-lilac [animation:ripple_2s_ease-out_infinite]" />
                <span className="absolute inset-0 rounded-full border-2 border-lilac [animation:ripple_2s_ease-out_1s_infinite]" />
              </>
            )}
            <Orb size={62} face mood={mood} />
          </span>
        </span>
      ))}
      <div className="g-in absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5" style={delay(200)}>
        <span className="whitespace-nowrap rounded-full bg-paper px-4 py-2 text-sm font-medium text-ink shadow-lift">{topic}</span>
        <span className="flex items-center gap-1.5 text-xs text-ink-soft">
          <span className="h-2 w-2 rounded-full bg-sage [animation:guide-blink_1.4s_ease-in-out_infinite]" />
          {live}
        </span>
      </div>
    </div>
  );
}

function ProsArt({ names, role, verified, book }: { names: string[]; role: string; verified: string; book: string }) {
  const looks = [
    ["-rotate-3", "linear-gradient(140deg,#f6b8d8,#c7b2f5)"],
    ["rotate-2 ml-auto -mt-3", "linear-gradient(140deg,#8fd3ff,#a9b4ff)"],
  ];
  return (
    <div className="w-full max-w-[330px]">
      {names.slice(0, 2).map((name, i) => (
        <div key={name} className={`g-in w-[92%] ${looks[i][0]}`} style={delay(300 + i * 600)}>
          <div className="flex items-center gap-3 rounded-[24px] bg-paper p-4 shadow-lift">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-lg text-paper" style={{ background: looks[i][1] }}>
              {name[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium text-ink">{name}</span>
              <span className="block text-xs text-ink-soft">{role}</span>
              <span className="g-pop mt-1.5 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-sage-soft px-2 py-0.5 text-[11px] font-medium text-sage-deep" style={delay(1300 + i * 600)}>
                <CheckIcon className="h-3 w-3" />
                {verified}
              </span>
            </span>
            {i === 1 && <span className="g-pop rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-paper" style={delay(2600)}>{book}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function AccountArt({ points }: { points: string[] }) {
  return (
    <div className="flex w-full max-w-[340px] flex-col items-center gap-5">
      <div className="g-pop relative" style={delay(200)}>
        <Orb size={96} face mood={5} />
        <span className="g-pop absolute -bottom-1 -right-2 flex h-10 w-10 items-center justify-center rounded-[14px] bg-ink text-paper shadow-lift" style={delay(700)}>
          <ShieldIcon className="h-5 w-5" />
        </span>
      </div>
      <ul className="w-full space-y-2">
        {points.map((p, i) => (
          <li key={p} className="g-in flex items-center gap-3 rounded-[18px] bg-paper px-4 py-3 text-left text-sm leading-snug text-ink shadow-soft" style={delay(900 + i * 600)}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage-soft text-sage-deep">
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4Z" />
      {on ? (
        <>
          <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />
          <path d="M18 7a7 7 0 0 1 0 10" />
        </>
      ) : (
        <path d="m16 9.5 5 5m0-5-5 5" />
      )}
    </svg>
  );
}
