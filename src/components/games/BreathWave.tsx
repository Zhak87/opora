"use client";

import { useEffect, useRef, useState } from "react";
import { chime } from "@/lib/chime";
import { useMsg } from "@/i18n/client";
import { breathMessages } from "@/i18n/game-breath";

const IN_MS = 4000;
const OUT_MS = 6000;
const GOAL = 6;

// Держите — вдох (круг растёт), отпустите — выдох (круг сжимается).
export function BreathWave() {
  const [holding, setHolding] = useState(false);
  const [level, setLevel] = useState(0); // 0..1
  const [breaths, setBreaths] = useState(0);
  const levelRef = useRef(0);
  const holdingRef = useRef(false);
  const peaked = useRef(false);
  const m = useMsg(breathMessages);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      let l = levelRef.current;
      if (holdingRef.current) {
        l = Math.min(1, l + dt / IN_MS);
        if (l > 0.92) peaked.current = true;
      } else {
        l = Math.max(0, l - dt / OUT_MS);
        if (peaked.current && l < 0.08) {
          peaked.current = false;
          setBreaths((b) => {
            chime(b + 1 >= GOAL ? 79 : 72, 0.05);
            return b + 1;
          });
        }
      }
      levelRef.current = l;
      setLevel(l);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const set = (v: boolean) => {
    holdingRef.current = v;
    setHolding(v);
  };

  const label = holding
    ? level >= 1
      ? m.ready
      : m.inhale
    : level > 0.05
      ? m.exhale
      : breaths === 0
        ? m.start
        : m.again;

  const size = 140 + level * 170;
  const done = breaths >= GOAL;

  return (
    <div className="flex flex-col items-center">
      <div
        role="button"
        tabIndex={0}
        aria-label={m.aria}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          set(true);
        }}
        onPointerUp={() => set(false)}
        onPointerCancel={() => set(false)}
        onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), set(true))}
        onKeyUp={() => set(false)}
        onContextMenu={(e) => e.preventDefault()}
        className="relative flex h-[380px] w-full touch-none select-none items-center justify-center overflow-hidden rounded-[32px] border border-line/70 bg-gradient-to-b from-sage-soft/70 via-paper to-mist/60 shadow-soft"
      >
        <div className="absolute rounded-full border border-sage/40" style={{ width: 310, height: 310 }} aria-hidden />
        <div
          className="absolute rounded-full"
          aria-hidden
          style={{
            width: size,
            height: size,
            background: "radial-gradient(circle at 38% 32%, #fffdf9, #e3ecdf 40%, #b8cfe0 80%, #9db894)",
            boxShadow: `0 ${20 + level * 20}px ${50 + level * 40}px -24px rgba(106,138,98,0.55)`,
          }}
        />
        <span className="relative font-serif text-[22px] text-ink">{label}</span>
      </div>
      <div className="mt-6 flex items-center gap-2" aria-label={m.count(breaths)}>
        {Array.from({ length: GOAL }).map((_, i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${i < breaths ? "scale-110 bg-sage-deep" : "bg-sand-deep"}`} />
        ))}
      </div>
      <p className="mt-4 text-center text-[15px] text-ink-soft">
        {done ? m.done : m.tip}
      </p>
    </div>
  );
}
