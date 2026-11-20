"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/i18n/client";
import { winsMessages } from "@/i18n/game-wins";
import { practiceHistory } from "@/lib/practice-actions";
import { chime, PENTATONIC } from "@/lib/chime";
import { bowlStrike } from "@/lib/sounds";
import { ResultActions } from "./ResultActions";
import { usePractice } from "./PracticeFlow";
import { Night, nightChip, nightGhost, nightInput, nightPrimary } from "./Night";

const WARM = ["#ffd59c", "#ffb79c", "#f2a7cb"];
// Итог хранится в памяти практик одной строкой; из неё же собирается календарь.
const PREFIX = "Победы дня: ";
// «Банка хорошего» объединена с победами в «Мой день»: хорошее пишется в ту же строку дня.
const GOOD = " Хорошее: ";
const SEP = " • ";

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const split = (v: string) => v.split(SEP).map((x) => x.trim()).filter(Boolean);
const parse = (summary: string) => {
  const body = summary.startsWith(PREFIX) ? summary.slice(PREFIX.length).split(" Заметил(а):")[0] : "";
  const [w, g = ""] = body.split(GOOD.trim());
  return { w: split(w.replace(/\s+$/, "")), g: split(g) };
};
type Day = { w: string[]; g: string[] };

export function Wins() {
  const locale = useLocale();
  const m = winsMessages[locale];
  const { report } = usePractice();
  const [wins, setWins] = useState<string[]>([]);
  // Победы прошлых троек этого же захода: «зажечь ещё три» не должно стирать уже записанное.
  const [bank, setBank] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [past, setPast] = useState<Record<string, Day>>({});
  const [goods, setGoods] = useState<string[]>([]);
  const [goodText, setGoodText] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const todayKey = dayKey(new Date());

  useEffect(() => {
    practiceHistory("wins")
      .then((rows) => {
        const map: Record<string, Day> = {};
        for (const r of rows) {
          const k = dayKey(new Date(r.at));
          const d = parse(r.summary);
          map[k] = { w: [...(map[k]?.w ?? []), ...d.w], g: [...(map[k]?.g ?? []), ...d.g] };
        }
        setPast(map);
      })
      .catch(() => {});
  }, []);

  const add = (value = text) => {
    const v = value.trim().slice(0, 120);
    if (!v || wins.length >= 3) return;
    const next = [...wins, v];
    setWins(next);
    setText("");
    send([...bank, ...next], goods);
    if (next.length === 3) {
      bowlStrike(0.07, 262);
      setTimeout(() => chime(84, 0.04), 500);
    } else chime(PENTATONIC[next.length + 2], 0.05);
  };

  const send = (w: string[], g: string[]) => report(PREFIX + w.join(SEP) + (g.length ? GOOD + g.join(SEP) : ""));
  const addGood = (value = goodText) => {
    const v = value.trim().slice(0, 120);
    if (!v || goods.length >= 10) return;
    const next = [...goods, v];
    setGoods(next);
    setGoodText("");
    send([...bank, ...wins], next);
    chime(PENTATONIC[(next.length % 4) + 3], 0.045);
  };

  // Сегодняшний день: сохранённое раньше плюс то, что отмечено сейчас.
  const days = useMemo<Record<string, string[]>>(() => {
    const out: Record<string, string[]> = {};
    for (const [k, d] of Object.entries(past)) out[k] = [...d.w, ...d.g.map((x) => `♡ ${x}`)];
    out[todayKey] = [...(past[todayKey]?.w ?? []), ...bank, ...wins, ...[...(past[todayKey]?.g ?? []), ...goods].map((x) => `♡ ${x}`)];
    return out;
  }, [past, bank, wins, goods, todayKey]);
  const withWins = Object.values(days).filter((d) => d.length > 0).length;
  const done = wins.length === 3;
  const list = [...bank, ...wins].map((w, i) => `${i + 1}. ${w}`).join("\n");

  // Последние четыре недели, строки начинаются с понедельника.
  const grid = useMemo(() => {
    const end = new Date();
    end.setHours(12, 0, 0, 0);
    end.setDate(end.getDate() + ((7 - end.getDay()) % 7));
    return Array.from({ length: 28 }, (_, i) => {
      const d = new Date(end);
      d.setDate(end.getDate() - 27 + i);
      return d;
    });
  }, []);

  return (
    <div className="space-y-5">
      <Night glow="#8a5a86" className="px-5 pb-6 pt-8 sm:px-8" label={m.aria(wins.length)}>
        <div className="relative flex items-end justify-center gap-4 sm:gap-10">
          {[0, 1, 2].map((i) => (
            <Lantern key={`${i}-${wins[i] ?? ""}`} text={wins[i]} color={WARM[i]} active={i === wins.length} delay={i * 0.8} />
          ))}
        </div>

        {!done ? (
          <div className="relative mx-auto mt-7 max-w-md">
            <p className="text-center text-xs uppercase tracking-[0.16em] text-paper/60">{m.slot(wins.length + 1)}</p>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
            >
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder={m.placeholder} className={`${nightInput} h-12 rounded-full`} />
              <button type="submit" disabled={!text.trim()} className={`${nightPrimary} shrink-0`}>
                {m.add}
              </button>
            </form>
            <p className="mt-5 text-[13px] text-paper/60">{m.examplesTitle}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {m.examples
                .filter((x) => !wins.includes(x))
                .slice(0, 6)
                .map((x) => (
                  <button key={x} type="button" onClick={() => add(x)} className={nightChip}>
                    + {x}
                  </button>
                ))}
            </div>
            <p className="mt-4 text-[13px] text-paper/50">{m.hint}</p>
          </div>
        ) : (
          <div className="relative mx-auto mt-7 max-w-md animate-rise text-center">
            <h2 className="font-serif text-[24px]">{m.doneTitle}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-paper/75">{m.doneText}</p>
            <button type="button" onClick={() => { setBank([...bank, ...wins]); setWins([]); }} className={`${nightGhost} mt-4`}>
              {m.more}
            </button>
          </div>
        )}
      </Night>

      <section className="rounded-[30px] bg-[linear-gradient(160deg,#fff6e6,#ffeede)] p-5 shadow-soft sm:p-7">
        <h2 className="font-serif text-[20px] text-ink">{m.goodTitle}</h2>
        <p className="mt-1 text-[13.5px] text-ink-soft">{m.goodHint}</p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addGood();
          }}
        >
          <input value={goodText} onChange={(e) => setGoodText(e.target.value)} maxLength={120} placeholder={m.goodPlaceholder} className="h-12 w-full rounded-full border border-line bg-paper px-4 text-[15px] text-ink outline-none placeholder:text-ink-faint focus:border-lilac" />
          <button type="submit" disabled={!goodText.trim()} className="h-12 shrink-0 rounded-full bg-ink px-5 text-[14.5px] text-paper disabled:opacity-40">
            {m.goodAdd}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {m.goodExamples
            .filter((x) => !goods.includes(x))
            .map((x) => (
              <button key={x} type="button" onClick={() => addGood(x)} className="rounded-full bg-paper/80 px-3.5 py-1.5 text-[13.5px] text-ink-soft transition hover:bg-paper">
                + {x}
              </button>
            ))}
        </div>
        {[...(past[todayKey]?.g ?? []), ...goods].length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {[...(past[todayKey]?.g ?? []), ...goods].map((g, i) => (
              <li key={i} className="animate-rise rounded-[16px] bg-paper px-3.5 py-2 text-[14px] text-ink shadow-soft">
                <span className="mr-1.5 text-[#e6a34a]">♡</span>
                {g}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[13.5px] text-ink-faint">{m.goodEmpty}</p>
        )}
      </section>

      <section className="rounded-[30px] bg-paper p-5 shadow-soft sm:p-7">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-[20px] text-ink">{m.calendar}</h2>
          <p className="text-[13px] text-ink-faint">{m.days(withWins)}</p>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
          {m.week.map((w) => (
            <span key={w} className="text-center text-[11px] text-ink-faint">{w}</span>
          ))}
          {grid.map((d) => {
            const k = dayKey(d);
            const n = Math.min(3, days[k]?.length ?? 0);
            const future = d.getTime() > Date.now() + 43_200_000;
            const isToday = k === todayKey;
            return (
              <button
                key={k}
                type="button"
                disabled={future || n === 0}
                onClick={() => setOpen(open === k ? null : k)}
                aria-label={`${d.toLocaleDateString(locale)}: ${n}`}
                className={`relative flex aspect-square items-center justify-center rounded-2xl text-[12px] transition ${future ? "opacity-25" : ""} ${open === k ? "ring-2 ring-lilac" : ""} ${isToday ? "font-semibold text-ink" : "text-ink-soft"}`}
                style={{
                  background: n ? `radial-gradient(circle at 50% 40%, #fff7e0 0%, ${["", "#ffe9c2", "#ffd59c", "#ffbf7a"][n]} 75%)` : "#f4f2f8",
                  boxShadow: n ? `0 0 ${6 + n * 5}px ${n}px rgba(255,200,130,${0.25 + n * 0.15})` : isToday ? "inset 0 0 0 1.5px #aaa4ff" : undefined,
                }}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
        {open && (
          <div className="mt-4 animate-rise rounded-[20px] bg-[#fff6e6] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">{open === todayKey ? m.today : grid.find((d) => dayKey(d) === open)?.toLocaleDateString(locale, { day: "numeric", month: "long" })}</p>
            {days[open]?.length ? (
              <ul className="mt-2 space-y-1 text-[14.5px] text-ink">
                {days[open].map((w, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[#e6a34a]">{w.startsWith("♡ ") ? "♡" : "✦"}</span>
                    {w.replace(/^♡ /, "")}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[14px] text-ink-soft">{m.empty}</p>
            )}
          </div>
        )}
      </section>

      {done && (
        <div className="animate-rise">
          <ResultActions kind="gratitude" journal={m.journal(list)} prompt={m.prompt(list)} />
        </div>
      )}
    </div>
  );
}

// Бумажный фонарик: пустой еле виден, зажжённый поднимается и светится.
function Lantern({ text, color, active, delay }: { text?: string; color: string; active: boolean; delay: number }) {
  const lit = !!text;
  return (
    <div className="flex w-[30%] max-w-[130px] flex-col items-center">
      <div className={lit ? "lantern-up" : ""}>
        <div className={lit ? "jar-bob" : active ? "animate-breathe" : ""} style={{ animationDelay: `${-delay}s` }}>
          <svg viewBox="0 0 80 110" className="h-[96px] w-[70px] sm:h-[124px] sm:w-[90px]" aria-hidden>
            {lit && <ellipse cx="40" cy="56" rx="38" ry="46" fill={color} opacity="0.28" style={{ filter: "blur(10px)" }} />}
            <path
              d="M22 14 h36 l10 18 c4 20 2 44 -8 62 h-40 c-10 -18 -12 -42 -8 -62 z"
              fill={lit ? color : "transparent"}
              fillOpacity={lit ? 0.92 : 0}
              stroke={lit ? "#fff" : "#ffffff"}
              strokeOpacity={lit ? 0.7 : active ? 0.55 : 0.25}
              strokeWidth="1.6"
              strokeDasharray={lit ? undefined : "4 5"}
            />
            {lit && (
              <>
                <ellipse cx="40" cy="70" rx="14" ry="20" fill="#fff8e0" opacity="0.85" />
                <path d="M30 20 c-6 22 -6 46 2 70 M50 20 c6 22 6 46 -2 70" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" fill="none" />
              </>
            )}
            <rect x="28" y="94" width="24" height="6" rx="2" fill={lit ? "#b98656" : "#ffffff"} opacity={lit ? 1 : 0.25} />
          </svg>
        </div>
      </div>
      <p className={`mt-2 min-h-[34px] text-center text-[12.5px] leading-tight sm:text-[13.5px] ${lit ? "text-paper" : "text-paper/35"}`}>{text ?? "·"}</p>
    </div>
  );
}
