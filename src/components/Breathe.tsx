"use client";

import { useEffect, useState } from "react";

const PHASES = [
  { label: "Вдох", seconds: 4, scale: 1 },
  { label: "Задержка", seconds: 4, scale: 1 },
  { label: "Выдох", seconds: 6, scale: 0.6 },
];

// Небольшая пауза на дыхание: вдох 4 — задержка 4 — выдох 6.
export function Breathe({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const r = requestAnimationFrame(() => setStarted(true));
    return () => cancelAnimationFrame(r);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase((p) => {
        const next = (p + 1) % PHASES.length;
        if (next === 0) setCycles((c) => c + 1);
        return next;
      });
    }, PHASES[phase].seconds * 1000);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const current = PHASES[phase];
  return (
    <div
      role="dialog"
      aria-label="Дыхательная пауза"
      className="fixed inset-0 z-50 flex animate-fade flex-col items-center justify-center bg-milk/95 px-6 backdrop-blur-xl"
    >
      <div className="relative flex h-64 w-64 items-center justify-center">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 40% 35%, #fffdf9, #e7e1f2 40%, #bccfe0 75%, #b4cbaa)",
            transform: `scale(${started ? current.scale : 0.6})`,
            transition: `transform ${current.seconds}s ease-in-out`,
            boxShadow: "0 30px 80px -30px rgb(95 125 152 / 0.5)",
          }}
        />
        <span className="relative font-serif text-2xl text-ink" aria-live="polite">
          {current.label}
        </span>
      </div>
      <p className="mt-10 text-center text-[15px] text-ink-soft">
        {cycles < 3 ? "Просто следуйте за кругом." : "Хорошо. Можно вернуться к разговору, когда будете готовы."}
      </p>
      <button onClick={onClose} className="mt-8 rounded-full px-6 py-3 text-sm text-ink-soft transition hover:bg-sand hover:text-ink">
        Вернуться
      </button>
    </div>
  );
}
