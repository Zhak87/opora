"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Orb } from "../Orb";
import { StartForm } from "../StartForm";
import { ArrowIcon } from "../icons";
import { buttonStyles, toneBg } from "../ui";
import { sendEvent } from "../Track";
import { CrisisHelp } from "../course/CrisisHelp";
import { addJournalEntry } from "@/lib/actions";
import { savePracticeRun } from "@/lib/practice-actions";
import { looksLikeCrisis } from "@/lib/crisis";
import { chime } from "@/lib/chime";
import { nextGames, type Game } from "@/lib/games";
import { DEFAULT_VOICE, type VoiceSettings } from "@/lib/voices";
import { setPracticeSettings, usePracticeSettings } from "@/lib/practice-settings-client";
import { useLocale } from "@/i18n/client";
import { gamesMessages } from "@/i18n/games";
import { playMessages } from "@/i18n/play";

type Stage = "intro" | "play" | "reflect";

const PracticeContext = createContext<{ finish: () => void; report: (summary: string) => void; voice: VoiceSettings; slug: string }>({
  finish: () => {},
  report: () => {},
  voice: DEFAULT_VOICE,
  slug: "",
});

// Для игр: finish() завершает практику самой игрой (например, когда закончилось голосовое сопровождение),
// report() сообщает итог («что человек выбрал и к чему пришёл»): он сохраняется в память, которую учитывает
// собеседник, и это же момент «дошёл до результата» в аналитике (practice_complete) — одинаково на сайте и в приложении.
export const usePractice = () => useContext(PracticeContext);

const countKey = (slug: string) => `opora-practice-${slug}`;

function readCount(slug: string) {
  try {
    return Number(localStorage.getItem(countKey(slug)) || 0) || 0;
  } catch {
    return 0;
  }
}

// Измерение практики (аудит 19.11.2026), только цифры:
// practice_open — открыл экран; practice_start — нажал «Начать»; practice_restart — начал заново в том же заходе;
// practice_complete — игра дошла до своего результата (первый report за прохождение);
// practice_session_end — закончил свободную сессию; practice_exit — прохождение закрыто (sec активного времени, done 0/1).
function useTelemetry(slug: string, stage: Stage) {
  const active = useRef(0);
  const run = useRef<{ done: boolean; closed: boolean } | null>(null);
  const runs = useRef(0);

  useEffect(() => {
    sendEvent("practice_open", { game: slug });
  }, [slug]);

  // Активное время: только пока идёт игра и вкладка на экране.
  useEffect(() => {
    if (stage !== "play") return;
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") active.current += 1;
    }, 1000);
    return () => window.clearInterval(t);
  }, [stage]);

  const close = useCallback(() => {
    const r = run.current;
    if (!r || r.closed) return;
    r.closed = true;
    sendEvent("practice_exit", { game: slug, sec: Math.min(7200, active.current), done: r.done ? 1 : 0 });
  }, [slug]);

  useEffect(() => {
    window.addEventListener("pagehide", close);
    return () => {
      window.removeEventListener("pagehide", close);
      close();
    };
  }, [close]);

  return useMemo(() => ({
    start() {
      close();
      runs.current += 1;
      active.current = 0;
      run.current = { done: false, closed: false };
      sendEvent("practice_start", { game: slug });
      if (runs.current > 1) sendEvent("practice_restart", { game: slug });
    },
    result() {
      if (!run.current || run.current.done) return;
      run.current.done = true;
      sendEvent("practice_complete", { game: slug });
    },
    sessionEnd() {
      sendEvent("practice_session_end", { game: slug, sec: Math.min(7200, active.current) });
    },
    seconds: () => active.current,
    close,
  }), [slug, close]);
}

// Общая рамка практики после аудита: короткий вход (одна кнопка, инструкция и «как вы» по желанию),
// выход и настройки всегда под рукой, короткий итог без анкеты.
export function PracticeFlow({
  game,
  voice = DEFAULT_VOICE,
  ownFinish = false,
  children,
}: {
  game: Game;
  voice?: VoiceSettings;
  // Игра сама зовёт finish() (общую кнопку «Завершить» не показываем, пока она идёт).
  ownFinish?: boolean;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const m = gamesMessages[locale];
  const p = playMessages[locale].flow;
  const [stage, setStage] = useState<Stage>("intro");
  const [before, setBefore] = useState<number | null>(null);
  const [visits, setVisits] = useState(0);
  const [howOpen, setHowOpen] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const [reached, setReached] = useState(false);
  const [sessionMin, setSessionMin] = useState<number | null>(null);
  const startedAt = useRef(0);
  const t = useTelemetry(game.slug, stage);

  useEffect(() => setVisits(readCount(game.slug)), [game.slug]);

  const start = () => {
    try {
      localStorage.setItem(countKey(game.slug), String(readCount(game.slug) + 1));
    } catch {}
    setVisits((v) => v + 1);
    startedAt.current = Date.now();
    run.current = null;
    summary.current = "";
    setReached(false);
    setSessionMin(null);
    t.start();
    chime(72, 0.04);
    setStage("play");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Одна строка памяти на прохождение: создаётся при первом итоге или завершении, потом дополняется.
  // Ошибка сохранения не мешает игре: память необязательна.
  const run = useRef<Promise<string | null> | null>(null);
  const summary = useRef("");
  const beforeRef = useRef(before);
  beforeRef.current = before;
  const persist = useCallback(
    (extra: { after?: number | null; useful?: number | null; notice?: string } = {}) => {
      if (!summary.current && !extra.after && !extra.useful && !extra.notice && !beforeRef.current) return;
      const prev = run.current;
      const text = [summary.current, extra.notice ? `Заметил(а): ${extra.notice}` : ""].filter(Boolean).join(" ");
      run.current = (async () => {
        const id = prev ? await prev.catch(() => null) : null;
        try {
          const r = await savePracticeRun({ id, game: game.slug, before: beforeRef.current, after: extra.after, useful: extra.useful, summary: text });
          return r.id ?? id;
        } catch {
          return id;
        }
      })();
    },
    [game.slug],
  );
  const report = useCallback(
    (text: string) => {
      summary.current = text.slice(0, 900);
      setReached(true);
      t.result();
      persist();
    },
    [persist, t],
  );

  const finish = useCallback(() => {
    if (game.free && !summary.current) {
      t.sessionEnd();
      setSessionMin(Math.round(t.seconds() / 60));
    }
    persist();
    t.close();
    setStage("reflect");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [persist, game.free, t]);

  const leave = () => {
    t.close();
    setStage("intro");
  };

  // Режим погружения: пока идёт игра, нижнее меню на телефоне скрыто.
  useEffect(() => {
    if (stage !== "play") return;
    document.body.dataset.practice = "1";
    return () => {
      delete document.body.dataset.practice;
    };
  }, [stage]);

  const finishLabel = game.free ? (reached ? p.done : p.sessionEnd) : reached ? p.done : p.finish;

  return (
    <PracticeContext.Provider value={{ finish, report, voice, slug: game.slug }}>
      <div className="animate-fade">
        {stage !== "play" && (
          <>
            <p className="text-xs uppercase tracking-[0.16em] text-ink-faint">
              {game.minutes} {m.page.min}
            </p>
            <h1 className="mt-2 font-serif text-[30px] leading-tight text-ink sm:text-[38px]">{game.title}</h1>
          </>
        )}
        {stage === "intro" && (
          <div className="mt-5 animate-rise">
            <div className={`relative overflow-hidden rounded-[30px] ${toneBg[game.tone]} p-6 sm:p-8`}>
              <span className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 animate-breathe rounded-full bg-paper/50" aria-hidden />
              <p className="relative max-w-xl font-serif text-[19px] leading-relaxed text-ink sm:text-[21px]">{game.hint}</p>
              <div className="relative mt-6 flex flex-wrap items-center gap-3">
                <button type="button" onClick={start} className={`${buttonStyles.primary} min-w-[180px]`} autoFocus>
                  {game.slug === "garden" ? p.enter : p.start}
                  <ArrowIcon className="h-4 w-4" />
                </button>
                {visits > 0 && <span className="text-[13px] text-ink-soft">{m.page.times(visits)}</span>}
              </div>
              <div className="relative mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
                <button type="button" onClick={() => setHowOpen((v) => !v)} aria-expanded={howOpen} className="text-ink-soft underline-offset-4 hover:text-ink hover:underline">
                  {p.how}
                </button>
                <button type="button" onClick={() => setMoodOpen((v) => !v)} aria-expanded={moodOpen} className="text-ink-soft underline-offset-4 hover:text-ink hover:underline">
                  {p.moodOptional}
                </button>
              </div>
              {howOpen && (
                <div className="relative mt-4 animate-rise rounded-[22px] bg-paper/70 p-4 sm:p-5">
                  <p className="text-[15px] leading-relaxed text-ink">{game.why}</p>
                  <ol className="mt-3 space-y-2">
                    {game.how.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-[14.5px] leading-snug text-ink">
                        <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper text-[12px] font-medium text-ink-soft">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-[13px] text-ink-soft">{m.flow.free}</p>
                </div>
              )}
              {moodOpen && (
                <div className="relative mt-4 animate-rise rounded-[22px] bg-paper/70 p-3 sm:p-4">
                  <MoodScale value={before} onChange={setBefore} labels={m.flow.scale} />
                </div>
              )}
            </div>
          </div>
        )}

        {stage === "play" && (
          <div>
            <PlayBar title={game.title} onExit={leave} />
            <div className="mt-4">{children}</div>
            {!ownFinish && (
              <div className="mt-8 flex justify-center">
                <button type="button" onClick={finish} className={reached ? buttonStyles.primary : buttonStyles.soft}>
                  {finishLabel}
                </button>
              </div>
            )}
          </div>
        )}

        {stage === "reflect" && (
          <Reflect game={game} before={before} startedAt={startedAt.current} sessionMin={sessionMin} onAgain={start} persist={persist} />
        )}
      </div>
    </PracticeContext.Provider>
  );
}

// Верхняя полоска во время игры: выйти и настройки (звук, вибрация, анимации).
function PlayBar({ title, onExit }: { title: string; onExit: () => void }) {
  const locale = useLocale();
  const p = playMessages[locale].flow;
  const s = usePracticeSettings();
  const [open, setOpen] = useState(false);
  const rows: [keyof typeof s, string][] = [
    ["sound", p.sound],
    ["haptics", p.haptics],
    ["motion", p.motion],
  ];
  return (
    <div className="relative flex items-center gap-3">
      <button type="button" onClick={onExit} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-paper/80 px-4 text-[14px] text-ink-soft shadow-soft transition hover:text-ink">
        <span aria-hidden>←</span> {p.exit}
      </button>
      <p className="min-w-0 flex-1 truncate text-center font-serif text-[17px] text-ink">{title}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={p.settings}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-paper/80 text-ink-soft shadow-soft transition hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden>
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-20 w-[250px] animate-rise rounded-[22px] bg-paper p-4 shadow-lift">
          {rows.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="switch"
              aria-checked={s[key]}
              onClick={() => setPracticeSettings({ [key]: !s[key] })}
              className="flex w-full items-center justify-between py-2 text-[14.5px] text-ink"
            >
              {label}
              <span className={`relative h-6 w-11 rounded-full transition ${s[key] ? "bg-lilac-deep" : "bg-sand-deep"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper shadow transition-all ${s[key] ? "left-[22px]" : "left-0.5"}`} />
              </span>
            </button>
          ))}
          <p className="mt-2 text-[12px] leading-snug text-ink-faint">{p.settingsHint}</p>
        </div>
      )}
    </div>
  );
}

export function MoodScale({ value, onChange, labels, small = false }: { value: number | null; onChange: (v: number) => void; labels: string[]; small?: boolean }) {
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-3" role="radiogroup">
      {labels.map((label, i) => {
        const v = i + 1;
        const on = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={label}
            onClick={() => {
              onChange(v);
              chime(64 + v * 3, 0.035);
            }}
            className={`flex flex-col items-center gap-1.5 rounded-[20px] px-1 py-2.5 transition-all duration-300 ${
              on ? "-translate-y-0.5 bg-lilac-soft shadow-soft" : "hover:bg-sand/70"
            } ${value !== null && !on ? "opacity-60" : ""}`}
          >
            <Orb size={small ? 34 : 42} face mood={v} still={!on} />
            <span className="text-center text-[11px] leading-tight text-ink-soft sm:text-[12px]">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Reflect({
  game,
  before,
  startedAt,
  sessionMin,
  onAgain,
  persist,
}: {
  game: Game;
  before: number | null;
  startedAt: number;
  sessionMin: number | null;
  onAgain: () => void;
  persist: (extra: { after?: number | null; useful?: number | null; notice?: string }) => void;
}) {
  const locale = useLocale();
  const f = gamesMessages[locale].flow;
  const p = playMessages[locale].flow;
  const [after, setAfter] = useState<number | null>(null);
  const [useful, setUseful] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [moodOpen, setMoodOpen] = useState(before !== null);
  const [saved, setSaved] = useState(false);
  const [pending, startSave] = useTransition();
  const sent = useRef(false);
  const latest = useRef({ after, useful });
  latest.current = { after, useful };

  // Одна запись «как было — как стало» и необязательная полезность на прохождение.
  const send = useCallback(() => {
    if (sent.current) return;
    const { after: a, useful: u } = latest.current;
    if (!a && !u && !before) return;
    sent.current = true;
    sendEvent("practice_feel", {
      game: game.slug,
      before: before ?? undefined,
      after: a ?? undefined,
      useful: u ?? undefined,
      sec: Math.min(7200, Math.round((Date.now() - startedAt) / 1000)),
    });
  }, [before, game.slug, startedAt]);

  useEffect(() => {
    if (useful && (after || !moodOpen)) send();
  }, [after, useful, moodOpen, send]);
  useEffect(() => {
    window.addEventListener("pagehide", send);
    return () => {
      window.removeEventListener("pagehide", send);
      send();
    };
  }, [send]);

  useEffect(() => {
    if (!after && !useful && !notice.trim()) return;
    const t = setTimeout(() => persist({ after, useful, notice: notice.trim().slice(0, 300) }), 900);
    return () => clearTimeout(t);
  }, [after, useful, notice, persist]);

  const crisis = looksLikeCrisis(notice);
  const change = before && after ? after - before : null;
  const feedback = !after ? null : after <= 2 && (change === null || change <= 0) ? f.heavier : change !== null && change > 0 ? f.lighter : f.same;
  const needPeople = (after !== null && after <= 2) || useful === 1;
  const next = nextGames(game.slug, locale);

  const save = () =>
    startSave(async () => {
      const fd = new FormData();
      fd.set("kind", "thought");
      fd.set("content", f.journal(game.title, notice.trim()));
      try {
        const r = await addJournalEntry(undefined, fd);
        if (r && "ok" in r) setSaved(true);
      } catch {}
    });

  return (
    <div className="mt-6 animate-rise space-y-4">
      <div className="relative flex items-center gap-4 overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#1b1c3a,#3a2f6b_60%,#6b4f8f)] p-5 text-paper shadow-lift sm:p-6">
        <span className="star-born relative flex h-12 w-12 shrink-0 items-center justify-center">
          <span className="absolute h-12 w-12 rounded-full bg-[radial-gradient(circle,rgba(255,236,200,0.9),transparent_65%)]" />
          <svg viewBox="0 0 24 24" className="relative h-7 w-7" fill="#fff6dc">
            <path d="M12 2l1.9 6.3L20 10l-6.1 1.7L12 18l-1.9-6.3L4 10l6.1-1.7z" />
          </svg>
        </span>
        <div>
          <p className="font-serif text-[19px] leading-tight">{sessionMin !== null ? p.sessionTitle : f.starTitle}</p>
          <p className="mt-0.5 text-[13.5px] text-paper/70">{sessionMin !== null ? p.sessionText(sessionMin) : f.starText}</p>
        </div>
      </div>

      <div className="rounded-[30px] bg-paper/80 p-5 shadow-soft sm:p-7">
        <h2 className="text-[15px] font-medium text-ink">{f.usefulTitle}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {f.useful.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setUseful(i + 1)}
              aria-pressed={useful === i + 1}
              className={`rounded-full px-5 py-2.5 text-sm transition ${useful === i + 1 ? "bg-ink text-paper shadow-soft" : "bg-sand/70 text-ink hover:bg-sand-deep"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
          {!moodOpen && (
            <button type="button" onClick={() => setMoodOpen(true)} className="text-ink-soft underline-offset-4 hover:text-ink hover:underline">
              {p.markMood}
            </button>
          )}
          {!noteOpen && (
            <button type="button" onClick={() => setNoteOpen(true)} className="text-ink-soft underline-offset-4 hover:text-ink hover:underline">
              {p.note}
            </button>
          )}
        </div>
        {moodOpen && (
          <div className="mt-4 animate-rise">
            <p className="mb-2 text-[13.5px] text-ink-soft">{f.afterTitle}</p>
            <MoodScale value={after} onChange={setAfter} labels={f.scale} small />
            {feedback && <p className="mt-4 animate-rise text-[15px] leading-relaxed text-ink">{feedback}</p>}
          </div>
        )}
        {noteOpen && (
          <div className="mt-4 animate-rise">
            <textarea
              value={notice}
              onChange={(e) => {
                setNotice(e.target.value);
                setSaved(false);
              }}
              rows={3}
              maxLength={2000}
              autoFocus
              placeholder={f.noticePlaceholder}
              className="w-full resize-none rounded-[20px] border border-line bg-paper px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-lilac"
            />
            {crisis && (
              <div className="mt-4">
                <CrisisHelp />
              </div>
            )}
            {notice.trim() && (
              <button type="button" onClick={save} disabled={saved || pending} className={`${buttonStyles.soft} mt-3`}>
                {saved ? f.saved : f.save}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-[30px] bg-paper/60 p-5 sm:p-7">
        {next.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {next.map((g) => (
              <Link
                key={g.slug}
                href={`/play/${g.slug}`}
                onClick={send}
                className={`group flex items-center gap-3 rounded-[22px] ${toneBg[g.tone]} p-4 transition hover:-translate-y-0.5 hover:shadow-lift`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-ink">{g.title}</span>
                  <span className="block text-[13px] leading-snug text-ink-soft">{g.hint}</span>
                </span>
                <ArrowIcon className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <StartForm prompt={f.talkPrompt(game.title, notice.trim())} className={`${buttonStyles.primary} w-full sm:w-auto`}>
            {p.talk}
          </StartForm>
          {needPeople && (
            <Link href="/specialists" onClick={send} className={`${buttonStyles.soft} w-full sm:w-auto`}>
              {f.psychologists}
            </Link>
          )}
          <button type="button" onClick={onAgain} className={`${buttonStyles.ghost} w-full sm:w-auto`}>
            {f.again}
          </button>
          <Link href="/play" onClick={send} className={`${buttonStyles.ghost} w-full sm:w-auto`}>
            {f.all}
          </Link>
        </div>
      </div>
    </div>
  );
}

// Рамка для инструментов, переехавших из каталога (дневник, «Мой день», планирование, профиль):
// без вступления и итоговой анкеты, сразу к делу. Записи и аналитика — те же, что у практик.
export function ToolFlow({ game, children }: { game: Game; children: React.ReactNode }) {
  const t = useTelemetry(game.slug, "play");
  const run = useRef<Promise<string | null> | null>(null);
  useEffect(() => {
    t.start();
  }, [t]);
  const report = useCallback(
    (text: string) => {
      t.result();
      const prev = run.current;
      run.current = (async () => {
        const id = prev ? await prev.catch(() => null) : null;
        try {
          const r = await savePracticeRun({ id, game: game.slug, summary: text.slice(0, 900) });
          return r.id ?? id;
        } catch {
          return id;
        }
      })();
    },
    [t, game.slug],
  );
  return (
    <PracticeContext.Provider value={{ finish: () => {}, report, voice: DEFAULT_VOICE, slug: game.slug }}>
      <div className="animate-fade">
        <h1 className="font-serif text-[30px] leading-tight text-ink sm:text-[38px]">{game.title}</h1>
        <p className="mt-2 max-w-xl text-[15px] text-ink-soft">{game.hint}</p>
        <div className="mt-6">{children}</div>
      </div>
    </PracticeContext.Provider>
  );
}
