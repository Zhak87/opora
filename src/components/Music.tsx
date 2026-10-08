"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { AmbientEngine } from "@/lib/ambient";

const KEY = "opora-music";
const MusicContext = createContext<{ playing: boolean; toggle: () => void }>({ playing: false, toggle: () => {} });

// Музыка живёт на уровне всего приложения, поэтому не прерывается при переходах между экранами.
export function MusicProvider({ children }: { children: React.ReactNode }) {
  const engine = useRef<AmbientEngine | null>(null);
  const [playing, setPlaying] = useState(false);

  const start = useCallback(async () => {
    if (!engine.current) {
      const { AmbientEngine } = await import("@/lib/ambient");
      engine.current = new AmbientEngine();
    }
    await engine.current.start();
    setPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    if (engine.current?.running) {
      engine.current.stop();
      setPlaying(false);
      try { localStorage.setItem(KEY, "off"); } catch {}
    } else {
      start();
      try { localStorage.setItem(KEY, "on"); } catch {}
    }
  }, [start]);

  // Если человек оставил музыку включённой, она продолжится после первого касания страницы
  // (браузеры не разрешают звук без действия пользователя).
  useEffect(() => {
    let wanted = false;
    try { wanted = localStorage.getItem(KEY) === "on"; } catch {}
    if (!wanted) return;
    const resume = () => {
      if (!engine.current?.running) start();
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, [start]);

  useEffect(() => () => engine.current?.stop(), []);

  return <MusicContext.Provider value={{ playing, toggle }}>{children}</MusicContext.Provider>;
}

export function MusicToggle({ className = "", withLabel = false }: { className?: string; withLabel?: boolean }) {
  const { playing, toggle } = useContext(MusicContext);
  const label = playing ? "Выключить музыку" : "Включить спокойную музыку";
  return (
    <button
      type="button"
      onClick={toggle}
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
      {withLabel && <span className="text-sm">{playing ? "Музыка играет" : "Включить музыку"}</span>}
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
