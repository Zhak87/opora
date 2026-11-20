"use client";

import { useEffect, useRef, useState } from "react";
import { useMsg } from "@/i18n/client";
import { gardenMessages } from "@/i18n/game-garden";
import { chime } from "@/lib/chime";
import { vibrate } from "@/lib/practice-settings-client";
import { MAX_ITEMS, MAX_STROKES, cleanGarden, emptyGarden, growth, nextUnlock, offsetLine, simplify, smoothPath, tend, unlocked, UNLOCKS, type GardenItem, type GardenScene, type ItemType } from "@/lib/garden";
import { HIT, SCENE_H, SCENE_W, art, fromScene, toScene, type Shape } from "@/lib/garden-art";
import { useSynced } from "@/lib/use-synced";

type Tool = "rake" | "place";

// «Сад»: постоянное пространство. Сцена сохраняется в аккаунте и восстанавливается после выхода,
// предметы можно ставить и перетаскивать, а с каждым днём ухода открываются новые и подрастает росток.
export function ZenGarden() {
  const m = useMsg(gardenMessages);
  const { value, save, status } = useSynced<GardenScene>("garden", cleanGarden);
  const [scene, setScene] = useState<GardenScene | null>(null);
  const [tool, setTool] = useState<Tool>("rake");
  const [selected, setSelected] = useState<number | null>(null);
  const [opened, setOpened] = useState<ItemType[]>([]);
  const [drawing, setDrawing] = useState<number[] | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const tended = useRef(false);

  // Сад открывается с сохранённой сценой; первый заход за день отмечается как день ухода.
  useEffect(() => {
    // Ждём сверки с аккаунтом, чтобы старая копия этого устройства не перезаписала сад, выращенный в приложении.
    if (status === "loading") return;
    if (tended.current) return;
    tended.current = true;
    const base = value ?? emptyGarden();
    const r = tend(base);
    setScene(r.scene);
    if (r.opened.length) {
      setOpened(r.opened);
      chime(84, 0.05);
    }
    if (r.scene !== base || !value) save(r.scene, true);
  }, [value, status, save]);

  const update = (next: GardenScene, now = false) => {
    setScene(next);
    save(next, now);
  };

  const point = (e: { clientX: number; clientY: number }) => {
    const box = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - box.left) / box.width) * SCENE_W, y: ((e.clientY - box.top) / box.height) * SCENE_H };
  };

  if (!scene) return <div className="aspect-[10/7] w-full animate-pulse rounded-[30px] bg-[#efe6d6]" aria-label={m.canvas} />;

  const open = unlocked(scene.care);
  const next = nextUnlock(scene.care);
  const grow = growth(scene.care);
  const sel = scene.items.find((i) => i.id === selected) ?? null;

  const addItem = (t: ItemType) => {
    if (scene.items.length >= MAX_ITEMS) return;
    const id = Math.max(0, ...scene.items.map((i) => i.id)) + 1;
    const n = scene.items.length;
    const item: GardenItem = { id, t, x: 380 + ((n * 137) % 260), y: 420 + ((n * 89) % 300), r: 0 };
    update({ ...scene, items: [...scene.items, item] });
    setSelected(id);
    chime(76, 0.04);
    vibrate(10);
  };
  const move = (id: number, x: number, y: number) => setScene((s) => (s ? { ...s, items: s.items.map((i) => (i.id === id ? { ...i, x: Math.round(x), y: Math.round(y) } : i)) } : s));
  const commit = () => scene && save(scene);
  const rotate = (id: number) => update({ ...scene, items: scene.items.map((i) => (i.id === id ? { ...i, r: (((i.r ?? 0) + 30 + 180) % 360) - 180 } : i)) });
  const remove = (id: number) => {
    update({ ...scene, items: scene.items.filter((i) => i.id !== id) });
    setSelected(null);
  };

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (tool !== "rake") {
      setSelected(null);
      return;
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = point(e);
    setDrawing([p.x, p.y]);
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = point(e);
    if (drag.current) {
      const s = fromScene(p.x - drag.current.dx, p.y - drag.current.dy);
      move(drag.current.id, s.x, s.y);
      return;
    }
    if (drawing) {
      const n = drawing.length;
      if (Math.hypot(p.x - drawing[n - 2], p.y - drawing[n - 1]) < 6) return;
      setDrawing([...drawing, p.x, p.y]);
    }
  };
  const onUp = () => {
    if (drag.current) {
      drag.current = null;
      commit();
      return;
    }
    if (drawing && drawing.length >= 6) {
      // В сохранении y 0–1000, на сцене 0–SCENE_H.
      const stored = simplify(drawing).map((v, i) => (i % 2 ? Math.round((v / SCENE_H) * 1000) : Math.round(v)));
      update({ ...scene, rake: [...scene.rake, stored].slice(-MAX_STROKES) });
      chime(60 + Math.floor(Math.random() * 6), 0.025);
    }
    setDrawing(null);
  };

  const onItemDown = (e: React.PointerEvent, item: GardenItem) => {
    if (tool !== "place") return;
    e.stopPropagation();
    (svg.current as Element).setPointerCapture?.(e.pointerId);
    const p = point(e);
    const at = toScene(item.x, item.y);
    drag.current = { id: item.id, dx: p.x - at.x, dy: p.y - at.y };
    setSelected(item.id);
    vibrate(8);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!sel) return;
    const step = e.shiftKey ? 40 : 12;
    const k = e.key;
    if (k === "ArrowLeft" || k === "ArrowRight" || k === "ArrowUp" || k === "ArrowDown") {
      e.preventDefault();
      const dx = k === "ArrowLeft" ? -step : k === "ArrowRight" ? step : 0;
      const dy = k === "ArrowUp" ? -step : k === "ArrowDown" ? step : 0;
      update({ ...scene, items: scene.items.map((i) => (i.id === sel.id ? { ...i, x: Math.max(20, Math.min(980, i.x + dx)), y: Math.max(60, Math.min(990, i.y + dy)) } : i)) });
    } else if (k === "r" || k === "R" || k === "к" || k === "К") rotate(sel.id);
    else if (k === "Delete" || k === "Backspace") remove(sel.id);
  };

  // Рисуем снизу вверх: дальние предметы раньше ближних.
  const items = [...scene.items].sort((a, b) => a.y - b.y);
  const strokes = scene.rake.map((s) => s.map((v, i) => (i % 2 ? (v / 1000) * SCENE_H : v)));
  if (drawing) strokes.push(drawing);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full bg-sand/80 p-1" role="tablist">
          {(["rake", "place"] as Tool[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tool === t}
              onClick={() => {
                setTool(t);
                setSelected(null);
              }}
              className={`rounded-full px-5 py-2 text-sm transition ${tool === t ? "bg-paper text-ink shadow-soft" : "text-ink-soft"}`}
            >
              {t === "rake" ? m.rake : m.place}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-ink-soft">
          {m.day(scene.care)} · <span className="text-ink-faint">{status === "saving" ? m.saving : status === "local" ? m.savedLocal : m.saved}</span>
        </p>
      </div>

      {opened.length > 0 && (
        <p className="animate-rise rounded-[20px] bg-sage-soft px-4 py-3 text-[14.5px] text-ink" role="status">
          {m.opened(opened.map((t) => m.items[t].toLowerCase()).join(", "))}
        </p>
      )}

      <div className="relative overflow-hidden rounded-[30px] shadow-soft">
        <svg
          ref={svg}
          viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
          className={`block w-full touch-none select-none ${tool === "rake" ? "cursor-crosshair" : "cursor-default"}`}
          role="application"
          aria-label={m.canvas}
          tabIndex={0}
          onKeyDown={onKey}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={() => drawing && onUp()}
        >
          <defs>
            <linearGradient id="gd-sand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f4ecdd" />
              <stop offset="1" stopColor="#e7dbc4" />
            </linearGradient>
            <filter id="gd-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
              <feColorMatrix values="0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0 0.32  0 0 0 0.10 0" />
              <feComposite in2="SourceGraphic" operator="in" />
            </filter>
          </defs>
          <rect width={SCENE_W} height={SCENE_H} fill="url(#gd-sand)" />
          <rect width={SCENE_W} height={SCENE_H} fill="#fff" filter="url(#gd-grain)" />
          {strokes.map((p, i) => (
            <g key={i} fill="none" strokeLinecap="round" strokeLinejoin="round">
              {[-21, -7, 7, 21].map((o) => (
                <g key={o}>
                  <path d={smoothPath(offsetLine(p, o))} stroke="#a58d68" strokeOpacity={0.28} strokeWidth={4} />
                  <path d={smoothPath(offsetLine(p, o + 2.5))} stroke="#fffaf0" strokeOpacity={0.7} strokeWidth={1.8} />
                </g>
              ))}
            </g>
          ))}
          {items.map((item) => {
            const at = toScene(item.x, item.y);
            const on = item.id === selected;
            return (
              <g
                key={item.id}
                transform={`translate(${at.x} ${at.y}) rotate(${item.r ?? 0})`}
                onPointerDown={(e) => onItemDown(e, item)}
                style={{ cursor: tool === "place" ? "grab" : undefined, pointerEvents: tool === "place" ? "auto" : "none" }}
                aria-label={m.items[item.t]}
              >
                {on && <ellipse cx={0} cy={-HIT[item.t].up / 2} rx={HIT[item.t].r + 8} ry={HIT[item.t].r * 0.6 + 8} fill="none" stroke="#6C63FF" strokeWidth={3} strokeDasharray="8 7" opacity={0.8} />}
                <circle cx={0} cy={-HIT[item.t].up} r={HIT[item.t].r} fill="transparent" />
                <Art shapes={art(item.t, grow)} />
              </g>
            );
          })}
        </svg>
        {sel && tool === "place" && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-paper/95 p-1.5 shadow-lift">
            <button type="button" onClick={() => rotate(sel.id)} className="rounded-full px-4 py-2 text-[14px] text-ink hover:bg-sand">
              {m.rotate}
            </button>
            <button type="button" onClick={() => remove(sel.id)} className="rounded-full px-4 py-2 text-[14px] text-ink hover:bg-sand">
              {m.remove}
            </button>
            <button type="button" onClick={() => setSelected(null)} className="rounded-full bg-ink px-4 py-2 text-[14px] text-paper">
              {m.done}
            </button>
          </div>
        )}
      </div>

      {tool === "place" ? (
        <div>
          <p className="text-[13.5px] text-ink-soft">{m.placeNote}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {UNLOCKS.map(({ t, day }) => {
              const can = open.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!can || scene.items.length >= MAX_ITEMS}
                  onClick={() => addItem(t)}
                  className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-[13.5px] transition ${can ? "bg-paper text-ink shadow-soft hover:-translate-y-0.5" : "bg-sand/50 text-ink-faint"}`}
                >
                  <svg viewBox="-60 -90 120 110" className="h-8 w-8 rounded-full bg-[#efe6d6]" aria-hidden>
                    <g transform={t === "bridge" || t === "boulder" || t === "sakura" ? "scale(0.6)" : undefined} opacity={can ? 1 : 0.35}>
                      <Art shapes={art(t, Math.max(1, grow))} />
                    </g>
                  </svg>
                  {m.items[t]}
                  {!can && <span className="text-[11.5px]">· {m.locked(day)}</span>}
                </button>
              );
            })}
          </div>
          {scene.items.length >= MAX_ITEMS && <p className="mt-2 text-[13px] text-ink-soft">{m.full}</p>}
          <p className="mt-3 text-[12.5px] text-ink-faint">{m.keys}</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13.5px] text-ink-soft">{m.note}</p>
          <button type="button" onClick={() => update({ ...scene, rake: [] })} className="rounded-full bg-sand/80 px-4 py-2 text-[14px] text-ink hover:bg-sand-deep">
            {m.smooth}
          </button>
        </div>
      )}

      <div className="rounded-[22px] bg-paper/70 p-4 text-[13.5px] leading-snug text-ink-soft">
        <p>{next ? m.nextIn(m.items[next.t], next.day - scene.care) : m.allOpen}</p>
        {scene.items.some((i) => i.t === "sprout") && <p className="mt-1">{m.items.sprout}: {m.grow[grow]}</p>}
        <p className="mt-1 text-ink-faint">{m.noLoss}</p>
      </div>
    </div>
  );
}

export function Art({ shapes }: { shapes: Shape[] }) {
  return (
    <>
      {shapes.map((s, i) =>
        s.k === "e" ? (
          <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={s.fill} opacity={s.o} />
        ) : s.k === "c" ? (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} opacity={s.o} />
        ) : (
          <path key={i} d={s.d} fill={s.fill ?? "none"} stroke={s.stroke} strokeWidth={s.w} strokeLinecap="round" opacity={s.o} />
        ),
      )}
    </>
  );
}
