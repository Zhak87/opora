"use client";

import { useEffect, useRef, useState } from "react";
import { chime } from "@/lib/chime";

const SAND = "#efe6d6";

// Сад камней: граблями рисуются бороздки на песке, касанием кладутся камни.
export function ZenGarden() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<"rake" | "stone">("rake");
  const last = useRef<{ x: number; y: number } | null>(null);

  const paintSand = () => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const r = c.getBoundingClientRect();
    ctx.fillStyle = SAND;
    ctx.fillRect(0, 0, r.width, r.height);
    // Лёгкая зернистость песка.
    for (let i = 0; i < (r.width * r.height) / 60; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.35)" : "rgba(150,125,90,0.08)";
      ctx.fillRect(Math.random() * r.width, Math.random() * r.height, 1.2, 1.2);
    }
  };

  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    // На телефоне размер окна меняется при прокрутке (панель браузера), поэтому рисунок сохраняем.
    const resize = () => {
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (c.width === Math.round(r.width * dpr) && c.height === Math.round(r.height * dpr)) return;
      const had = c.width > 0 && c.dataset.ready === "1";
      const copy = had ? document.createElement("canvas") : null;
      if (copy) {
        copy.width = c.width;
        copy.height = c.height;
        copy.getContext("2d")!.drawImage(c, 0, 0);
      }
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintSand();
      if (copy) ctx.drawImage(copy, 0, 0, copy.width / dpr, copy.height / dpr);
      c.dataset.ready = "1";
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const rake = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const ctx = canvas.current!.getContext("2d")!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    ctx.lineCap = "round";
    for (let k = -2; k <= 2; k++) {
      const o = k * 7;
      // Тень бороздки и светлый край создают объём.
      ctx.strokeStyle = "rgba(140,115,80,0.22)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(a.x + nx * o, a.y + ny * o);
      ctx.lineTo(b.x + nx * o, b.y + ny * o);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a.x + nx * (o + 2), a.y + ny * (o + 2));
      ctx.lineTo(b.x + nx * (o + 2), b.y + ny * (o + 2));
      ctx.stroke();
    }
  };

  const stone = (p: { x: number; y: number }) => {
    const ctx = canvas.current!.getContext("2d")!;
    const r = 14 + Math.random() * 16;
    // Круги на песке вокруг камня.
    ctx.lineWidth = 2;
    for (let k = 1; k <= 3; k++) {
      ctx.strokeStyle = "rgba(140,115,80,0.18)";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r + k * 9, (r + k * 9) * 0.82, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.4, r * 0.1, p.x, p.y, r);
    const tones = [["#a7a39c", "#6f6b66"], ["#b5ab9c", "#7a7066"], ["#9aa4a6", "#646d70"]][Math.floor(Math.random() * 3)];
    g.addColorStop(0, tones[0]);
    g.addColorStop(1, tones[1]);
    ctx.save();
    ctx.shadowColor = "rgba(60,50,35,0.35)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 0.8, Math.random(), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    chime(57 + Math.floor(Math.random() * 3) * 5, 0.06);
  };

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div>
      <canvas
        ref={canvas}
        className="h-[440px] w-full touch-none rounded-[32px] border border-line/70 shadow-soft sm:h-[520px]"
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture(e.pointerId);
          const p = point(e);
          if (tool === "stone") return stone(p);
          last.current = p;
        }}
        onPointerMove={(e) => {
          if (!last.current) return;
          const p = point(e);
          if (Math.hypot(p.x - last.current.x, p.y - last.current.y) < 3) return;
          rake(last.current, p);
          last.current = p;
        }}
        onPointerUp={() => (last.current = null)}
        onPointerCancel={() => (last.current = null)}
        aria-label="Песок сада камней"
      />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full bg-sand/70 p-1 text-sm">
          {(
            [
              ["rake", "Грабли"],
              ["stone", "Камни"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTool(v)}
              aria-pressed={tool === v}
              className={`rounded-full px-4 py-2 transition ${tool === v ? "bg-paper text-ink shadow-soft" : "text-ink-soft"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <button onClick={paintSand} className="rounded-full px-4 py-2 text-sm text-ink-soft transition hover:bg-sand hover:text-ink">
          Разгладить песок
        </button>
      </div>
      <p className="mt-3 px-2 text-sm text-ink-faint">Ведите медленно, как будто дышите вместе с линией. Ровно не обязательно.</p>
    </div>
  );
}
