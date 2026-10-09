"use client";

import { useState } from "react";
import { chime, PENTATONIC } from "@/lib/chime";
import { ResultActions } from "./ResultActions";

const COLORS = ["#f3d9a4", "#cfe0c8", "#d9d1ee", "#cddcea", "#f1cfc4"];

type Note = { id: number; text: string; color: string; x: number; y: number; r: number };

// Банка хорошего: каждая добрая мелочь становится светящейся запиской в банке.
export function GratitudeJar() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [falling, setFalling] = useState<Note | null>(null);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || falling) return;
    const i = notes.length;
    const note: Note = {
      id: Date.now(),
      text: t,
      color: COLORS[i % COLORS.length],
      x: 22 + ((i * 37) % 56),
      y: 82 - Math.floor(i / 4) * 11 - (i % 2) * 3,
      r: ((i * 53) % 50) - 25,
    };
    setText("");
    setFalling(note);
    setTimeout(() => {
      chime(PENTATONIC[i % PENTATONIC.length] + 12, 0.05);
      setNotes((n) => [...n, note]);
      setFalling(null);
    }, 900);
  };

  const list = notes.map((n, i) => `${i + 1}. ${n.text}`).join("\n");

  return (
    <div className="grid gap-8 sm:grid-cols-[1fr_1.1fr] sm:items-center">
      <div className="relative mx-auto h-[340px] w-[240px]">
        <svg viewBox="0 0 240 340" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <radialGradient id="jar-glow" cx="50%" cy="70%" r="60%">
              <stop offset="0%" stopColor="#fff6d8" stopOpacity={Math.min(0.9, notes.length * 0.12)} />
              <stop offset="100%" stopColor="#fff6d8" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect x="70" y="18" width="100" height="26" rx="8" fill="#e6dccd" />
          <path d="M78 44 h84 v14 c34 14 50 40 50 80 v150 c0 22 -16 36 -38 36 h-108 c-22 0 -38 -14 -38 -36 v-150 c0 -40 16 -66 50 -80 z" fill="url(#jar-glow)" stroke="#d8cfc0" strokeWidth="3" />
          <path d="M48 140 c0 -20 6 -34 18 -44" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.7" fill="none" />
        </svg>
        <div className="absolute inset-x-[30px] bottom-[18px] top-[70px] overflow-hidden rounded-b-[34px]">
          {notes.map((n) => (
            <span
              key={n.id}
              className="absolute h-7 w-10 rounded-md shadow-soft"
              style={{ left: `${n.x}%`, top: `${n.y}%`, background: n.color, transform: `translate(-50%,-50%) rotate(${n.r}deg)`, boxShadow: `0 0 14px ${n.color}` }}
              title={n.text}
            />
          ))}
        </div>
        {falling && (
          <span
            className="absolute left-1/2 top-0 h-7 w-10 rounded-md"
            style={{
              background: falling.color,
              boxShadow: `0 0 18px ${falling.color}`,
              animation: "jar-drop 0.9s cubic-bezier(0.5,0,0.7,1) forwards",
              ["--to-x" as string]: `${(falling.x - 50) * 1.8}px`,
              ["--to-y" as string]: `${70 + (falling.y / 100) * 250}px`,
              ["--rot" as string]: `${falling.r}deg`,
            }}
            aria-hidden
          />
        )}
        <p className="absolute inset-x-0 -bottom-8 text-center text-sm text-ink-faint">
          {notes.length ? `В банке: ${notes.length}` : "Банка пока пуста"}
        </p>
      </div>

      <div>
        <form onSubmit={add} className="flex gap-2">
          <label className="sr-only" htmlFor="jar-input">Что хорошего было</label>
          <input
            id="jar-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={140}
            placeholder="Что хорошего было сегодня?"
            className="h-12 min-w-0 flex-1 rounded-full border border-line bg-paper px-5 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-sky focus:ring-4 focus:ring-mist"
          />
          <button disabled={!text.trim() || !!falling} className="h-12 shrink-0 rounded-full bg-ink px-5 text-[15px] text-paper shadow-soft transition hover:bg-ink/90 disabled:opacity-40">
            В банку
          </button>
        </form>
        <p className="mt-3 px-2 text-sm text-ink-faint">Подойдёт любая мелочь: вкусный чай, чья-то улыбка, минута тишины.</p>
        {notes.length > 0 && (
          <ul className="mt-5 space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="flex animate-rise items-start gap-3 text-[15px] text-ink">
                <span className="mt-1.5 h-3 w-3 shrink-0 rounded-sm" style={{ background: n.color }} />
                {n.text}
              </li>
            ))}
          </ul>
        )}
        {notes.length >= 3 && (
          <div className="mt-6 animate-rise">
            <ResultActions
              kind="gratitude"
              journal={`Банка хорошего:\n${list}`}
              prompt={`Я собрал(а) банку хорошего:\n${list}\nПомоги мне заметить, что это говорит обо мне и что меня поддерживает.`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
