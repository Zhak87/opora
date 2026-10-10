"use client";

import { useState } from "react";
import { ResultActions } from "./ResultActions";
import { useMsg } from "@/i18n/client";
import { wheelMessages } from "@/i18n/game-wheel";

// Цвета сфер; названия — в src/i18n/game-wheel.ts в том же порядке.
const AREAS = ["#9db894", "#b9aed6", "#d8b98f", "#8fa8bf", "#a9c7c0", "#c6b0d8", "#c9bfa3", "#9fb4cf"].map((color) => ({ color }));

const C = 160;
const R = 140;

function wedge(i: number, value: number) {
  const n = AREAS.length;
  const r = (R * value) / 10;
  const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 + 0.02;
  const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - 0.02;
  const p = (a: number) => `${(C + r * Math.cos(a)).toFixed(2)} ${(C + r * Math.sin(a)).toFixed(2)}`;
  return `M ${C} ${C} L ${p(a0)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${p(a1)} Z`;
}

export function Wheel() {
  const m = useMsg(wheelMessages);
  const [values, setValues] = useState(() => AREAS.map(() => 5));
  const [done, setDone] = useState(false);

  const sorted = AREAS.map((a, i) => ({ ...a, name: m.areas[i], v: values[i] })).sort((a, b) => a.v - b.v);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  const summary = AREAS.map((_, i) => `${m.areas[i]}: ${values[i]}`).join(", ");

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_1fr] md:items-start">
      <div className="mx-auto w-full max-w-[340px]">
        <svg viewBox="0 0 320 320" className="w-full" role="img" aria-label={m.aria}>
          {[2, 4, 6, 8, 10].map((r) => (
            <circle key={r} cx={C} cy={C} r={(R * r) / 10} fill="none" stroke="#ebe4d8" strokeWidth={1} />
          ))}
          {AREAS.map((a, i) => (
            <path key={i} d={wedge(i, values[i])} fill={a.color} fillOpacity={0.75} style={{ transition: "d 0.5s cubic-bezier(0.2,0.7,0.2,1)" }} />
          ))}
          <circle cx={C} cy={C} r={4} fill="#fffdf9" />
        </svg>
      </div>

      <div>
        {!done ? (
          <>
            <div className="space-y-4">
              {AREAS.map((a, i) => (
                <label key={i} className="block">
                  <span className="mb-1.5 flex items-center justify-between text-[15px] text-ink">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                      {m.areas[i]}
                    </span>
                    <span className="font-serif text-ink-soft">{values[i]}</span>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={values[i]}
                    onChange={(e) => setValues((v) => v.map((x, j) => (j === i ? Number(e.target.value) : x)))}
                    className="w-full"
                    style={{ accentColor: a.color }}
                  />
                </label>
              ))}
            </div>
            <button onClick={() => setDone(true)} className="mt-6 h-12 rounded-full bg-ink px-7 text-[15px] text-paper shadow-soft transition hover:bg-ink/90">
              {m.see}
            </button>
          </>
        ) : (
          <div className="animate-rise">
            <p className="font-serif text-[22px] leading-snug text-ink">
              {m.high(high.name)}
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              {m.low(low.name)}
            </p>
            <div className="mt-6">
              <ResultActions
                prompt={m.prompt(summary, low.name)}
                journal={m.journal(summary)}
                kind="goal"
              />
            </div>
            <button onClick={() => setDone(false)} className="mt-6 text-sm text-ink-faint hover:text-ink">
              {m.edit}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
