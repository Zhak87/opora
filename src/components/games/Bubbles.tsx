"use client";

import { useEffect, useRef, useState } from "react";
import { chime, PENTATONIC } from "@/lib/chime";

type Bubble = { id: number; x: number; size: number; dur: number; hue: number; text?: string; popped?: boolean };

const HUES = [
  "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), rgba(223,231,239,0.55) 40%, rgba(143,168,191,0.35) 100%)",
  "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), rgba(235,230,244,0.55) 40%, rgba(185,174,214,0.38) 100%)",
  "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), rgba(227,236,223,0.55) 40%, rgba(157,184,148,0.35) 100%)",
];

const HEIGHT = 520;
let nextId = 1;

export function Bubbles() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [released, setReleased] = useState(0);
  const [text, setText] = useState("");
  const area = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const spawn = () =>
      setBubbles((prev) =>
        prev.filter((b) => !b.popped).length > 12
          ? prev
          : [
              ...prev,
              {
                id: nextId++,
                x: 6 + Math.random() * 82,
                size: 48 + Math.random() * 64,
                dur: 11 + Math.random() * 8,
                hue: Math.floor(Math.random() * HUES.length),
              },
            ],
      );
    spawn();
    const t = setInterval(spawn, 1400);
    return () => clearInterval(t);
  }, []);

  const pop = (id: number) => {
    setBubbles((prev) => prev.map((b) => (b.id === id ? { ...b, popped: true } : b)));
    setReleased((n) => n + 1);
    chime(PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)], 0.06);
    setTimeout(() => setBubbles((prev) => prev.filter((b) => b.id !== id)), 450);
  };

  const release = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setBubbles((prev) => [
      ...prev,
      { id: nextId++, x: 20 + Math.random() * 50, size: Math.min(190, 110 + t.length * 2), dur: 18, hue: 1, text: t.slice(0, 80) },
    ]);
    setText("");
  };

  return (
    <div>
      <div
        ref={area}
        className="relative overflow-hidden rounded-[32px] border border-line/70 bg-gradient-to-b from-mist/70 via-paper to-lilac-soft/60 shadow-soft"
        style={{ height: HEIGHT }}
      >
        {bubbles.map((b) => (
          <div
            key={b.id}
            className="absolute"
            style={{
              left: `${b.x}%`,
              top: HEIGHT,
              width: b.size,
              height: b.size,
              marginLeft: -b.size / 2,
              ["--rise" as string]: `-${HEIGHT + b.size + 40}px`,
              animation: `bubble-rise ${b.dur}s linear forwards`,
            }}
            onAnimationEnd={(e) => {
              if (e.animationName === "bubble-rise") setBubbles((prev) => prev.filter((x) => x.id !== b.id));
            }}
          >
            <div style={{ animation: `bubble-sway ${4 + (b.id % 3)}s ease-in-out infinite` }} className="h-full w-full">
              <button
                type="button"
                aria-label={b.text ? `Отпустить мысль: ${b.text}` : "Лопнуть пузырёк"}
                onPointerDown={() => !b.popped && pop(b.id)}
                className="flex h-full w-full items-center justify-center rounded-full p-3 text-center font-serif text-[13px] leading-snug text-ink/80"
                style={{
                  background: HUES[b.hue],
                  boxShadow: "inset -6px -8px 18px rgba(127,113,168,0.12), inset 4px 4px 10px rgba(255,255,255,0.7), 0 10px 30px -14px rgba(95,125,152,0.4)",
                  border: "1px solid rgba(255,255,255,0.7)",
                  animation: b.popped ? "bubble-pop 0.45s ease-out forwards" : undefined,
                }}
              >
                {b.text}
              </button>
            </div>
          </div>
        ))}
        <p className="pointer-events-none absolute inset-x-0 top-5 text-center text-sm text-ink-faint">
          {released === 0 ? "Коснитесь пузырька" : `Отпущено: ${released}`}
        </p>
      </div>

      <form onSubmit={release} className="mt-5 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={80}
          placeholder="Напишите мысль, которую хотите отпустить"
          className="h-12 min-w-0 flex-1 rounded-full border border-line bg-paper px-5 text-[15px] text-ink outline-none placeholder:text-ink-faint focus:border-sky focus:ring-4 focus:ring-mist"
        />
        <button className="h-12 shrink-0 rounded-full bg-ink px-5 text-[15px] text-paper transition hover:bg-ink/90">Отпустить</button>
      </form>
      <p className="mt-3 px-2 text-sm leading-relaxed text-ink-faint">
        Мысль превратится в пузырёк. Когда будете готовы, коснитесь его и отпустите.
      </p>
    </div>
  );
}
