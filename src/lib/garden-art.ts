import type { ItemType } from "./garden";

// Рисунки предметов сада в виде простых фигур, чтобы сайт (SVG) и приложение (react-native-svg)
// рисовали один и тот же сад. Начало координат — точка, где предмет стоит на песке.
export type Shape =
  | { k: "e"; cx: number; cy: number; rx: number; ry: number; fill: string; o?: number }
  | { k: "c"; cx: number; cy: number; r: number; fill: string; o?: number }
  | { k: "p"; d: string; fill?: string; stroke?: string; w?: number; o?: number };

const shadow = (rx: number, ry = rx * 0.32, dy = 4): Shape => ({ k: "e", cx: 4, cy: dy, rx, ry, fill: "#8a7556", o: 0.22 });

export function art(t: ItemType, grow = 0): Shape[] {
  switch (t) {
    case "stone":
      return [
        shadow(34),
        { k: "p", d: "M-32 0 C-34 -22 -14 -34 4 -32 C24 -30 36 -16 32 0 C20 8 -20 8 -32 0 Z", fill: "#8f8a84" },
        { k: "p", d: "M-20 -18 C-12 -28 4 -30 14 -24", stroke: "#b9b3ab", w: 4, o: 0.8 },
      ];
    case "boulder":
      return [
        shadow(64, 18, 6),
        { k: "p", d: "M-62 0 C-66 -40 -36 -78 2 -76 C40 -74 70 -44 62 0 C40 14 -40 14 -62 0 Z", fill: "#77726d" },
        { k: "p", d: "M-40 -40 C-26 -64 6 -70 28 -56", stroke: "#a39d96", w: 6, o: 0.7 },
        { k: "e", cx: 16, cy: -66, rx: 26, ry: 8, fill: "#7fa07a", o: 0.9 },
      ];
    case "moss":
      return [
        { k: "e", cx: 0, cy: -2, rx: 46, ry: 16, fill: "#7fa07a" },
        { k: "e", cx: -18, cy: -8, rx: 20, ry: 10, fill: "#93b58c" },
        { k: "e", cx: 16, cy: -10, rx: 18, ry: 9, fill: "#a7c69e" },
        { k: "c", cx: -2, cy: -12, r: 5, fill: "#c4dcb8" },
      ];
    case "lantern":
      return [
        shadow(26),
        { k: "p", d: "M-16 0 L-12 -24 L12 -24 L16 0 Z", fill: "#8b857e" },
        { k: "p", d: "M-22 -24 L22 -24 L18 -32 L-18 -32 Z", fill: "#9b958d" },
        { k: "p", d: "M-12 -32 L12 -32 L12 -58 L-12 -58 Z", fill: "#a29b92" },
        { k: "c", cx: 0, cy: -45, r: 9, fill: "#ffd59c" },
        { k: "c", cx: 0, cy: -45, r: 20, fill: "#ffd59c", o: 0.25 },
        { k: "p", d: "M-28 -58 L28 -58 L0 -80 Z", fill: "#7d776f" },
      ];
    case "sprout": {
      const h = [14, 28, 46, 66, 90][grow] ?? 14;
      const crown = [0, 10, 20, 32, 44][grow] ?? 0;
      const shapes: Shape[] = [shadow(14 + crown * 0.8, 6 + crown * 0.2), { k: "p", d: `M0 0 C2 ${-h * 0.4} -3 ${-h * 0.7} 0 ${-h}`, stroke: "#6b5a43", w: 3 + grow }];
      if (grow === 0) shapes.push({ k: "e", cx: 0, cy: -4, rx: 7, ry: 5, fill: "#a2875f" }, { k: "e", cx: 5, cy: -14, rx: 6, ry: 3, fill: "#93b58c" });
      else {
        shapes.push({ k: "e", cx: -crown * 0.5, cy: -h + 4, rx: crown * 0.8, ry: crown * 0.55, fill: "#7fa07a" });
        shapes.push({ k: "e", cx: crown * 0.5, cy: -h, rx: crown * 0.75, ry: crown * 0.5, fill: "#93b58c" });
        shapes.push({ k: "e", cx: 0, cy: -h - crown * 0.35, rx: crown * 0.7, ry: crown * 0.5, fill: "#a7c69e" });
      }
      return shapes;
    }
    case "bridge":
      return [
        shadow(80, 14, 8),
        { k: "p", d: "M-80 0 C-50 -46 50 -46 80 0", stroke: "#b5543d", w: 10 },
        { k: "p", d: "M-80 -16 C-50 -62 50 -62 80 -16", stroke: "#c86a52", w: 5 },
        { k: "p", d: "M-56 -12 L-56 -34 M-20 -26 L-20 -50 M20 -26 L20 -50 M56 -12 L56 -34", stroke: "#b5543d", w: 4 },
      ];
    case "bowl":
      return [
        shadow(40, 12, 6),
        { k: "e", cx: 0, cy: -10, rx: 40, ry: 16, fill: "#8f8a84" },
        { k: "e", cx: 0, cy: -14, rx: 32, ry: 11, fill: "#9ec4e6" },
        { k: "e", cx: -8, cy: -16, rx: 10, ry: 3, fill: "#e6f1fb", o: 0.8 },
      ];
    case "sakura":
      return [
        shadow(60, 14, 6),
        { k: "p", d: "M0 0 C-4 -30 6 -50 -2 -84 M-2 -60 C-20 -70 -30 -76 -38 -92 M0 -70 C16 -80 26 -90 30 -104", stroke: "#5e4a3a", w: 7 },
        { k: "c", cx: -36, cy: -98, r: 22, fill: "#f6c6d6" },
        { k: "c", cx: 30, cy: -108, r: 24, fill: "#f2b3c8" },
        { k: "c", cx: -4, cy: -118, r: 28, fill: "#f9d5e1" },
        { k: "c", cx: 8, cy: -90, r: 18, fill: "#f2b3c8", o: 0.9 },
        { k: "c", cx: 40, cy: -10, r: 3, fill: "#f6c6d6" },
        { k: "c", cx: -30, cy: -4, r: 2.5, fill: "#f2b3c8" },
      ];
    case "pebbles":
      return [
        { k: "e", cx: -16, cy: -3, rx: 10, ry: 6, fill: "#c9c1b5" },
        { k: "e", cx: 4, cy: -6, rx: 8, ry: 5, fill: "#b3aba0" },
        { k: "e", cx: 20, cy: -2, rx: 9, ry: 5.5, fill: "#d8d0c4" },
        { k: "e", cx: -2, cy: 4, rx: 7, ry: 4.5, fill: "#a59d92" },
      ];
    case "lotus":
      return [
        { k: "e", cx: 0, cy: -2, rx: 44, ry: 14, fill: "#7fa07a" },
        { k: "p", d: "M0 -6 C-10 -22 -6 -34 0 -40 C6 -34 10 -22 0 -6 Z", fill: "#f6c6d6" },
        { k: "p", d: "M-2 -6 C-20 -12 -26 -24 -24 -30 C-14 -28 -6 -20 -2 -6 Z", fill: "#f2b3c8" },
        { k: "p", d: "M2 -6 C20 -12 26 -24 24 -30 C14 -28 6 -20 2 -6 Z", fill: "#f2b3c8" },
        { k: "c", cx: 0, cy: -10, r: 4, fill: "#ffd59c" },
      ];
  }
}

// Размер предмета для попадания пальцем (радиус в единицах сцены) и высота над точкой опоры.
export const HIT: Record<ItemType, { r: number; up: number }> = {
  stone: { r: 40, up: 16 },
  boulder: { r: 70, up: 38 },
  moss: { r: 48, up: 8 },
  lantern: { r: 34, up: 40 },
  sprout: { r: 44, up: 40 },
  bridge: { r: 84, up: 28 },
  bowl: { r: 44, up: 12 },
  sakura: { r: 64, up: 70 },
  pebbles: { r: 32, up: 4 },
  lotus: { r: 46, up: 18 },
};

export const SCENE_W = 1000;
export const SCENE_H = 700;
// Координаты в сохранении 0–1000 по обеим осям; на сцене y сжимается до SCENE_H.
export const toScene = (x: number, y: number) => ({ x, y: (y / 1000) * SCENE_H });
export const fromScene = (x: number, y: number) => ({ x: Math.max(20, Math.min(980, x)), y: Math.max(60, Math.min(990, (y / SCENE_H) * 1000)) });
