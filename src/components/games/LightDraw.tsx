"use client";

import { useEffect, useRef, useState } from "react";

const COLORS = ["#8fa8bf", "#b9aed6", "#9db894", "#d8b98f", "#7f71a8"];

// Рисование светом: линии светятся и медленно растворяются. Режим «мандала» повторяет штрих по кругу.
export function LightDraw() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mandala, setMandala] = useState(true);
  const mandalaRef = useRef(true);
  const last = useRef<{ x: number; y: number } | null>(null);
  const hue = useRef(0);

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
      ctx.fillStyle = "#fbf8f3";
      ctx.fillRect(0, 0, r.width, r.height);
      if (copy) ctx.drawImage(copy, 0, 0, copy.width / dpr, copy.height / dpr);
      c.dataset.ready = "1";
    };
    resize();
    window.addEventListener("resize", resize);
    let raf = 0;
    const fade = () => {
      const r = c.getBoundingClientRect();
      ctx.fillStyle = "rgba(251, 248, 243, 0.014)";
      ctx.fillRect(0, 0, r.width, r.height);
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
      ctx.shadowBlur = 14;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
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
    ctx.fillStyle = "#fbf8f3";
    ctx.fillRect(0, 0, r.width, r.height);
  };

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
        aria-label="Холст для рисования"
      />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full bg-sand/70 p-1 text-sm">
          {[
            [true, "Мандала"],
            [false, "Свободно"],
          ].map(([v, l]) => (
            <button
              key={String(l)}
              onClick={() => setMandala(v as boolean)}
              aria-pressed={mandala === v}
              className={`rounded-full px-4 py-2 transition ${mandala === v ? "bg-paper text-ink shadow-soft" : "text-ink-soft"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <button onClick={clear} className="rounded-full px-4 py-2 text-sm text-ink-soft transition hover:bg-sand hover:text-ink">
          Очистить
        </button>
      </div>
      <p className="mt-3 px-2 text-sm text-ink-faint">Линии растворяются сами. Ничего не нужно сохранять или делать красиво.</p>
    </div>
  );
}
