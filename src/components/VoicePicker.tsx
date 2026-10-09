"use client";

import { useState, useTransition } from "react";
import { saveVoice } from "@/lib/actions";
import { speech } from "@/lib/speech";
import { SPEEDS, TONES, VOICES, type Speed, type Tone, type VoiceSettings } from "@/lib/voices";
import { SpeakButton, useSpeech } from "./SpeakButton";

const SAMPLE = "Здравствуйте. Я рядом и никуда не тороплюсь. Давайте немного выдохнем, а потом вы расскажете, что у вас на душе.";

function Chips<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`rounded-full px-4 py-2 text-sm transition-all duration-300 ${
            value === v ? "bg-ink text-paper shadow-soft" : "border border-line bg-paper text-ink-soft hover:text-ink"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function VoicePicker({ initial }: { initial: VoiceSettings }) {
  const [v, setV] = useState(initial);
  const [gender, setGender] = useState(VOICES.find((x) => x.id === initial.voice)?.gender ?? "female");
  const [saved, setSaved] = useState(false);
  const [, start] = useTransition();
  const s = useSpeech();

  const update = (patch: Partial<VoiceSettings>, preview = false) => {
    const next = { ...v, ...patch };
    setV(next);
    setSaved(false);
    if (preview) speech.speak(`preview-${next.voice}`, SAMPLE, next);
    else if (s.id?.startsWith("preview-")) speech.stop();
    start(async () => {
      const r = await saveVoice(next);
      if (r && "ok" in r) setSaved(true);
    });
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[15px] font-medium text-ink">Голос собеседника</h2>
        <span className={`text-xs text-sage-deep transition-opacity duration-500 ${saved ? "opacity-100" : "opacity-0"}`}>Сохранено</span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        Любой ответ в разговоре можно прослушать. Выберите голос, который вам приятен: нажмите на него, чтобы услышать.
      </p>

      <div className="mt-5 inline-flex rounded-full bg-sand/70 p-1 text-sm">
        {(
          [
            ["female", "Женский"],
            ["male", "Мужской"],
          ] as const
        ).map(([g, l]) => (
          <button
            key={g}
            type="button"
            onClick={() => setGender(g)}
            aria-pressed={gender === g}
            className={`rounded-full px-5 py-2 transition ${gender === g ? "bg-paper text-ink shadow-soft" : "text-ink-soft"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div key={gender} className="stagger mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {VOICES.filter((x) => x.gender === gender).map((x) => {
          const on = v.voice === x.id;
          const playing = s.id === `preview-${x.id}` && s.status !== "idle";
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => (playing ? speech.stop() : update({ voice: x.id }, true))}
              aria-pressed={on}
              className={`relative rounded-[20px] border p-4 text-left transition-all duration-300 ${
                on ? "border-lilac bg-lilac-soft/70 shadow-soft" : "border-line bg-paper hover:border-sand-deep"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-medium text-ink">{x.name}</span>
                {playing ? (
                  <span className="origin-bottom-bars flex h-3.5 items-end gap-[2px]" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-[3px] rounded-full bg-lilac-deep" style={{ height: "100%", animation: `music-bar 0.9s ${i * 0.15}s ease-in-out infinite alternate` }} />
                    ))}
                  </span>
                ) : (
                  <svg viewBox="0 0 24 24" className={`h-4 w-4 ${on ? "text-lilac-deep" : "text-ink-faint"}`} fill="currentColor" aria-hidden>
                    <path d="M8 5.5v13l10-6.5z" />
                  </svg>
                )}
              </span>
              <span className="mt-1 block text-[12.5px] leading-snug text-ink-soft">{x.hint}</span>
            </button>
          );
        })}
      </div>

      <p className="mb-2 mt-6 text-sm text-ink-soft">Тон</p>
      <Chips<Tone> value={v.tone} options={Object.entries(TONES).map(([k, t]) => [k as Tone, t.label])} onChange={(tone) => update({ tone }, true)} />

      <p className="mb-2 mt-5 text-sm text-ink-soft">Скорость</p>
      <Chips<Speed> value={v.speed} options={Object.entries(SPEEDS).map(([k, t]) => [k as Speed, t.label])} onChange={(speed) => update({ speed }, true)} />

      <label className="mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-[20px] bg-sand/50 px-4 py-3.5">
        <span>
          <span className="block text-[15px] text-ink">Читать ответы вслух сразу</span>
          <span className="block text-xs text-ink-soft">Собеседник будет говорить, как только ответит</span>
        </span>
        <input
          type="checkbox"
          checked={v.auto}
          onChange={(e) => {
            if (e.target.checked) speech.unlock();
            update({ auto: e.target.checked });
          }}
          className="peer sr-only"
        />
        <span className="relative h-7 w-12 shrink-0 rounded-full bg-line transition peer-checked:bg-sage-deep after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-paper after:shadow-soft after:transition-all peer-checked:after:left-6" aria-hidden />
      </label>

      <div className="mt-5">
        <SpeakButton id={`preview-${v.voice}`} text={SAMPLE} voice={v} label="Послушать, как это звучит" className="-ml-3" />
      </div>
    </div>
  );
}
