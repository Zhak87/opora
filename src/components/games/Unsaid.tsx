"use client";

import { useState, useTransition } from "react";
import { useLocale } from "@/i18n/client";
import { unsaidMessages } from "@/i18n/game-unsaid";
import { addJournalEntry } from "@/lib/actions";
import { looksLikeCrisis } from "@/lib/crisis";
import { chime } from "@/lib/chime";
import { bowlStrike, drop, whoosh } from "@/lib/sounds";
import { StartForm } from "../StartForm";
import { CrisisHelp } from "../course/CrisisHelp";
import { usePractice } from "./PracticeFlow";
import { Night, nightChip, nightGhost, nightInput, nightPrimary } from "./Night";

type Step = "who" | "topic" | "ask" | "letter" | "kept" | "released";
const HUE = ["#ffd59c", "#ff9f8a", "#8fd3f4", "#f2a7cb", "#b9b4e6"];
const GLOW = ["#8a6a4a", "#8a4a56", "#3f6f8f", "#8a4f7a", "#5a5596"];

export function Unsaid() {
  const locale = useLocale();
  const m = unsaidMessages[locale];
  const { report } = usePractice();
  const [step, setStep] = useState<Step>("who");
  const [who, setWho] = useState("");
  const [name, setName] = useState("");
  const [topic, setTopic] = useState(0);
  const [q, setQ] = useState(0);
  const [text, setText] = useState("");
  const [letter, setLetter] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [saving, startSave] = useTransition();

  const t = m.topics[topic];
  const crisis = looksLikeCrisis(`${letter} ${text}`);

  const pickWho = (v: string) => {
    if (!v.trim()) return;
    setWho(v.trim().slice(0, 60));
    setStep("topic");
    chime(72, 0.04);
  };
  const pickTopic = (i: number) => {
    setTopic(i);
    setQ(0);
    setLetter("");
    setStep("ask");
    drop(0.05, 560 + i * 60);
    report(m.summary(who, m.topics[i].name, ""));
  };
  const answer = (skip: boolean) => {
    const a = text.trim();
    if (!skip && a) {
      setLetter((l) => (l ? `${l}\n\n${a}` : a));
      chime(74 + q * 2, 0.04);
    }
    setText("");
    if (q >= 2) setStep("letter");
    else setQ(q + 1);
  };
  const keep = () =>
    startSave(async () => {
      const fd = new FormData();
      fd.set("kind", "feeling");
      fd.set("content", m.journal(who, t.name, letter.trim()));
      const r = await addJournalEntry(undefined, fd);
      if (r && "ok" in r) {
        setStep("kept");
        bowlStrike(0.06, 262);
        report(m.summary(who, t.name, m.ends.kept));
      }
    });
  const release = () => {
    setLeaving(true);
    whoosh(0.07, 2.4);
    report(m.summary(who, t.name, m.ends.released));
    setTimeout(() => {
      setStep("released");
      setLeaving(false);
      setLetter("");
      chime(84, 0.04);
    }, 2500);
  };
  const restart = () => {
    setStep("who");
    setWho("");
    setName("");
    setText("");
    setLetter("");
    setQ(0);
  };

  const writing = step === "ask" || step === "letter";
  const hue = step === "who" ? "#cfc9ff" : HUE[topic];

  return (
    <Night glow={step === "who" ? "#5a4f96" : GLOW[topic]} className="p-5 sm:p-8">
      {/* свеча */}
      <span aria-hidden className="pointer-events-none absolute right-6 top-6 h-24 w-24 animate-breathe rounded-full opacity-60 blur-2xl sm:right-12" style={{ background: hue, transition: "background 1s" }} />

      {step === "who" && (
        <div className="relative animate-rise">
          <h2 className="font-serif text-[24px] leading-snug sm:text-[28px]">{m.whoTitle}</h2>
          <p className="mt-1 text-[14px] text-paper/65">{m.whoHint}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {m.people.map((p) => (
              <button key={p} type="button" onClick={() => pickWho(p)} className={`${nightChip} px-4 py-2.5 text-[14.5px]`}>
                {p}
              </button>
            ))}
          </div>
          <form
            className="mt-4 flex max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              pickWho(name);
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={m.whoPlaceholder} className={`${nightInput} h-12 rounded-full`} />
            <button type="submit" disabled={!name.trim()} className={`${nightPrimary} shrink-0`}>
              {m.choose}
            </button>
          </form>
        </div>
      )}

      {step === "topic" && (
        <div className="relative animate-rise">
          <p className="text-[11px] uppercase tracking-[0.14em] text-paper/55">
            {m.to}: {who}
          </p>
          <h2 className="mt-1 font-serif text-[24px] leading-snug sm:text-[28px]">{m.topicTitle}</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {m.topics.map((x, i) => (
              <button
                key={x.name}
                type="button"
                onClick={() => pickTopic(i)}
                className="group flex flex-col items-center gap-3 rounded-[24px] border border-paper/15 bg-paper/10 px-3 py-5 backdrop-blur transition hover:-translate-y-1 hover:bg-paper/20"
              >
                <span className="h-10 w-10 animate-morph" style={{ background: `radial-gradient(circle at 35% 30%, #fff, ${HUE[i]} 70%)`, boxShadow: `0 0 22px 4px ${HUE[i]}88`, animationDelay: `${-i * 2.5}s` }} />
                <span className="text-[14.5px]">{x.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(writing || leaving) && (
        <div className="relative grid gap-6 md:grid-cols-[1fr_minmax(0,340px)] md:items-start">
          <div className={`min-w-0 ${step === "letter" ? "order-2" : ""}`}>
            {step === "ask" && (
              <form
                key={q}
                className="animate-rise"
                onSubmit={(e) => {
                  e.preventDefault();
                  answer(false);
                }}
              >
                <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: hue }}>
                  {t.name} · {m.step(q + 1)}
                </p>
                <h2 className="mt-1 font-serif text-[22px] leading-snug sm:text-[25px]">{t.questions[q]}</h2>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={1200} autoFocus placeholder={m.placeholder} className={`${nightInput} mt-4 resize-none`} />
                <div className="mt-4 flex items-center gap-4">
                  <button type="submit" disabled={!text.trim()} className={nightPrimary}>
                    {m.next}
                  </button>
                  <button type="button" onClick={() => answer(true)} className={nightGhost}>
                    {m.skip}
                  </button>
                </div>
              </form>
            )}
            {step === "letter" && (
              <div className="animate-rise">
                <h2 className="font-serif text-[22px] sm:text-[24px]">{m.letterTitle}</h2>
                <p className="mt-1 text-[14px] leading-snug text-paper/65">{m.letterHint}</p>
                <div className="mt-5 flex flex-col items-start gap-3">
                  <button type="button" onClick={keep} disabled={!letter.trim() || saving || leaving} className={nightPrimary}>
                    {saving ? m.saving : m.keep}
                  </button>
                  <button type="button" onClick={release} disabled={!letter.trim() || leaving || saving} className="rounded-full border border-paper/30 px-5 py-2.5 text-[14.5px] transition hover:bg-paper/10 disabled:opacity-40">
                    {m.release}
                  </button>
                </div>
                <p className="mt-4 text-[12.5px] leading-snug text-paper/50">{m.privacy}</p>
              </div>
            )}
          </div>

          {/* лист письма */}
          <div className={`relative ${leaving ? "letter-free" : ""}`}>
            <div
              className="relative -rotate-1 rounded-[10px] px-5 pb-6 pt-5 text-[#3a3350] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]"
              style={{ background: "repeating-linear-gradient(#fbf5e8 0 31px, #e9dfca 31px 32px)", boxShadow: `0 0 60px -10px ${hue}88, 0 30px 60px -20px rgba(0,0,0,0.6)` }}
            >
              <p className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-[#8a7f9c]">
                <span>
                  {m.to}: {who}
                </span>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: hue }} />
              </p>
              {step === "letter" ? (
                <textarea
                  value={letter}
                  onChange={(e) => setLetter(e.target.value)}
                  maxLength={6000}
                  rows={Math.min(16, Math.max(7, letter.split("\n").length + Math.ceil(letter.length / 34)))}
                  placeholder={m.empty}
                  aria-label={m.letterTitle}
                  className="mt-2 block w-full resize-none bg-transparent text-[15.5px] leading-[32px] outline-none placeholder:text-[#b3a9c2]"
                />
              ) : (
                <p className="mt-2 min-h-[160px] whitespace-pre-wrap text-[15.5px] leading-[32px]">
                  {letter}
                  {text && <span className="opacity-50">{letter ? "\n\n" : ""}{text}</span>}
                  {!letter && !text && <span className="text-[#b3a9c2]">{m.empty}</span>}
                </p>
              )}
            </div>
            {leaving &&
              Array.from({ length: 14 }, (_, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="spark-up absolute bottom-1/3 h-1.5 w-1.5 rounded-full bg-paper"
                  style={{ left: `${8 + ((i * 37) % 84)}%`, boxShadow: `0 0 10px 3px ${hue}`, ["--sx" as string]: `${((i * 53) % 80) - 40}px`, ["--t" as string]: `${1.8 + (i % 5) * 0.3}s`, ["--d" as string]: `${0.3 + (i % 7) * 0.18}s` } as React.CSSProperties}
                />
              ))}
          </div>
        </div>
      )}

      {(step === "kept" || step === "released") && (
        <div className="relative animate-rise py-6 text-center">
          <span className="mx-auto block h-14 w-14 animate-breathe rounded-full" style={{ background: `radial-gradient(circle at 35% 30%, #fff, ${hue} 70%)`, boxShadow: `0 0 40px 10px ${hue}77` }} aria-hidden />
          <p className="mx-auto mt-6 max-w-md font-serif text-[22px] leading-snug sm:text-[25px]">{step === "kept" ? m.kept : m.released}</p>
          <div className="mt-6">
            <StartForm prompt={m.prompt(who, t.name)} className={nightPrimary}>
              {m.talk}
            </StartForm>
          </div>
          <button type="button" onClick={restart} className={`${nightGhost} mt-5`}>
            {m.again}
          </button>
        </div>
      )}

      {crisis && (
        <div className="relative mt-5 rounded-[24px] bg-paper">
          <CrisisHelp />
        </div>
      )}
    </Night>
  );
}
