"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MicRecorder } from "@/lib/recorder";
import { speech } from "@/lib/speech";
import { getVoice, type VoiceSettings } from "@/lib/voices";
import { useSpeech } from "./SpeakButton";

type Phase = "starting" | "listening" | "thinking" | "speaking" | "paused" | "error";

const LABEL: Record<Phase, string> = {
  starting: "Включаю микрофон…",
  listening: "Слушаю вас…",
  thinking: "Думаю…",
  speaking: "Говорю",
  paused: "Нажмите на шарик, когда захотите сказать",
  error: "",
};

// Цвета шарика для каждого состояния.
const PALETTE: Record<Phase, [string, string, string]> = {
  starting: ["#cfdcea", "#ddd5ef", "#d4e6d0"],
  listening: ["#8fb3d9", "#b9aee6", "#a9d6c4"],
  thinking: ["#b9aee6", "#9d8fd6", "#e3cdf0"],
  speaking: ["#a9d19a", "#f0c896", "#c3b5ea"],
  paused: ["#ddd6ca", "#e2dcea", "#d6e3d2"],
  error: ["#ecc7ba", "#e2dcea", "#ddd6ca"],
};

export function VoiceMode({
  voice,
  ask,
  onClose,
}: {
  voice: VoiceSettings;
  ask: (text: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("starting");
  const [heard, setHeard] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const rec = useRef<MicRecorder | null>(null);
  const level = useRef(0);
  const phaseRef = useRef<Phase>("starting");
  const alive = useRef(true);
  const finishing = useRef(false);
  const s = useSpeech();

  const orb = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const finishRef = useRef<() => void>(() => {});
  const listen = useCallback(async () => {
    if (!alive.current) return;
    speech.stop();
    finishing.current = false;
    // Только один микрофон за раз: старую запись выключаем.
    rec.current?.cancel();
    go("starting");
    const r = new MicRecorder();
    rec.current = r;
    try {
      await r.start({
        onLevel: (l) => rec.current === r && (level.current = l),
        onSilence: () => rec.current === r && finishRef.current(),
      });
      if (rec.current !== r) return r.cancel();
      if (!alive.current) return r.cancel();
      go("listening");
    } catch {
      setError("Нет доступа к микрофону. Разрешите его в настройках браузера и попробуйте снова.");
      go("error");
    }
  }, []);

  // Человек замолчал (или нажал на шарик): распознаём речь, ждём ответ и озвучиваем его.
  const finish = useCallback(async () => {
    if (finishing.current || phaseRef.current !== "listening") return;
    finishing.current = true;
    const wav = rec.current?.stop() ?? null;
    rec.current = null;
    level.current = 0;
    if (!wav) {
      go("paused");
      return;
    }
    go("thinking");
    setAnswer("");
    let text = "";
    try {
      const res = await fetch("/api/transcribe", { method: "POST", headers: { "Content-Type": "audio/wav" }, body: wav });
      text = res.ok ? ((await res.json()).text as string) ?? "" : "";
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      if (!alive.current) return;
      setHeard("");
      setAnswer("Не получилось расслышать. Попробуйте сказать ещё раз.");
      return listen();
    }
    if (!alive.current) return;
    if (!text.trim()) {
      setHeard("");
      setAnswer("Я не расслышал. Скажите, пожалуйста, ещё раз.");
      return listen();
    }
    setHeard(text);
    const reply = await ask(text);
    if (!alive.current) return;
    if (!reply) {
      setAnswer("Связь ненадолго прервалась. Попробуйте ещё раз.");
      return listen();
    }
    setAnswer(reply);
    go("speaking");
    speech.speak(`voice-${Date.now()}`, reply, voice);
  }, [ask, listen, voice]);

  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  // Когда голос договорил — снова слушаем.
  const wasSpeaking = useRef(false);
  useEffect(() => {
    if (phase !== "speaking") return;
    if (s.status !== "idle") wasSpeaking.current = true;
    else if (wasSpeaking.current) {
      wasSpeaking.current = false;
      listen();
    }
  }, [s.status, phase, listen]);

  useEffect(() => {
    alive.current = true;
    listen();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      alive.current = false;
      rec.current?.cancel();
      speech.stop();
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [listen, onClose]);

  // Живое движение шарика: громкость голоса, «дыхание» и волны речи.
  useEffect(() => {
    let raf = 0;
    let smooth = 0;
    const tick = (t: number) => {
      const p = phaseRef.current;
      let target = 0;
      if (p === "listening") target = level.current;
      else if (p === "speaking") target = 0.35 + 0.25 * Math.sin(t / 140) * Math.sin(t / 370) + 0.15 * Math.sin(t / 90);
      else if (p === "thinking") target = 0.12 + 0.08 * Math.sin(t / 300);
      else target = 0.05 + 0.04 * Math.sin(t / 900);
      smooth += (target - smooth) * (target > smooth ? 0.35 : 0.08);
      const k = Math.max(0, smooth);
      if (orb.current) orb.current.style.transform = `scale(${1 + k * 0.18})`;
      if (glow.current) {
        glow.current.style.transform = `scale(${1.05 + k * 0.5})`;
        glow.current.style.opacity = String(0.45 + k * 0.5);
      }
      if (ring.current) ring.current.style.transform = `scale(${1 + k * 0.32})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const tapOrb = () => {
    if (phase === "listening") finish();
    else if (phase === "speaking") {
      wasSpeaking.current = false;
      listen();
    } else if (phase === "paused" || phase === "error") {
      setError("");
      listen();
    }
  };

  const [c1, c2, c3] = PALETTE[phase];
  const v = getVoice(voice.voice);

  return (
    <div className="fixed inset-0 z-50 flex animate-fade flex-col bg-gradient-to-b from-milk via-[#f4f1f8] to-milk pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]" role="dialog" aria-label="Голосовой разговор">
      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-sm text-ink-soft">
          Голосовой разговор · <span className="text-ink-faint">{v.name}</span>
        </p>
        <button onClick={onClose} aria-label="Закончить голосовой разговор" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-sand hover:text-ink">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <button
          onClick={tapOrb}
          aria-label={phase === "listening" ? "Я договорил(а)" : phase === "speaking" ? "Перебить и сказать" : "Начать говорить"}
          className="relative flex h-[260px] w-[260px] items-center justify-center outline-none sm:h-[320px] sm:w-[320px]"
        >
          <div
            ref={glow}
            className="absolute inset-6 rounded-full blur-3xl transition-[background] duration-1000"
            style={{ background: `radial-gradient(circle, ${c1}, ${c2} 55%, transparent 75%)` }}
            aria-hidden
          />
          <div ref={ring} className="absolute inset-[34px] rounded-full border border-white/70" style={{ boxShadow: `0 0 40px ${c2}` }} aria-hidden />
          <div ref={orb} className="relative h-[190px] w-[190px] sm:h-[230px] sm:w-[230px]" aria-hidden>
            <div className="absolute inset-0 overflow-hidden rounded-full shadow-[0_30px_60px_-25px_rgb(95_125_152/0.5)]">
              <div
                className="absolute -inset-1/4 transition-[background] duration-1000"
                style={{
                  background: `conic-gradient(from 0deg, ${c1}, ${c2}, ${c3}, ${c1})`,
                  animation: `orb-spin ${phase === "thinking" ? 3 : 14}s linear infinite`,
                }}
              />
              <div className="absolute -inset-1/4 opacity-80 mix-blend-soft-light" style={{ background: `radial-gradient(circle at 70% 70%, ${c3}, transparent 55%)`, animation: "orb-spin 9s linear infinite reverse" }} />
              <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 34% 28%, rgba(255,253,249,0.95), rgba(255,253,249,0.25) 32%, transparent 60%)" }} />
              <div className="absolute inset-0 rounded-full" style={{ boxShadow: "inset -14px -22px 50px rgb(127 113 168 / 0.22), inset 10px 14px 30px rgb(255 255 255 / 0.5)" }} />
            </div>
          </div>
        </button>

        <p key={phase} className="mt-10 animate-fade text-center font-serif text-[22px] text-ink">
          {phase === "error" ? "Микрофон недоступен" : LABEL[phase]}
          
        </p>
        <div className="mt-4 min-h-[96px] max-w-md text-center">
          {error ? (
            <p className="text-[15px] leading-relaxed text-[#94594a]">{error}</p>
          ) : (
            <>
              {heard && <p className="animate-fade text-[14px] leading-relaxed text-ink-faint">«{heard}»</p>}
              {answer && (
                <p className="mt-3 line-clamp-4 animate-fade text-[15.5px] leading-relaxed text-ink-soft">{answer}</p>
              )}
              {!heard && !answer && phase === "listening" && (
                <p className="text-[14.5px] text-ink-faint">Говорите спокойно. Когда замолчите, я отвечу. Нажмите на шарик, чтобы ответить сразу.</p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 px-6 pb-8 pt-2">
        <button
          onClick={() => {
            if (phase === "listening" || phase === "starting") {
              rec.current?.cancel();
              rec.current = null;
              go("paused");
            } else {
              speech.stop();
              setError("");
              listen();
            }
          }}
          aria-label={phase === "listening" ? "Выключить микрофон" : "Включить микрофон"}
          className={`flex h-14 w-14 items-center justify-center rounded-full shadow-soft transition ${
            phase === "listening" ? "bg-paper text-ink" : "bg-ink text-paper"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0014 0M12 18v3" />
            {phase !== "listening" && phase !== "starting" && <path d="M4 4l16 16" />}
          </svg>
        </button>
        <button onClick={onClose} className="h-14 rounded-full bg-paper px-7 text-[15px] text-ink shadow-soft transition hover:shadow-lift">
          Закончить
        </button>
      </div>
      <p className="pb-4 text-center text-[11px] text-ink-faint">Всё сказанное сохраняется в этом разговоре текстом.</p>
    </div>
  );
}
