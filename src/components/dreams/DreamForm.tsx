"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMsg } from "@/i18n/client";
import { dreamMessages } from "@/i18n/dreams";
import { CrisisHelp } from "@/components/course/CrisisHelp";
import { MicRecorder } from "@/lib/recorder";
import { DREAMERS, DREAM_EMOTIONS, DREAM_TEXT_MAX, DREAM_TYPES, isDreamer, type DreamEmotion, type DreamType, type Dreamer } from "@/lib/dreams";
import { buildStoryboard, saveDream } from "@/lib/dream-actions";
import type { Dream } from "@/lib/dream-data";
import { DreamerFigure } from "./DreamerFigure";
import { DreamBanner } from "./DreamJournal";
import styles from "./DreamJournal.module.css";

const DRAFT_KEY = "opora-dream-draft";
const DREAMER_KEY = "opora-dreamer";

const chipOn = `${styles.chip} ${styles.chipOn}`;
const label = "mb-2.5 block text-sm font-semibold text-ink";

// Запись сна: быстрый текст или голос, а потом необязательные детали по подсказкам.
export function DreamForm({ dream, today }: { dream?: Dream; today: string }) {
  const m = useMsg(dreamMessages);
  const f = m.form;
  const router = useRouter();
  const [text, setText] = useState(dream?.text ?? "");
  const [type, setType] = useState<DreamType>(dream?.type ?? "usual");
  const [emotions, setEmotions] = useState<Partial<Record<DreamEmotion, number>>>(
    Object.fromEntries((dream?.emotions ?? []).map((e) => [e.emotion, e.intensity])),
  );
  const [after, setAfter] = useState<DreamEmotion[]>(dream?.emotionsAfter ?? []);
  const [vividness, setVividness] = useState<number | null>(dream?.vividness ?? null);
  const [day, setDay] = useState(dream?.dayContext ?? "");
  const [date, setDate] = useState(dream?.date ?? today);
  const [dreamer, setDreamer] = useState<Dreamer>(dream?.dreamer ?? "mint");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [crisis, setCrisis] = useState(false);
  const [mic, setMic] = useState<"idle" | "on" | "wait">("idle");
  const [level, setLevel] = useState(0);
  const recorder = useRef<MicRecorder | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  // Черновик утренней записи не теряется, если закрыть страницу.
  useEffect(() => {
    if (dream) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setText(saved);
      const who = localStorage.getItem(DREAMER_KEY);
      if (isDreamer(who)) setDreamer(who);
    } catch {}
  }, [dream]);
  useEffect(() => {
    if (dream) return;
    try {
      if (text.trim()) localStorage.setItem(DRAFT_KEY, text);
      else localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }, [text, dream]);
  useEffect(() => () => recorder.current?.cancel(), []);

  const addHint = (start: string) => {
    setText((t) => `${t.trimEnd()}${t.trim() ? "\n\n" : ""}${start} `.slice(0, DREAM_TEXT_MAX));
    requestAnimationFrame(() => {
      const el = area.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const stopMic = async () => {
    const blob = recorder.current?.stop() ?? null;
    recorder.current = null;
    setLevel(0);
    if (!blob) return setMic("idle");
    setMic("wait");
    try {
      const res = await fetch("/api/transcribe", { method: "POST", headers: { "Content-Type": "audio/wav" }, body: blob });
      const json = (await res.json()) as { text?: string };
      if (!res.ok) throw new Error();
      if (json.text) setText((t) => `${t.trimEnd()}${t.trim() ? " " : ""}${json.text}`.slice(0, DREAM_TEXT_MAX));
    } catch {
      setError(f.micFailed);
    }
    setMic("idle");
  };
  const startMic = async () => {
    setError("");
    try {
      const rec = new MicRecorder();
      recorder.current = rec;
      await rec.start({ onLevel: setLevel, onSilence: () => void stopMic() });
      setMic("on");
    } catch {
      recorder.current = null;
      setError(f.micFailed);
    }
  };

  const toggleEmotion = (e: DreamEmotion) =>
    setEmotions((cur) => {
      const next = { ...cur };
      if (next[e]) delete next[e];
      else next[e] = 3;
      return next;
    });

  const submit = async () => {
    if (text.trim().length < 12) return setError(f.tooShort);
    setBusy(true);
    setError("");
    const saved = await saveDream({
      id: dream?.id,
      text,
      date,
      type,
      emotions: Object.entries(emotions).map(([emotion, intensity]) => ({ emotion, intensity: intensity ?? 3 })),
      emotionsAfter: after,
      vividness,
      dayContext: day,
      dreamer,
    });
    if ("error" in saved) {
      setBusy(false);
      return setError(f.failed);
    }
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.setItem(DREAMER_KEY, dreamer);
    } catch {}
    // Сценарий собираем заново, только если его ещё нет или изменился сам текст сна.
    const rebuild = !dream || dream.panels.length === 0 || dream.text.trim() !== text.trim() || dream.type !== type;
    if (rebuild) {
      const board = await buildStoryboard(saved.id);
      if ("crisis" in board) {
        setBusy(false);
        return setCrisis(true);
      }
      if ("error" in board) {
        // Сон уже сохранён: открываем его, а сценарий можно собрать ещё раз оттуда.
        router.push(`/dreams/${saved.id}?failed=1`);
        return;
      }
    }
    router.push(`/dreams/${saved.id}`);
    router.refresh();
  };

  if (crisis) return <CrisisHelp lead={f.crisisLead} />;

  return (
    <div className="space-y-4">
      <DreamBanner title={dream ? f.editHeading : f.heading} />
      <div className={styles.surface}>
        <textarea
          ref={area}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={DREAM_TEXT_MAX}
          rows={7}
          aria-label={f.heading}
          placeholder={f.placeholder}
          className={`${styles.field} min-h-36 resize-y`}
        />
        <button
          type="button"
          onClick={mic === "on" ? () => void stopMic() : mic === "idle" ? () => void startMic() : undefined}
          disabled={mic === "wait" || busy}
          aria-label={mic === "on" ? f.stop : f.speak}
          title={mic === "on" ? f.stop : f.speak}
          className={`mt-3 flex h-11 items-center gap-2 rounded-full px-4 text-[13.5px] font-medium transition ${
            mic === "on" ? "bg-[#F4B9A0] text-[#2B2838]" : "bg-[#f4eff8] text-[#483967] hover:bg-[#e9e0f2]"
          }`}
          style={mic === "on" ? { boxShadow: `0 0 0 ${4 + level * 14}px rgb(244 185 160 / 0.25)` } : undefined}
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
          </svg>
          {mic === "on" ? f.listening : mic === "wait" ? f.transcribing : f.speak}
        </button>
        {!dream && <p className="mt-2 text-xs text-ink-soft">{f.draftSaved}</p>}

        <p className={`${label} mt-6`}>{f.hintsTitle}</p>
        <div className="flex flex-wrap gap-2">
          {f.hints.map(([title, start]) => (
            <button key={title} type="button" onClick={() => addHint(start)} className={styles.chip}>
              {title}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.surface}>
        <p className={label}>{f.emotions}</p>
        <div className="flex flex-wrap gap-2">
          {DREAM_EMOTIONS.map((e) => (
            <button key={e} type="button" aria-pressed={Boolean(emotions[e])} onClick={() => toggleEmotion(e)} className={emotions[e] ? chipOn : styles.chip}>
              {m.emotions[e]}
            </button>
          ))}
        </div>
        {Object.keys(emotions).length > 0 && (
          <ul className="mt-4 space-y-2.5">
            {(Object.keys(emotions) as DreamEmotion[]).map((e) => (
              <li key={e} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
                <span className="min-w-24">{m.emotions[e]}</span>
                <span className="flex gap-1.5" role="group" aria-label={f.intensity}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={`${f.intensity}: ${n}`}
                      aria-pressed={emotions[e] === n}
                      onClick={() => setEmotions((cur) => ({ ...cur, [e]: n }))}
                      className={`size-9 rounded-lg border text-[12px] transition ${
                        (emotions[e] ?? 0) >= n ? "border-[#b7a4cf] bg-[#eee5f6] text-[#493266]" : "border-[#ded5e7] text-ink-soft hover:bg-[#f4eff8]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className={`${label} mt-7`}>{f.type}</p>
        <div className="flex flex-wrap gap-2">
          {DREAM_TYPES.map((t) => (
            <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className={type === t ? chipOn : styles.chip}>
              {m.types[t]}
            </button>
          ))}
        </div>

        <p className={`${label} mt-7`}>{f.dreamer}</p>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(DREAMERS) as Dreamer[]).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={dreamer === d}
              aria-label={f.dreamers[d]}
              title={f.dreamers[d]}
              onClick={() => setDreamer(d)}
              className={`rounded-full p-1 transition ${dreamer === d ? "bg-[#705a95]" : "bg-[#f1ebf6] hover:bg-[#e2d6ed]"}`}
            >
              <DreamerFigure dreamer={d} />
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-soft">{f.dreamerHint}</p>
      </div>

      <details className={styles.surface} open={Boolean(dream)}>
        <summary className="w-fit cursor-pointer text-sm font-semibold text-ink">{f.more}</summary>
        <label className="mt-7 block">
          <span className={label}>{f.day} <span className="font-normal text-ink-soft">· {f.optional}</span></span>
          <input value={day} onChange={(e) => setDay(e.target.value)} maxLength={600} placeholder={f.dayPlaceholder} className={styles.field} />
        </label>

        <p className={`${label} mt-7`}>
          {f.after} <span className="font-normal text-ink-soft">· {f.optional}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {DREAM_EMOTIONS.map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={after.includes(e)}
              onClick={() => setAfter((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]))}
              className={after.includes(e) ? chipOn : styles.chip}
            >
              {m.emotions[e]}
            </button>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-end gap-x-10 gap-y-6">
          <div>
            <p className={label}>{f.vividness}</p>
            <span className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${f.vividness}: ${n}`}
                  aria-pressed={vividness === n}
                  onClick={() => setVividness(vividness === n ? null : n)}
                  className={`h-9 w-9 rounded-full border text-[13px] transition ${
                    (vividness ?? 0) >= n ? "border-[#b7a4cf] bg-[#eee5f6] text-[#493266]" : "border-[#ded5e7] text-ink-soft hover:bg-[#f4eff8]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </span>
          </div>
          <label>
            <span className={label}>{f.date}</span>
            <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={`${styles.field} max-w-full`} />
          </label>
        </div>
      </details>

      <div className={styles.surface}>
        {error && <p role="alert" className="mb-4 rounded-xl bg-[#ffeeec] px-4 py-3 text-sm text-[#a03630]">{error}</p>}

        <div className="flex flex-col items-start gap-3">
          <button type="button" onClick={() => void submit()} disabled={busy || mic !== "idle"} className={styles.button}>
            {busy ? f.working : dream && dream.panels.length > 0 ? f.save : f.submit}
          </button>
          <p className="max-w-md text-xs leading-relaxed text-ink-soft">{f.aiNote}</p>
        </div>
      </div>
    </div>
  );
}
