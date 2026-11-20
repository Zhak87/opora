// «Сад»: постоянное пространство человека. Сцена хранится в аккаунте (practice_state, ключ garden)
// и одинаково открывается на сайте и в приложении. Координаты нормированы 0–1000, чтобы сцена
// не зависела от размера экрана.
//
// Развитие без наказания за пропуски: считаются дни, когда человек заходил в сад (не подряд).
// С каждым таким днём открываются новые предметы, а растения подрастают. Ничего не вянет и не пропадает.

export type ItemType = "stone" | "boulder" | "moss" | "lantern" | "sprout" | "bridge" | "bowl" | "sakura" | "pebbles" | "lotus";

export type GardenItem = { id: number; t: ItemType; x: number; y: number; r?: number };
// Бороздки граблями: ломаные с точками [x, y, x, y, …] в тех же координатах.
export type GardenScene = { v: 1; items: GardenItem[]; rake: number[][]; days: string[]; care: number };

export const MAX_ITEMS = 40;
export const MAX_STROKES = 60;
export const MAX_POINTS = 80;

// На какой день ухода открывается предмет. Первые три есть сразу.
export const UNLOCKS: { t: ItemType; day: number }[] = [
  { t: "stone", day: 0 },
  { t: "boulder", day: 0 },
  { t: "moss", day: 0 },
  { t: "sprout", day: 1 },
  { t: "lantern", day: 2 },
  { t: "pebbles", day: 3 },
  { t: "bowl", day: 4 },
  { t: "bridge", day: 6 },
  { t: "lotus", day: 8 },
  { t: "sakura", day: 10 },
];

export const ITEM_TYPES = UNLOCKS.map((u) => u.t);

export function emptyGarden(): GardenScene {
  return {
    v: 1,
    items: [
      { id: 1, t: "boulder", x: 640, y: 420, r: 0 },
      { id: 2, t: "stone", x: 300, y: 620, r: 20 },
    ],
    rake: [],
    days: [],
    care: 0,
  };
}

export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Отметить день ухода. Возвращает новую сцену и предметы, которые открылись сегодня.
export function tend(scene: GardenScene, day = today()): { scene: GardenScene; opened: ItemType[] } {
  if (scene.days.includes(day)) return { scene, opened: [] };
  const care = scene.care + 1;
  const opened = UNLOCKS.filter((u) => u.day > scene.care && u.day <= care).map((u) => u.t);
  return { scene: { ...scene, care, days: [...scene.days, day].slice(-60) }, opened };
}

export const unlocked = (care: number) => UNLOCKS.filter((u) => u.day <= care).map((u) => u.t);
export const nextUnlock = (care: number) => UNLOCKS.find((u) => u.day > care) ?? null;

// Как подрос росток: 0 — семечко, 4 — маленькое дерево. Растёт от дней ухода после открытия.
export function growth(care: number) {
  const since = Math.max(0, care - 1);
  return Math.min(4, Math.floor(since / 2));
}

const clamp = (n: unknown, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));

export function cleanGarden(value: unknown): GardenScene | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.items)) return null;
  const items = v.items
    .filter((i): i is GardenItem => !!i && typeof i === "object" && ITEM_TYPES.includes((i as GardenItem).t))
    .slice(0, MAX_ITEMS)
    .map((i, n) => ({ id: typeof i.id === "number" ? i.id : n + 1, t: i.t, x: clamp(i.x, 0, 1000), y: clamp(i.y, 0, 1000), r: clamp(i.r, -180, 180) }));
  const rake = Array.isArray(v.rake)
    ? v.rake
        .filter((s): s is number[] => Array.isArray(s))
        .slice(-MAX_STROKES)
        .map((s) => s.slice(0, MAX_POINTS * 2).map((n) => clamp(n, 0, 1000)))
        .filter((s) => s.length >= 4)
    : [];
  const days = Array.isArray(v.days) ? v.days.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-60) : [];
  const care = Math.max(clamp(v.care, 0, 10000), days.length);
  return { v: 1, items, rake, days, care };
}

// Упростить линию граблей: точки не ближе step друг к другу, не больше MAX_POINTS.
export function simplify(points: number[], step = 18): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    const x = points[i], y = points[i + 1];
    const n = out.length;
    if (n >= 2 && Math.hypot(x - out[n - 2], y - out[n - 1]) < step && i + 2 < points.length) continue;
    out.push(Math.round(x), Math.round(y));
  }
  if (out.length > MAX_POINTS * 2) {
    const k = Math.ceil(out.length / 2 / MAX_POINTS);
    const thin: number[] = [];
    for (let i = 0; i < out.length; i += 2 * k) thin.push(out[i], out[i + 1]);
    return thin;
  }
  return out;
}

// Гладкая кривая через точки (для SVG path): квадратичные сплайны по серединам отрезков.
export function smoothPath(p: number[], sx = 1, sy = 1): string {
  if (p.length < 4) return "";
  let d = `M${(p[0] * sx).toFixed(1)} ${(p[1] * sy).toFixed(1)}`;
  for (let i = 2; i + 3 < p.length; i += 2) {
    const mx = ((p[i] + p[i + 2]) / 2) * sx, my = ((p[i + 1] + p[i + 3]) / 2) * sy;
    d += ` Q${(p[i] * sx).toFixed(1)} ${(p[i + 1] * sy).toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const n = p.length;
  d += ` L${(p[n - 2] * sx).toFixed(1)} ${(p[n - 1] * sy).toFixed(1)}`;
  return d;
}

// Сдвиг линии на o единиц по нормали (для параллельных бороздок грабель).
export function offsetLine(p: number[], o: number): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < p.length; i += 2) {
    const ax = p[Math.max(0, i - 2)], ay = p[Math.max(1, i - 1)];
    const bx = p[Math.min(p.length - 2, i + 2)], by = p[Math.min(p.length - 1, i + 3)];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    out.push(p[i] + (-dy / len) * o, p[i + 1] + (dx / len) * o);
  }
  return out;
}
