// Ночная сцена практик: тёмное небо с мерцающими звёздами. Внутри рисуется сама игра.
const STARS: [number, number, number][] = [
  [8, 12, 3.4], [22, 30, 5.1], [36, 9, 4.2], [52, 20, 5.6], [68, 8, 3.8], [84, 18, 4.7],
  [93, 38, 5.3], [6, 52, 4.4], [16, 78, 3.9], [44, 90, 5.2], [74, 84, 4.1], [90, 70, 3.6],
];

export function Night({
  children,
  className = "",
  glow = "#6a4f96",
  label,
}: {
  children?: React.ReactNode;
  className?: string;
  glow?: string;
  label?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[36px] text-paper shadow-lift ${className}`}
      style={{ background: `radial-gradient(120% 90% at 50% 112%, ${glow} 0%, #2a2762 46%, #12133a 100%)`, transition: "background 1.2s" }}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {STARS.map(([x, y, t], i) => (
        <span
          key={i}
          aria-hidden
          className="twinkle absolute h-[3px] w-[3px] rounded-full bg-paper"
          style={{ left: `${x}%`, top: `${y}%`, ["--t" as string]: `${t}s`, ["--d" as string]: `${-i * 0.7}s` } as React.CSSProperties}
        />
      ))}
      {children}
    </div>
  );
}

// Поля ввода и кнопки поверх тёмной сцены.
export const nightInput =
  "w-full rounded-[20px] border border-paper/20 bg-paper/10 px-4 py-3 text-[15px] text-paper outline-none backdrop-blur placeholder:text-paper/45 focus:border-paper/50";
export const nightChip =
  "rounded-full border border-paper/20 bg-paper/10 px-3.5 py-2 text-[13.5px] text-paper/85 transition hover:bg-paper/20";
export const nightPrimary =
  "inline-flex h-12 items-center justify-center rounded-full bg-paper px-6 text-[15px] font-medium text-ink shadow-[0_0_30px_4px_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0";
export const nightGhost = "text-sm text-paper/60 underline-offset-4 transition hover:text-paper hover:underline";
