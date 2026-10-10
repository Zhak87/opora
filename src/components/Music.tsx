"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { AmbientEngine } from "@/lib/ambient";
import { speech } from "@/lib/speech";
import { useMsg } from "@/i18n/client";
import { common } from "@/i18n/common";
import { voiceMessages } from "@/i18n/voice";

const KEY = "opora-music";
const MusicContext = createContext<{ playing: boolean; toggle: () => void; duck: (on: boolean) => void }>({
  playing: false,
  toggle: () => {},
  duck: () => {},
});

// Музыка живёт на уровне всего приложения, поэтому не прерывается при переходах между экранами.
export function MusicProvider({ children }: { children: React.ReactNode }) {
  const engine = useRef<AmbientEngine | null>(null);
  const [playing, setPlaying] = useState(false);

  const loading = useRef<Promise<AmbientEngine> | null>(null);

  const start = useCallback(async () => {
    loading.current ??= import("@/lib/ambient").then(({ AmbientEngine }) => {
      const e = new AmbientEngine();
      e.onstate = setPlaying;
      engine.current = e;
      return e;
    });
    const e = await loading.current;
    await e.start();
    setPlaying(e.audible);
  }, []);

  const toggle = useCallback(() => {
    if (engine.current?.running && engine.current.audible) {
      engine.current.stop();
      try { localStorage.setItem(KEY, "off"); } catch {}
    } else {
      if (engine.current?.running) engine.current.resume();
      else start();
      try { localStorage.setItem(KEY, "on"); } catch {}
    }
  }, [start]);

  // Музыка включена по умолчанию. Браузеры не дают звуку играть без действия человека,
  // поэтому она начинается сразу, если это разрешено, или с первого касания страницы.
  useEffect(() => {
    let off = false;
    try { off = localStorage.getItem(KEY) === "off"; } catch {}
    if (off) return;
    start();
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    const cleanup = () => events.forEach((e) => window.removeEventListener(e, unlock, true));
    function unlock(e: Event) {
      cleanup();
      // Нажатие на саму кнопку музыки обработает toggle.
      if ((e.target as Element | null)?.closest?.("[data-music-toggle]")) return;
      if (engine.current?.running) engine.current.resume();
      else start();
    }
    events.forEach((e) => window.addEventListener(e, unlock, true));
    return cleanup;
  }, [start]);

  // Если браузер не дал включить звук сам, один раз за визит показываем спокойный экран входа:
  // нажатие на него и есть то действие, после которого браузер разрешает музыку.
  const [gate, setGate] = useState(false);
  useEffect(() => {
    let off = false;
    let seen = false;
    try {
      off = localStorage.getItem(KEY) === "off";
      seen = sessionStorage.getItem(KEY + "-gate") === "1";
    } catch {}
    if (off || seen) return;
    const t = setTimeout(() => {
      if (!engine.current?.audible) setGate(true);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const enter = () => {
    if (engine.current?.running) engine.current.resume();
    else start();
    try { sessionStorage.setItem(KEY + "-gate", "1"); } catch {}
    setGate(false);
  };

  useEffect(() => () => engine.current?.stop(), []);

  const duck = useCallback((on: boolean) => engine.current?.duck(on), []);
  useEffect(() => {
    speech.setDuck(duck);
    return () => speech.setDuck(null);
  }, [duck]);

  return (
    <MusicContext.Provider value={{ playing, toggle, duck }}>
      {children}
      {gate && <Gate onEnter={enter} />}
    </MusicContext.Provider>
  );
}

export function MusicToggle({ className = "", withLabel = false }: { className?: string; withLabel?: boolean }) {
  const { playing, toggle } = useContext(MusicContext);
  const m = useMsg(voiceMessages).music;
  const label = playing ? m.turnOff : m.turnOn;
  return (
    <button
      type="button"
      onClick={toggle}
      data-music-toggle
      aria-pressed={playing}
      aria-label={label}
      title={label}
      className={`flex items-center gap-3 rounded-full transition-all duration-300 ${
        playing ? "text-lilac-deep" : "text-ink-soft hover:text-ink"
      } ${className}`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${playing ? "bg-lilac-soft" : "bg-paper/80 shadow-soft"}`}>
        <Waves playing={playing} />
      </span>
      {withLabel && <span className="text-sm">{playing ? m.playing : m.enable}</span>}
    </button>
  );
}

function Waves({ playing }: { playing: boolean }) {
  if (!playing) {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 17.5V6l10-2v11.5" />
        <circle cx="6.5" cy="17.5" r="2.5" />
        <circle cx="16.5" cy="15.5" r="2.5" />
      </svg>
    );
  }
  return (
    <span className="origin-bottom-bars flex h-4 items-end gap-[3px]" aria-hidden>
      {[0.55, 1, 0.75, 0.4].map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-current"
          style={{
            height: playing ? `${h * 100}%` : "3px",
            transition: "height 0.6s ease",
            animation: playing ? `music-bar 1.8s ease-in-out ${i * 0.25}s infinite alternate` : "none",
          }}
        />
      ))}
    </span>
  );
}

function Gate({ onEnter }: { onEnter: () => void }) {
  const m = useMsg(voiceMessages).music;
  const brand = useMsg(common).brand;
  return (
    <div
      role="dialog"
      aria-label={m.enter}
      onClick={onEnter}
      className="ambient fixed inset-0 z-[60] flex animate-fade cursor-pointer flex-col items-center justify-center px-6 text-center"
    >
      <div className="relative h-40 w-40" aria-hidden>
        <div className="absolute inset-0 animate-breathe rounded-full opacity-70 blur-2xl" style={{ background: "radial-gradient(circle at 40% 40%, #ebe6f4, #c9d8e6 50%, #d6e5cf 80%)" }} />
        <div
          className="absolute inset-[14%] animate-breathe rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 30%, #fffdf9 0%, #e7e1f2 35%, #bccfe0 70%, #b4cbaa 100%)",
            boxShadow: "0 20px 50px -20px rgb(95 125 152 / 0.45)",
          }}
        />
      </div>
      <p className="mt-10 font-serif text-[30px] text-ink">{brand}</p>
      <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-ink-soft">{m.intro}</p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEnter();
        }}
        className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-ink px-8 text-[15px] font-medium text-paper shadow-soft transition hover:bg-ink/90"
      >
        {m.enterButton}
      </button>
      <p className="mt-5 text-xs text-ink-faint">{m.note}</p>
    </div>
  );
}

export const useMusic = () => useContext(MusicContext);
