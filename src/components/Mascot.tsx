"use client";

import { useEffect, useRef, useState } from "react";
import { Orb, type Emotion } from "./Orb";
import { useLocale } from "@/i18n/client";
import { mascotMessages } from "@/i18n/mascot";

const REACTIONS: Emotion[] = ["wink", "joy", "wow"];

// Маскот на главной: капля, с которой можно поздороваться. По нажатию она отвечает
// выражением и короткой фразой, а поздно ночью дремлет.
export function Mascot({ mood = 3 }: { mood?: number }) {
  const m = mascotMessages[useLocale()];
  const [emotion, setEmotion] = useState<Emotion>("calm");
  const [say, setSay] = useState<string | null>(null);
  const taps = useRef(0);
  const timer = useRef<number | null>(null);
  const night = useRef(false);

  useEffect(() => {
    const h = new Date().getHours();
    night.current = h >= 23 || h < 6;
    if (night.current) setEmotion("sleep");
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const tap = () => {
    const n = taps.current++;
    // Первый раз представляется, дальше говорит что-нибудь тёплое; ночью сначала просыпается.
    const asleep = night.current && n === 0;
    setEmotion(asleep ? "wow" : REACTIONS[n % REACTIONS.length]);
    setSay(asleep ? m.night : n === 0 ? m.hello : m.phrases[(n - 1) % m.phrases.length]);
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setEmotion(night.current ? "sleep" : "calm");
      setSay(null);
    }, 2800);
  };

  return (
    <div className="relative flex flex-col items-center">
      <button type="button" onClick={tap} aria-label={m.tap} className="rounded-full outline-none transition-transform duration-300 active:scale-90 focus-visible:ring-4 focus-visible:ring-lilac-soft">
        <Orb size={86} face mood={mood} emotion={emotion} className="sm:hidden" />
        <Orb size={156} face mood={mood} emotion={emotion} className="hidden sm:block" />
      </button>
      <p aria-live="polite" className="pointer-events-none absolute bottom-full right-0 z-10 w-max max-w-[min(13rem,calc(100vw-5rem))] text-center sm:right-1/2 sm:translate-x-1/2">
        {say && (
          <span key={say} className="block animate-rise rounded-[18px] rounded-bl-[6px] bg-ink px-4 py-2 text-sm text-paper shadow-lift">{say}</span>
        )}
      </p>
    </div>
  );
}
