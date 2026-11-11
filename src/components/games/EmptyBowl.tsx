"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/i18n/client";
import { bowlMessages } from "@/i18n/game-bowl";
import { speech } from "@/lib/speech";
import { chime } from "@/lib/chime";
import { bowlStrike, drop } from "@/lib/sounds";
import { usePractice } from "./PracticeFlow";

type Phase = "setup" | "run" | "end";
type Thought = { x: number; lane: number; vx: number; r: number; color: string; phase: number; label?: string; born: number; held?: number; y?: number };
type SceneApi = { tap: (x: number, y: number) => boolean; name: (label: string) => void };

const COLORS = ["#aaa4ff", "#8db4ea", "#ffb79c", "#7ccfaa", "#c6b0d8", "#f2a7cb"];
const LANES = [0.17, 0.27, 0.37];

// Когда звучит каждая фраза голоса (секунды): четыре вступительные, средние поровну, две в конце.
function schedule(total: number, count: number) {
  const head = [0, 14, 34, 62];
  const tail = [total - 34, total - 11];
  const mids = count - head.length - tail.length;
  const from = 100;
  const to = total - 34 - 24;
  const middle = Array.from({ length: mids }, (_, i) => Math.round(from + ((to - from) * i) / Math.max(1, mids - 1)));
  return [...head, ...middle, ...tail];
}

const fmt = (s: number) => {
  const v = Math.max(0, Math.ceil(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
};

// «Пустая чаша»: чаша в центре, мысли-огоньки едут мимо по «дороге», голос ведёт практику.
// Со временем огоньков становится меньше и они медленнее, но это не оценка человека.
export function EmptyBowl() {
  const locale = useLocale();
  const m = bowlMessages[locale];
  const { finish, report, voice } = usePractice();
  const [phase, setPhase] = useState<Phase>("setup");
  const [minutes, setMinutes] = useState(5);
  const [voiceOn, setVoiceOn] = useState(true);
  const [eyes, setEyes] = useState(false);
  const [paused, setPaused] = useState(false);
  const [left, setLeft] = useState(0);
  const [caption, setCaption] = useState<number | null>(null);
  const [chips, setChips] = useState(false);
  const [noted, setNoted] = useState<Record<string, number>>({});
  const [ripple, setRipple] = useState(0);

  const total = useRef(300);
  const elapsed = useRef(0);
  const pausedRef = useRef(false);
  const progress = useRef(0);
  const spoken = useRef(-1);
  const times = useRef<number[]>([]);
  const scene = useRef<SceneApi | null>(null);
  const voiceRef = useRef(voiceOn);
  voiceRef.current = voiceOn;
  pausedRef.current = paused;

  const count = Object.values(noted).reduce((a, b) => a + b, 0);

  const say = useCallback(
    (i: number) => {
      setCaption(i);
      if (voiceRef.current) speech.speak(`bowl-${i}`, m.lines[i], voice, locale);
      const next = m.lines[i + 1];
      if (next && voiceRef.current) speech.prefetch(next, voice);
    },
    [m.lines, voice, locale],
  );

  const begin = () => {
    speech.unlock();
    total.current = minutes * 60;
    times.current = schedule(total.current, m.lines.length);
    elapsed.current = 0;
    spoken.current = -1;
    setNoted({});
    setLeft(total.current);
    setPhase("run");
    bowlStrike(0.11);
    if (voiceOn) {
      speech.prefetch(m.lines[0], voice);
      speech.prefetch(m.lines[1], voice);
    }
  };

  // Таймер практики: идёт, только пока не на паузе.
  useEffect(() => {
    if (phase !== "run") return;
    let raf = 0;
    let last = performance.now();
    let shown = -1;
    const tick = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (!pausedRef.current) elapsed.current += dt;
      const e = elapsed.current;
      progress.current = Math.min(1, e / total.current);
      const nextLine = spoken.current + 1;
      if (nextLine < times.current.length && e >= times.current[nextLine]) {
        spoken.current = nextLine;
        say(nextLine);
      }
      const sec = Math.ceil(total.current - e);
      if (sec !== shown) {
        shown = sec;
        setLeft(total.current - e);
      }
      if (e >= total.current) {
        bowlStrike(0.12);
        setPhase("end");
        setEyes(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, say]);

  // Подпись исчезает через десять секунд после фразы.
  useEffect(() => {
    if (caption === null) return;
    const t = setTimeout(() => setCaption(null), 11000);
    return () => clearTimeout(t);
  }, [caption]);

  // Экран не гаснет, пока идёт практика.
  useEffect(() => {
    if (phase !== "run") return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, [phase]);

  useEffect(() => () => speech.stop(), []);

  const togglePause = () => {
    if (!paused) speech.stop();
    setPaused(!paused);
  };

  const note = (label: string) => {
    scene.current?.name(label);
    setNoted((n) => ({ ...n, [label]: (n[label] ?? 0) + 1 }));
    setRipple((r) => r + 1);
    setChips(false);
    drop(0.05, 990);
    setTimeout(() => chime(67, 0.03), 380);
  };

  const more = () => {
    total.current += 60;
    times.current = [...times.current.slice(0, -2), total.current - 34, total.current - 11];
    spoken.current = Math.min(spoken.current, times.current.length - 3);
    setPhase("run");
  };

  const top = Object.entries(noted).sort((a, b) => b[1] - a[1])[0];

  // Итог для памяти: сколько мыслей человек заметил и какие приходили чаще.
  useEffect(() => {
    if (phase !== "end") return;
    const kinds = Object.entries(noted).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} (${n})`).join(", ");
    report(`${m.minutes(Math.max(1, Math.round(elapsed.current / 60)))}. ${m.counter(count)}${kinds ? `: ${kinds}` : ""}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div>
      <div
        className="relative h-[460px] w-full select-none overflow-hidden rounded-[36px] shadow-lift sm:h-[520px]"
        style={{ background: "linear-gradient(180deg, #12133a 0%, #252260 34%, #4b3a8c 62%, #9a6aa6 84%, #f0b49c 100%)" }}
        role="img"
        aria-label={m.aria}
        onPointerDown={(e) => {
          if (phase !== "run" || eyes) return;
          const box = e.currentTarget.getBoundingClientRect();
          // Касание самого огонька: «я заметил(а) эту мысль» — остаётся только назвать её.
          if (scene.current?.tap(e.clientX - box.left, e.clientY - box.top)) {
            setChips(true);
            drop(0.04, 1180);
          }
        }}
      >
        <Scene progress={progress} paused={pausedRef} running={phase !== "end"} api={scene} />

        <div className="pointer-events-none absolute inset-x-0 bottom-[42px] flex justify-center sm:bottom-[54px]">
          <Bowl ripple={ripple} />
        </div>

        {phase === "run" && (
          <>
            <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-4 text-[12.5px] text-paper/70">
              <span>{m.counter(count)}</span>
              <span className="tabular-nums">{m.left(fmt(left))}</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-paper/20">
              <div className="h-full bg-paper/70 transition-[width] duration-1000 ease-linear" style={{ width: `${(1 - left / total.current) * 100}%` }} />
            </div>
          </>
        )}

        {caption !== null && phase === "run" && (
          <p
            key={caption}
            className={`absolute inset-x-6 top-[41%] mx-auto max-w-md animate-rise text-center font-serif text-[18px] leading-snug sm:text-[20px] ${eyes ? "text-paper/80" : "text-paper drop-shadow-[0_2px_12px_rgba(18,19,58,0.9)]"}`}
            aria-live="polite"
          >
            {m.lines[caption]}
          </p>
        )}

        {phase === "setup" && (
          <div className="absolute inset-x-0 top-[44%] flex -translate-y-1/2 flex-col items-center px-6 text-center">
            <button
              type="button"
              onClick={begin}
              className="h-14 rounded-full bg-paper px-10 text-[16px] font-medium text-ink shadow-[0_0_40px_6px_rgba(255,255,255,0.35)] transition hover:-translate-y-0.5"
            >
              {m.begin}
            </button>
            <p className="mt-3 max-w-xs text-[13px] text-paper/70">{m.beginHint}</p>
          </div>
        )}

        {eyes && phase === "run" && (
          <button
            type="button"
            onClick={() => setEyes(false)}
            className="absolute inset-0 flex items-end justify-center bg-[#151628]/90 pb-10 text-[13px] text-paper/60 backdrop-blur-[2px] transition"
          >
            {m.eyesNote}
          </button>
        )}

        {phase === "end" && (
          <div className="absolute inset-0 flex items-center justify-center p-5">
            <div className="w-full max-w-md animate-rise rounded-[28px] bg-paper/75 p-6 text-center shadow-lift backdrop-blur-md">
              <h2 className="font-serif text-[24px] text-ink">{m.endTitle}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{m.endText(count)}</p>
              {top && count > 1 && <p className="mt-2 text-[14px] text-ink-soft">{m.often(top[0])}</p>}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button type="button" onClick={finish} className="h-12 rounded-full bg-ink px-6 text-[15px] text-paper shadow-soft transition hover:bg-lilac-deep">
                  {m.reflect}
                </button>
                <button type="button" onClick={more} className="h-12 rounded-full px-5 text-[15px] text-ink-soft transition hover:bg-sand hover:text-ink">
                  {m.more}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {phase === "setup" && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2" role="radiogroup" aria-label={m.duration}>
            <span className="mr-1 text-[13px] text-ink-faint">{m.duration}</span>
            {[3, 5, 7].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={minutes === n}
                onClick={() => setMinutes(n)}
                className={`rounded-full px-4 py-2 text-sm transition ${minutes === n ? "bg-ink text-paper shadow-soft" : "bg-paper/80 text-ink shadow-soft hover:bg-paper"}`}
              >
                {m.minutes(n)}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setVoiceOn(!voiceOn)} aria-pressed={voiceOn} className="flex items-center gap-2 text-[14px] text-ink-soft hover:text-ink">
            <span className={`relative h-6 w-10 rounded-full transition ${voiceOn ? "bg-lilac-deep" : "bg-sand-deep"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper shadow transition-all ${voiceOn ? "left-[18px]" : "left-0.5"}`} />
            </span>
            {voiceOn ? m.voiceOn : m.voiceOff}
          </button>
        </div>
      )}

      {phase === "run" && (
        <div className="mt-6 flex flex-col items-center">
          {chips ? (
            <div className="animate-rise text-center">
              <p className="mb-3 text-[13px] text-ink-faint">{m.noticeHint}</p>
              <div className="flex max-w-md flex-wrap justify-center gap-2">
                {m.kinds.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => note(k)}
                    className="rounded-full bg-paper px-4 py-2.5 text-[14px] text-ink shadow-soft transition hover:-translate-y-0.5 hover:bg-lilac-soft"
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setChips(true)}
              className="group flex h-16 items-center gap-3 rounded-full bg-paper pl-3 pr-7 text-[16px] text-ink shadow-lift transition hover:-translate-y-0.5"
            >
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-lilac-soft">
                <span className="h-3 w-3 animate-breathe rounded-full bg-lilac-deep shadow-[0_0_14px_4px_rgba(170,164,255,0.8)]" />
              </span>
              {m.notice}
            </button>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-1 text-[13.5px]">
            <button type="button" onClick={() => setEyes(true)} className="rounded-full px-4 py-2 text-ink-soft hover:bg-sand hover:text-ink">
              {m.eyes}
            </button>
            <button type="button" onClick={togglePause} className="rounded-full px-4 py-2 text-ink-soft hover:bg-sand hover:text-ink">
              {paused ? m.resume : m.pause}
            </button>
            <button type="button" onClick={() => setVoiceOn(!voiceOn)} className="rounded-full px-4 py-2 text-ink-soft hover:bg-sand hover:text-ink">
              {voiceOn ? m.voiceOff : m.voiceOn}
            </button>
            <button
              type="button"
              onClick={() => {
                speech.stop();
                bowlStrike(0.08);
                setPhase("end");
              }}
              className="rounded-full px-4 py-2 text-ink-soft hover:bg-sand hover:text-ink"
            >
              {m.endNow}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Чаша: керамика с мягким светом изнутри; при каждой замеченной мысли по краю расходится круг.
function Bowl({ ripple }: { ripple: number }) {
  return (
    <div className="relative h-[150px] w-[240px] sm:h-[170px] sm:w-[280px]">
      <span className="absolute left-1/2 top-[-70px] h-[230px] w-[320px] -translate-x-1/2 animate-breathe rounded-full bg-[radial-gradient(closest-side,rgba(255,244,225,0.85),rgba(255,214,190,0.35)_50%,transparent)]" />
      {ripple > 0 && (
        <span key={ripple} className="bowl-ripple absolute left-1/2 top-[26px] h-[44px] w-[200px] -translate-x-1/2 rounded-[50%] border-2 border-paper/90" />
      )}
      <svg viewBox="0 0 280 170" className="relative h-full w-full overflow-visible">
        <defs>
          <linearGradient id="bowl-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#efe9fb" />
            <stop offset="1" stopColor="#cfc8ec" />
          </linearGradient>
          <radialGradient id="bowl-inner" cx="0.5" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#fdfbff" />
            <stop offset="0.7" stopColor="#e5ddf6" />
            <stop offset="1" stopColor="#cdc3ea" />
          </radialGradient>
          <linearGradient id="bowl-shine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <ellipse cx="140" cy="158" rx="96" ry="10" fill="#12133a" opacity="0.35" />
        <path d="M22 48 C 30 128, 82 152, 140 152 C 198 152, 250 128, 258 48 Z" fill="url(#bowl-body)" />
        <path d="M62 116 C 90 140, 190 140, 218 116" stroke="url(#bowl-shine)" strokeWidth="3" fill="none" opacity="0.7" />
        <ellipse cx="140" cy="48" rx="118" ry="24" fill="url(#bowl-inner)" />
        <ellipse cx="140" cy="48" rx="118" ry="24" fill="none" stroke="#ffffff" strokeWidth="3" />
        <path d="M58 40 Q 140 22 222 40" stroke="#fff" strokeOpacity="0.8" strokeWidth="2" fill="none" />
      </svg>
    </div>
  );
}

// Огоньки мыслей: рисуются на canvas, чтобы десятки частиц двигались плавно и на слабых телефонах.
function Scene({
  progress,
  paused,
  running,
  api,
}: {
  progress: React.RefObject<number>;
  paused: React.RefObject<boolean>;
  running: boolean;
  api: React.RefObject<SceneApi | null>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const runningRef = useRef(running);
  runningRef.current = running;

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const g = el.getContext("2d");
    if (!g) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let W = 0;
    let H = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = el.clientWidth;
      H = el.clientHeight;
      el.width = W * dpr;
      el.height = H * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const thoughts: Thought[] = [];
    let t = 0;
    let nextSpawn = 0;
    const make = (label?: string, x = -30): Thought => ({
      x,
      lane: Math.floor(Math.random() * LANES.length),
      vx: (label ? 34 : 26 + Math.random() * 40) * (reduce ? 0.5 : 1),
      r: label ? 9 : 3 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      phase: Math.random() * Math.PI * 2,
      label,
      born: t,
    });
    // Сразу немного огоньков на дороге, чтобы сцена не была пустой.
    for (let i = 0; i < 7; i++) thoughts.push(make(undefined, Math.random() * 900));
    // Звёзды на небе: стоят на месте и мерцают.
    const stars = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random() * 0.62, r: 0.4 + Math.random() * 1.1, p: Math.random() * 6 }));
    let held: Thought | null = null;
    api.current = {
      // Нашли огонёк под пальцем: он останавливается и ждёт имени.
      tap(x, y) {
        let best: Thought | null = null;
        let bd = 44;
        for (const th of thoughts) {
          if (th.label) continue;
          const d = Math.hypot(th.x - x, (th.y ?? 0) - y);
          if (d < bd) {
            bd = d;
            best = th;
          }
        }
        if (!best) return false;
        if (held) held.held = undefined;
        held = best;
        best.held = t;
        best.r = Math.max(best.r, 8);
        return true;
      },
      name(label) {
        if (held) {
          held.label = label;
          held.held = undefined;
          held.vx = 34;
          held = null;
        } else thoughts.push(make(label));
      },
    };

    let raf = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = progress.current ?? 0;
      const still = paused.current || !runningRef.current;
      const speed = still ? 0.15 : 1 - 0.55 * p;
      t += dt * speed;
      g.clearRect(0, 0, W, H);

      for (const st of stars) {
        g.fillStyle = `rgba(255,255,255,${0.25 + 0.45 * (0.5 + 0.5 * Math.sin(now / 900 + st.p))})`;
        g.beginPath();
        g.arc(st.x * W, st.y * H, st.r, 0, Math.PI * 2);
        g.fill();
      }
      // «Дорога»: три почти невидимые полосы, по которым едут мысли.
      g.save();
      g.setLineDash([18, 26]);
      g.lineDashOffset = -t * 30;
      g.lineWidth = 1;
      for (const lane of LANES) {
        g.strokeStyle = "rgba(255, 255, 255, 0.09)";
        g.beginPath();
        g.moveTo(0, H * lane + 12);
        g.lineTo(W, H * lane + 12);
        g.stroke();
      }
      g.restore();

      if (!still && t >= nextSpawn) {
        thoughts.push(make());
        nextSpawn = t + 1.1 + 2.6 * p + Math.random() * 0.8;
      }

      for (let i = thoughts.length - 1; i >= 0; i--) {
        const th = thoughts[i];
        if (th.held === undefined) th.x += th.vx * dt * speed;
        const y = H * LANES[th.lane] + Math.sin(t * 0.8 + th.phase) * 7;
        th.y = y;
        if (th.held !== undefined) {
          // Замеченная мысль: вокруг неё расходится кольцо, пока человек выбирает, что это было.
          const k = ((now / 1000) % 1.4) / 1.4;
          g.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
          g.lineWidth = 1.5;
          g.beginPath();
          g.arc(th.x, y, th.r + 6 + k * 22, 0, Math.PI * 2);
          g.stroke();
        }
        const edge = Math.min(1, Math.max(0, Math.min(th.x + 30, W + 30 - th.x) / 90));
        // Отмеченная мысль медленно растворяется после середины пути.
        const fade = th.label ? Math.max(0, 1 - Math.max(0, th.x - W * 0.55) / (W * 0.4)) : 1;
        const a = edge * fade;
        if (th.x > W + 40 || (th.label && fade <= 0)) {
          thoughts.splice(i, 1);
          continue;
        }
        const glow = g.createRadialGradient(th.x, y, 0, th.x, y, th.r * 4);
        glow.addColorStop(0, hexA(th.color, 0.8 * a));
        glow.addColorStop(1, hexA(th.color, 0));
        g.fillStyle = glow;
        g.beginPath();
        g.arc(th.x, y, th.r * 4, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = `rgba(255,255,255,${0.9 * a})`;
        g.beginPath();
        g.arc(th.x, y, th.r * (th.label ? 0.75 : 0.6), 0, Math.PI * 2);
        g.fill();
        if (th.label) {
          g.font = "500 13px ui-sans-serif, system-ui, sans-serif";
          const w = g.measureText(th.label).width + 20;
          const lx = th.x + th.r + 8;
          const ly = y - 13;
          g.fillStyle = `rgba(255,255,255,${0.16 * a})`;
          g.beginPath();
          g.roundRect(lx, ly, w, 26, 13);
          g.fill();
          g.fillStyle = `rgba(255,255,255,${0.95 * a})`;
          g.fillText(th.label, lx + 10, ly + 17.5);
          // Искры, когда мысль растворяется.
          if (fade < 0.9) {
            for (let s = 0; s < 3; s++) {
              const ang = th.phase + s * 2.1 + t;
              const d = (1 - fade) * 26;
              g.fillStyle = hexA(th.color, 0.7 * fade);
              g.beginPath();
              g.arc(th.x + Math.cos(ang) * d, y + Math.sin(ang) * d, 1.6, 0, Math.PI * 2);
              g.fill();
            }
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      api.current = null;
    };
  }, [progress, paused, api]);

  return <canvas ref={canvas} className="absolute inset-0 h-full w-full touch-manipulation" aria-hidden />;
}

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}
