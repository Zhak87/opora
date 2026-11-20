"use client";

import { useEffect, useRef, useState } from "react";
import { useMsg } from "@/i18n/client";
import { lightMessages } from "@/i18n/game-light";

const COLORS = ["#8db4ea", "#aaa4ff", "#7ccfaa", "#d8b98f", "#6c63ff"];
type Brush = "line" | "mist" | "stars";
type Fade = "fast" | "slow" | "never";
const FADE: Record<Fade, number> = { fast: 0.03, slow: 0.012, never: 0 };

// Рисование светом: линии светятся и медленно растворяются. Режим «мандала» повторяет штрих по кругу.
// После аудита: три кисти, управление исчезновением и сохранение понравившейся работы (PNG).
// Рисовать можно и без всякой цели: сохранять необязательно.
export function LightDraw() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mandala, setMandala] = useState(true);
  const mandalaRef = useRef(true);
  const last = useRef<{ x: number; y: number } | null>(null);
  const hue = useRef(0);
  const m = useMsg(lightMessages);
  const [brush, setBrush] = useState<Brush>("line");
  const [fadeMode, setFadeMode] = useState<Fade>("slow");
  const [savedPic, setSavedPic] = useState(false);
  const brushRef = useRef<Brush>("line");
  const fadeRef = useRef<Fade>("slow");
  brushRef.current = brush;
  fadeRef.current = fadeMode;

  useEffect(() => {
    mandalaRef.current = mandala;
  }, [mandala]);

  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    // На телефоне размер окна меняется при прокрутке (панель браузера), поэтому рисунок сохраняем.
    const resize = () => {
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (c.width === Math.round(r.width * dpr) && c.height === Math.round(r.height * dpr)) return;
      const had = c.dataset.ready === "1";
      const copy = had ? document.createElement("canvas") : null;
      if (copy) {
        copy.width = c.width;
        copy.height = c.height;
        copy.getContext("2d")!.drawImage(c, 0, 0);
      }
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#f3f4f8";
      ctx.fillRect(0, 0, r.width, r.height);
      if (copy) ctx.drawImage(copy, 0, 0, copy.width / dpr, copy.height / dpr);
      c.dataset.ready = "1";
    };
    resize();
    window.addEventListener("resize", resize);
    let raf = 0;
    const fade = () => {
      const a = FADE[fadeRef.current];
      if (a > 0) {
        const r = c.getBoundingClientRect();
        ctx.fillStyle = `rgba(243, 244, 248, ${a})`;
        ctx.fillRect(0, 0, r.width, r.height);
      }
      raf = requestAnimationFrame(fade);
    };
    raf = requestAnimationFrame(fade);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const r = c.getBoundingClientRect();
    const cx = r.width / 2;
    const cy = r.height / 2;
    hue.current = (hue.current + 0.02) % COLORS.length;
    const color = COLORS[Math.floor(hue.current)];
    const copies = mandalaRef.current ? 8 : 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < copies; i++) {
      ctx.save();
      if (copies > 1) {
        ctx.translate(cx, cy);
        ctx.rotate((i * Math.PI * 2) / copies);
        ctx.translate(-cx, -cy);
      }
      ctx.shadowColor = color;
      const b = brushRef.current;
      if (b === "stars") {
        // Россыпь светящихся точек вдоль движения.
        ctx.fillStyle = color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = 0.85;
        for (let k = 0; k < 2; k++) {
          const t = Math.random();
          const x = from.x + (to.x - from.x) * t + (Math.random() - 0.5) * 18;
          const y = from.y + (to.y - from.y) * t + (Math.random() - 0.5) * 18;
          ctx.beginPath();
          ctx.arc(x, y, 1 + Math.random() * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.shadowBlur = b === "mist" ? 28 : 14;
        ctx.strokeStyle = color;
        ctx.globalAlpha = b === "mist" ? 0.18 : 0.75;
        ctx.lineWidth = b === "mist" ? 26 : 3.5;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const clear = () => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const r = c.getBoundingClientRect();
    ctx.fillStyle = "#f3f4f8";
    ctx.fillRect(0, 0, r.width, r.height);
  };

  const savePicture = () => {
    try {
      const url = canvas.current!.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `opora-light-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setSavedPic(true);
      setTimeout(() => setSavedPic(false), 2500);
    } catch {}
  };

  const seg = (on: boolean) => `rounded-full px-3.5 py-1.5 transition ${on ? "bg-paper text-ink shadow-soft" : "text-ink-soft"}`;

  return (
    <div>
      <canvas
        ref={canvas}
        className="h-[440px] w-full touch-none rounded-[32px] border border-line/70 shadow-soft sm:h-[520px]"
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture(e.pointerId);
          last.current = point(e);
        }}
        onPointerMove={(e) => {
          if (!last.current) return;
          const p = point(e);
          stroke(last.current, p);
          last.current = p;
        }}
        onPointerUp={() => (last.current = null)}
        onPointerCancel={() => (last.current = null)}
        aria-label={m.canvas}
      />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full bg-sand/70 p-1 text-sm">
          {(
            [
              [true, m.mandala],
              [false, m.free],
            ] as const
          ).map(([v, l]) => (
            <button
              key={String(l)}
              onClick={() => setMandala(v)}
              aria-pressed={mandala === v}
              className={`rounded-full px-4 py-2 transition ${mandala === v ? "bg-paper text-ink shadow-soft" : "text-ink-soft"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex rounded-full bg-sand/70 p-1 text-sm">
          {(["line", "mist", "stars"] as Brush[]).map((b) => (
            <button key={b} type="button" onClick={() => setBrush(b)} aria-pressed={brush === b} className={seg(brush === b)}>
              {m.brushes[b]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center rounded-full bg-sand/70 p-1 text-sm" role="radiogroup" aria-label={m.fadeLabel}>
          <span className="px-3 text-ink-faint">{m.fadeLabel}</span>
          {(["fast", "slow", "never"] as Fade[]).map((f) => (
            <button key={f} type="button" role="radio" aria-checked={fadeMode === f} onClick={() => setFadeMode(f)} className={seg(fadeMode === f)}>
              {m.fades[f]}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={savePicture} className="rounded-full px-4 py-2 text-sm text-ink transition hover:bg-sand">
            {savedPic ? `✓ ${m.saved}` : m.save}
          </button>
          <button onClick={clear} className="rounded-full px-4 py-2 text-sm text-ink-soft transition hover:bg-sand hover:text-ink">
            {m.clear}
          </button>
        </div>
      </div>
      <p className="mt-3 px-2 text-sm text-ink-faint">{m.note}</p>
    </div>
  );
}
