"use client";

import { useSyncExternalStore } from "react";
import { speech, type SpeechState } from "@/lib/speech";
import type { VoiceSettings } from "@/lib/voices";

const IDLE: SpeechState = { id: null, status: "idle", fallback: false };

export function useSpeech() {
  return useSyncExternalStore(speech.subscribe, speech.get, () => IDLE);
}

export function SpeakButton({ id, text, voice, label = "Прослушать", className = "" }: { id: string; text: string; voice: VoiceSettings; label?: string; className?: string }) {
  const s = useSpeech();
  const mine = s.id === id;
  const active = mine && s.status !== "idle";

  return (
    <button
      type="button"
      onClick={() => (active ? speech.stop() : speech.speak(id, text, voice))}
      aria-label={active ? "Остановить озвучку" : label}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] transition ${
        active ? "bg-lilac-soft text-ink" : "text-ink-faint hover:bg-sand/60 hover:text-ink"
      } ${className}`}
    >
      {mine && s.status === "loading" ? (
        <span className="relative flex h-4 w-4 items-center justify-center" aria-hidden>
          <span className="absolute h-4 w-4 animate-ping rounded-full bg-lilac/60" />
          <span className="h-2 w-2 rounded-full bg-lilac-deep" />
        </span>
      ) : mine && s.status === "playing" ? (
        <span className="origin-bottom-bars flex h-4 items-end gap-[2px]" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="w-[3px] rounded-full bg-lilac-deep" style={{ height: "100%", animation: `music-bar 1s ${i * 0.15}s ease-in-out infinite alternate` }} />
          ))}
        </span>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 10v4h3.5L12 18V6L7.5 10z" />
          <path d="M15.5 9.5a3.5 3.5 0 010 5M18 7a7 7 0 010 10" />
        </svg>
      )}
      <span>{active ? (s.status === "loading" ? "Готовлю голос…" : "Остановить") : label}</span>
      {mine && s.fallback && <span className="text-[11px] text-ink-faint">· голос браузера</span>}
    </button>
  );
}
