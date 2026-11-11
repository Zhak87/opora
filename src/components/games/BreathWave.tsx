"use client";

import { useEffect, useRef, useState } from "react";
import { chime } from "@/lib/chime";
import { surf } from "@/lib/sounds";
import { useMsg } from "@/i18n/client";
import { breathMessages } from "@/i18n/game-breath";

const GOAL = 6;
// Ритмы: вдох, пауза, выдох (секунды).
const RHYTHMS: [number, number, number][] = [
  [4, 0, 6],
  [4, 0, 4],
  [4, 7, 8],
];

type Phase = "in" | "hold" | "out";

// Волна дыхания: море поднимается на вдохе и уходит на выдохе, с мягким шумом прибоя.
// Два режима: волна ведёт в выбранном ритме, или человек сам держит палец на вдохе.
export function BreathWave() {
  const m = useMsg(breathMessages);
  const [mode, setMode] = useState<"follow" | "lead">("follow");
  const [rhythm, setRhythm] = useState(0);
  const [running, setRunning] = useState(false);
  const [sound, setSound] = useState(true);
  const [phase, setPhase] = useState<Phase>("in");
  const [secLeft, setSecLeft] = useState(0);
  const [breaths, setBreaths] = useState(0);
  const [holding, setHolding] = useState(false);

  const level = useRef(0);
  const holdingRef = useRef(false);
  const svg = useRef<SVGSVGElement>(null);
  const surfRef = useRef<ReturnType<typeof surf> | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  // Один цикл анимации на всё: уровень воды, форма волн, звук.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let t = 0;
    let cycle = 0;
    let lastPhase: Phase | null = null;
    let peaked = false;
    let shownSec = -1;
    const [inS, holdS, outS] = RHYTHMS[rhythm];
    const total = inS + holdS + outS;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      let l = level.current;
      if (mode === "follow" && running) {
        cycle = (cycle + dt) % total;
        let p: Phase;
        let left: number;
        if (cycle < inS) {
          p = "in";
          l = ease(cycle / inS);
          left = inS - cycle;
        } else if (cycle < inS + holdS) {
          p = "hold";
          l = 1;
          left = inS + holdS - cycle;
        } else {
          p = "out";
          l = 1 - ease((cycle - inS - holdS) / outS);
          left = total - cycle;
        }
        if (p !== lastPhase) {
          if (lastPhase === "out" && p === "in") setBreaths((b) => b + 1);
          lastPhase = p;
          setPhase(p);
          chime(p === "in" ? 72 : p === "hold" ? 76 : 67, 0.03);
        }
        const s = Math.ceil(left);
        if (s !== shownSec) {
          shownSec = s;
          setSecLeft(s);
        }
      } else if (mode === "lead") {
        if (holdingRef.current) {
          l = Math.min(1, l + dt / 4);
          if (l > 0.92) peaked = true;
        } else {
          l = Math.max(0, l - dt / 6);
          if (peaked && l < 0.08) {
            peaked = false;
            setBreaths((b) => {
              chime(b + 1 >= GOAL ? 79 : 72, 0.05);
              return b + 1;
            });
          }
        }
      } else {
        l += (0.25 - l) * dt;
      }
      level.current = l;
      drawWaves(svg.current, l, t);
      if (surfRef.current) surfRef.current.set(soundRef.current ? l : 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, rhythm, running]);

  useEffect(() => () => surfRef.current?.stop(), []);

  const ensureSound = () => {
    surfRef.current ??= surf();
  };

  const startFollow = () => {
    ensureSound();
    setBreaths(0);
    setRunning(true);
  };

  const press = (v: boolean) => {
    if (mode !== "lead") return;
    if (v) ensureSound();
    holdingRef.current = v;
    setHolding(v);
  };

  const done = breaths >= GOAL;
  const label =
    mode === "follow"
      ? running
        ? phase === "in"
          ? m.inhale
          : phase === "hold"
            ? m.hold
            : m.exhale
        : ""
      : holding
        ? level.current >= 0.98
          ? m.ready
          : m.inhale
        : level.current > 0.08
          ? m.exhale
          : breaths === 0
            ? m.start
            : m.again;

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex rounded-full bg-paper/80 p-1 shadow-soft">
        {(["follow", "lead"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setMode(k);
              setRunning(false);
              setBreaths(0);
            }}
            className={`rounded-full px-5 py-2 text-sm transition ${mode === k ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
          >
            {m[k]}
          </button>
        ))}
      </div>

      <div
        role={mode === "lead" ? "button" : "img"}
        tabIndex={mode === "lead" ? 0 : -1}
        aria-label={mode === "lead" ? m.aria : m.followTip}
        onPointerDown={(e) => {
          if (mode !== "lead") return;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          press(true);
        }}
        onPointerUp={() => press(false)}
        onPointerCancel={() => press(false)}
        onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), press(true))}
        onKeyUp={() => press(false)}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative h-[420px] w-full select-none overflow-hidden rounded-[36px] shadow-lift sm:h-[460px] ${mode === "lead" ? "touch-none cursor-pointer" : ""}`}
        style={{ background: "linear-gradient(180deg, #e9e6ff 0%, #f6efff 30%, #ffeee4 52%, #fff7ef 60%)" }}
      >
        <span className="absolute left-1/2 top-[22%] h-28 w-28 -translate-x-1/2 animate-breathe rounded-full bg-[radial-gradient(circle,#fff8ee_0%,#ffd9c2_55%,transparent_72%)]" aria-hidden />
        <svg ref={svg} viewBox="0 0 400 420" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="bw-sea1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#b9d4f5" />
              <stop offset="1" stopColor="#8db4ea" />
            </linearGradient>
            <linearGradient id="bw-sea2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9cc6ec" />
              <stop offset="1" stopColor="#5f8fd0" />
            </linearGradient>
            <linearGradient id="bw-sea3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#a9e0cc" />
              <stop offset="1" stopColor="#4f86c4" />
            </linearGradient>
          </defs>
          <path data-wave="0" fill="url(#bw-sea1)" opacity="0.7" />
          <path data-wave="1" fill="url(#bw-sea2)" opacity="0.8" />
          <path data-wave="2" fill="url(#bw-sea3)" />
          <path data-foam="1" fill="none" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-x-0 top-[9%] flex flex-col items-center">
          {mode === "follow" && !running ? (
            <button
              type="button"
              onClick={startFollow}
              className="h-14 rounded-full bg-ink px-9 text-[16px] text-paper shadow-lift transition hover:-translate-y-0.5 hover:bg-lilac-deep"
            >
              {m.begin}
            </button>
          ) : (
            <>
              <span className="font-serif text-[28px] text-ink drop-shadow-[0_1px_8px_rgba(255,255,255,0.9)]">{label}</span>
              {mode === "follow" && <span className="mt-1 font-serif text-[18px] tabular-nums text-ink-soft">{secLeft}</span>}
            </>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2" aria-label={m.count(breaths)}>
        {Array.from({ length: GOAL }).map((_, i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${i < breaths ? "scale-110 bg-sky-deep" : "bg-sand-deep"}`} />
        ))}
      </div>
      <p className="mt-3 max-w-md text-center text-[15px] text-ink-soft">{done ? m.done : mode === "follow" ? m.followTip : m.tip}</p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {mode === "follow" &&
          m.rhythms.map((r, i) => (
            <button
              key={r}
              type="button"
              onClick={() => setRhythm(i)}
              aria-pressed={rhythm === i}
              className={`rounded-full px-4 py-2 text-[13.5px] transition ${rhythm === i ? "bg-mist text-sky-deep" : "text-ink-soft hover:bg-sand"}`}
            >
              {r}
            </button>
          ))}
        <button
          type="button"
          onClick={() => {
            ensureSound();
            setSound(!sound);
          }}
          aria-pressed={sound}
          className={`rounded-full px-4 py-2 text-[13.5px] transition ${sound ? "bg-mist text-sky-deep" : "text-ink-soft hover:bg-sand"}`}
        >
          {m.surf}
        </button>
      </div>
    </div>
  );
}

const ease = (x: number) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, x))) / 2;

// Три слоя волн: чем выше уровень, тем выше море и крупнее гребни.
function drawWaves(el: SVGSVGElement | null, level: number, t: number) {
  if (!el) return;
  const layers = [
    { base: 300, amp: 9, len: 160, speed: 0.35, lift: 120 },
    { base: 322, amp: 12, len: 210, speed: -0.25, lift: 135 },
    { base: 346, amp: 15, len: 260, speed: 0.45, lift: 150 },
  ];
  let foam = "";
  layers.forEach((L, i) => {
    const y0 = L.base - level * L.lift;
    const a = L.amp * (0.6 + level * 0.8);
    let d = `M 0 420 L 0 ${y0}`;
    for (let x = 0; x <= 400; x += 10) {
      const y = y0 + Math.sin((x / L.len) * Math.PI * 2 + t * L.speed * 3 + i) * a + Math.sin((x / 70) * Math.PI + t * 1.3) * 2;
      d += ` L ${x} ${y.toFixed(1)}`;
      if (i === 2) foam += `${x === 0 ? "M" : "L"} ${x} ${(y - 1).toFixed(1)} `;
    }
    d += " L 400 420 Z";
    el.querySelector(`[data-wave="${i}"]`)?.setAttribute("d", d);
  });
  el.querySelector("[data-foam]")?.setAttribute("d", foam);
}
