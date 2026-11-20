// Сборка всего комикса в одну картинку PNG прямо в браузере: заголовок, кадры сеткой 2×2,
// подписи словами человека и маленькая подпись «Опора». Картинки берутся со своего адреса,
// поэтому холст не «загрязняется» чужим источником и его можно сохранить.

import { NIGHT } from "@/lib/dreams";

export type ExportPanel = { src: string | null; caption: string; scene: string; from: string; to: string };

const W = 1600;
const PAD = 64;
const GAP = 40;
const COL = (W - PAD * 2 - GAP) / 2;
const ROW = Math.round((COL * 5) / 4);
const HEAD = 190;
const FOOT = 110;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return fetch(src, { credentials: "same-origin" })
    .then((r) => (r.ok ? r.blob() : null))
    .then(
      (blob) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          if (!blob) return resolve(null);
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = URL.createObjectURL(blob);
        }),
    )
    .catch(() => null);
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else line = next;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[\s,.;:]+$/, "")}…`;
  return lines;
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

export async function composeComic(opts: { title: string; date: string; brand: string; panels: ExportPanel[]; sans: string; serif: string }): Promise<Blob> {
  const panels = opts.panels.slice(0, 4);
  const rows = Math.ceil(panels.length / 2);
  const H = HEAD + rows * ROW + (rows - 1) * GAP + FOOT;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Ночное небо со звёздами.
  const sky = ctx.createLinearGradient(0, 0, W * 0.4, H);
  sky.addColorStop(0, NIGHT.sky);
  sky.addColorStop(1, NIGHT.violet);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  ctx.fillStyle = NIGHT.cream;
  for (let i = 0; i < 90; i++) {
    ctx.globalAlpha = 0.25 + rand() * 0.5;
    ctx.beginPath();
    ctx.arc(rand() * W, rand() * H, rand() * 2 + 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = NIGHT.gold;
  ctx.beginPath();
  ctx.arc(W - PAD - 40, 92, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = NIGHT.sky;
  ctx.beginPath();
  ctx.arc(W - PAD - 56, 82, 32, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = NIGHT.cream;
  ctx.textBaseline = "alphabetic";
  ctx.font = `500 58px ${opts.serif}`;
  ctx.fillText(wrap(ctx, opts.title, W - PAD * 2 - 140, 1)[0] ?? "", PAD, 112);
  ctx.globalAlpha = 0.7;
  ctx.font = `400 28px ${opts.sans}`;
  ctx.fillText(opts.date, PAD, 156);
  ctx.globalAlpha = 1;

  const images = await Promise.all(panels.map((p) => (p.src ? loadImage(p.src) : Promise.resolve(null))));

  panels.forEach((p, i) => {
    const row = Math.floor(i / 2);
    const lastAlone = panels.length % 2 === 1 && i === panels.length - 1;
    const x = lastAlone ? (W - COL) / 2 : PAD + (i % 2) * (COL + GAP);
    const y = HEAD + row * (ROW + GAP);
    ctx.save();
    rounded(ctx, x, y, COL, ROW, 30);
    ctx.clip();
    const img = images[i];
    if (img) cover(ctx, img, x, y, COL, ROW);
    else {
      const g = ctx.createLinearGradient(x, y, x + COL * 0.5, y + ROW);
      g.addColorStop(0, p.from);
      g.addColorStop(1, p.to);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, COL, ROW);
      ctx.fillStyle = "rgba(251,247,240,0.92)";
      ctx.font = `400 34px ${opts.sans}`;
      wrap(ctx, p.scene, COL - 100, 6).forEach((l, j) => {
        const w = ctx.measureText(l).width;
        ctx.fillText(l, x + (COL - w) / 2, y + ROW * 0.3 + j * 46);
      });
    }
    ctx.restore();
    ctx.lineWidth = 6;
    ctx.strokeStyle = NIGHT.sky;
    rounded(ctx, x, y, COL, ROW, 30);
    ctx.stroke();

    // Номер кадра.
    ctx.fillStyle = NIGHT.cream;
    ctx.beginPath();
    ctx.arc(x + 44, y + 44, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = NIGHT.sky;
    ctx.font = `600 26px ${opts.sans}`;
    const n = String(i + 1);
    ctx.fillText(n, x + 44 - ctx.measureText(n).width / 2, y + 53);

    // Подпись: дословные слова человека.
    if (p.caption) {
      ctx.font = `400 30px ${opts.sans}`;
      const lines = wrap(ctx, `«${p.caption}»`, COL - 84, 3);
      const bh = lines.length * 40 + 34;
      ctx.fillStyle = "rgba(251,247,240,0.95)";
      rounded(ctx, x + 22, y + ROW - bh - 22, COL - 44, bh, 22);
      ctx.fill();
      ctx.fillStyle = NIGHT.graphite;
      lines.forEach((l, j) => ctx.fillText(l, x + 42, y + ROW - bh - 22 + 46 + j * 40));
    }
  });

  ctx.fillStyle = NIGHT.cream;
  ctx.globalAlpha = 0.75;
  ctx.font = `500 28px ${opts.sans}`;
  const brand = `${opts.brand} · myopora.kz`;
  ctx.fillText(brand, (W - ctx.measureText(brand).width) / 2, H - FOOT / 2 + 8);
  ctx.globalAlpha = 1;

  images.forEach((img) => img && URL.revokeObjectURL(img.src));
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png"));
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
