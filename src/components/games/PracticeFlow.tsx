"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import { Orb } from "../Orb";
import { StartForm } from "../StartForm";
import { ArrowIcon } from "../icons";
import { buttonStyles, toneBg } from "../ui";
import { PracticeTrack, sendEvent } from "../Track";
import { CrisisHelp } from "../course/CrisisHelp";
import { addJournalEntry } from "@/lib/actions";
import { savePracticeRun } from "@/lib/practice-actions";
import { looksLikeCrisis } from "@/lib/crisis";
import { chime } from "@/lib/chime";
import { nextGames, type Game } from "@/lib/games";
import { DEFAULT_VOICE, type VoiceSettings } from "@/lib/voices";
import { useLocale } from "@/i18n/client";
import { gamesMessages } from "@/i18n/games";

type Stage = "intro" | "play" | "reflect";

const PracticeContext = createContext<{ finish: () => void; report: (summary: string) => void; voice: VoiceSettings; slug: string }>({
  finish: () => {},
  report: () => {},
  voice: DEFAULT_VOICE,
  slug: "",
});

// Для игр: finish() завершает практику самой игрой (например, когда закончилось голосовое сопровождение),
// report() сообщает короткий итог («что человек выбрал и к чему пришёл»): он сохраняется в память,
// которую потом учитывает собеседник.
export const usePractice = () => useContext(PracticeContext);

const countKey = (slug: string) => `opora-practice-${slug}`;

function readCount(slug: string) {
  try {
    return Number(localStorage.getItem(countKey(slug)) || 0) || 0;
  } catch {
    return 0;
  }
}

// Общая рамка любой практики по правилам документа «Игры»: до запуска объясняем цель и ход,
// спрашиваем «как вы сейчас», дальше игра (её можно бросить в любой момент), в конце короткая
// рефлексия и следующий шаг. В аналитику уходят только цифры (src/app/api/t/route.ts).
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
  const f = m.flow;
  const [stage, setStage] = useState<Stage>("intro");
  const [before, setBefore] = useState<number | null>(null);
  const [visits, setVisits] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => setVisits(readCount(game.slug)), [game.slug]);

  const start = () => {
    try {
      localStorage.setItem(countKey(game.slug), String(readCount(game.slug) + 1));
    } catch {}
    startedAt.current = Date.now();
    run.current = null;
    summary.current = "";
    chime(72, 0.04);
    setStage("play");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Одна строка памяти на прохождение: создаётся при первом итоге или завершении, потом дополняется.
  const run = useRef<Promise<string | null> | null>(null);
  const summary = useRef("");
  const beforeRef = useRef(before);
  beforeRef.current = before;
  const persist = useCallback(
    (extra: { after?: number | null; useful?: number | null; notice?: string } = {}) => {
      const prev = run.current;
      const text = [summary.current, extra.notice ? `Заметил(а): ${extra.notice}` : ""].filter(Boolean).join(" ");
      run.current = (async () => {
        const id = prev ? await prev : null;
        const r = await savePracticeRun({ id, game: game.slug, before: beforeRef.current, after: extra.after, useful: extra.useful, summary: text });
        return r.id ?? id;
      })();
    },
    [game.slug],
  );
  const report = useCallback(
    (text: string) => {
      summary.current = text.slice(0, 900);
      persist();
    },
    [persist],
  );

  const finish = useCallback(() => {
    persist();
    setStage("reflect");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [persist]);

  // Режим погружения: пока идёт игра, нижнее меню на телефоне скрыто.
  useEffect(() => {
    if (stage !== "play") return;
    document.body.dataset.practice = "1";
    return () => {
      delete document.body.dataset.practice;
    };
  }, [stage]);

  return (
    <PracticeContext.Provider value={{ finish, report, voice, slug: game.slug }}>
      <div className="animate-fade">
        <p className="text-xs uppercase tracking-[0.16em] text-ink-faint">
          {m.page.groups[game.group].title} · {game.minutes} {m.page.min}
        </p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight text-ink sm:text-[38px]">{game.title}</h1>
        {stage === "intro" && <p className="mt-2 text-[15px] text-ink-soft">{game.hint}</p>}

        {stage === "intro" && (
          <div className="mt-8 animate-rise space-y-4">
            <div className={`relative overflow-hidden rounded-[30px] ${toneBg[game.tone]} p-6 sm:p-8`}>
              <span className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 animate-breathe rounded-full bg-paper/50" aria-hidden />
              <h2 className="relative text-xs uppercase tracking-[0.16em] text-ink-soft">{f.whyTitle}</h2>
              <p className="relative mt-2 max-w-xl font-serif text-[19px] leading-relaxed text-ink sm:text-[21px]">{game.why}</p>
              <h2 className="relative mt-6 text-xs uppercase tracking-[0.16em] text-ink-soft">{f.howTitle}</h2>
              <ol className="relative mt-3 space-y-2.5">
                {game.how.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px] leading-snug text-ink">
                    <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper/80 text-[12px] font-medium text-ink-soft">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="relative mt-6 text-[13.5px] text-ink-soft">{f.free}</p>
            </div>

            <div className="rounded-[30px] bg-paper/80 p-6 shadow-soft sm:p-8">
              <h2 className="text-[16px] font-medium text-ink">{f.nowTitle}</h2>
              <p className="mt-1 text-[13.5px] text-ink-soft">{f.nowHint}</p>
              <MoodScale value={before} onChange={setBefore} labels={f.scale} />
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button type="button" onClick={start} className={`${buttonStyles.primary} min-w-[160px]`}>
                  {f.start}
                </button>
                {visits > 0 && <span className="text-[13px] text-ink-faint">{m.page.times(visits)}</span>}
              </div>
            </div>
          </div>
        )}

        {stage === "play" && (
          <div className="mt-5">
            <PracticeTrack game={game.slug} />
            {children}
            {!ownFinish && (
              <div className="mt-10 flex justify-center">
                <button type="button" onClick={finish} className={buttonStyles.soft}>
                  {f.finish}
                </button>
              </div>
            )}
          </div>
        )}

        {stage === "reflect" && (
          <Reflect game={game} before={before} startedAt={startedAt.current} onAgain={() => setStage("intro")} persist={persist} />
        )}
      </div>
    </PracticeContext.Provider>
  );
}

function MoodScale({ value, onChange, labels }: { value: number | null; onChange: (v: number) => void; labels: string[] }) {
  return (
    <div className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-3" role="radiogroup">
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
            className={`flex flex-col items-center gap-1.5 rounded-[20px] px-1 py-3 transition-all duration-300 ${
              on ? "-translate-y-0.5 bg-lilac-soft shadow-soft" : "hover:bg-sand/70"
            } ${value !== null && !on ? "opacity-60" : ""}`}
          >
            <Orb size={46} face mood={v} still={!on} />
            <span className="text-center text-[11.5px] leading-tight text-ink-soft sm:text-[12.5px]">{label}</span>
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
  onAgain,
  persist,
}: {
  game: Game;
  before: number | null;
  startedAt: number;
  onAgain: () => void;
  persist: (extra: { after?: number | null; useful?: number | null; notice?: string }) => void;
}) {
  const locale = useLocale();
  const f = gamesMessages[locale].flow;
  const [after, setAfter] = useState<number | null>(null);
  const [useful, setUseful] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startSave] = useTransition();
  const sent = useRef(false);
  const latest = useRef({ after, useful });
  latest.current = { after, useful };

  // Одна запись «как было — как стало» на прохождение: когда человек ответил на оба вопроса
  // или ушёл со страницы, ответив хотя бы на один.
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
    if (after && useful) send();
  }, [after, useful, send]);
  useEffect(() => {
    window.addEventListener("pagehide", send);
    return () => {
      window.removeEventListener("pagehide", send);
      send();
    };
  }, [send]);

  // Ответы рефлексии дописываются в память о прохождении (с паузой, чтобы не писать на каждую букву).
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
      const r = await addJournalEntry(undefined, fd);
      if (r && "ok" in r) setSaved(true);
    });

  return (
    <div className="mt-8 animate-rise space-y-4">
      <div className="relative flex items-center gap-4 overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#1b1c3a,#3a2f6b_60%,#6b4f8f)] p-5 text-paper shadow-lift sm:p-6">
        <span className="star-born relative flex h-12 w-12 shrink-0 items-center justify-center">
          <span className="absolute h-12 w-12 rounded-full bg-[radial-gradient(circle,rgba(255,236,200,0.9),transparent_65%)]" />
          <svg viewBox="0 0 24 24" className="relative h-7 w-7" fill="#fff6dc">
            <path d="M12 2l1.9 6.3L20 10l-6.1 1.7L12 18l-1.9-6.3L4 10l6.1-1.7z" />
          </svg>
        </span>
        <div>
          <p className="font-serif text-[19px] leading-tight">{f.starTitle}</p>
          <p className="mt-0.5 text-[13.5px] text-paper/70">{f.starText}</p>
        </div>
      </div>
      <div className="rounded-[30px] bg-paper/80 p-6 shadow-soft sm:p-8">
        <h2 className="font-serif text-[22px] text-ink">{f.afterTitle}</h2>
        <p className="mt-1 text-[13.5px] text-ink-soft">{f.afterHint}</p>
        <MoodScale value={after} onChange={setAfter} labels={f.scale} />
        {feedback && <p className="mt-5 animate-rise text-[15px] leading-relaxed text-ink">{feedback}</p>}

        <h3 className="mt-8 text-[15px] font-medium text-ink">{f.usefulTitle}</h3>
        <div className="mt-3 flex gap-2">
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

        <h3 className="mt-8 text-[15px] font-medium text-ink">{f.noticeTitle}</h3>
        <textarea
          value={notice}
          onChange={(e) => {
            setNotice(e.target.value);
            setSaved(false);
          }}
          rows={3}
          maxLength={2000}
          placeholder={f.noticePlaceholder}
          className="mt-3 w-full resize-none rounded-[20px] border border-line bg-paper px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-lilac"
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

      <div className="rounded-[30px] bg-paper/60 p-6 sm:p-8">
        <h2 className="font-serif text-[22px] text-ink">{f.nextTitle}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <StartForm prompt={f.talkPrompt(game.title, notice.trim())} className={`${buttonStyles.primary} w-full sm:w-auto`}>
            {f.talk}
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
