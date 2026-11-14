import { DREAMERS, type Dreamer } from "@/lib/dreams";

// Маленький портрет «Сновидца»: тот же герой, которого художник рисует в кадрах.
export function DreamerFigure({ dreamer, size = 56 }: { dreamer: Dreamer; size?: number }) {
  const d = DREAMERS[dreamer];
  return (
    <svg viewBox="0 0 56 56" width={size} height={size} aria-hidden>
      <circle cx="28" cy="28" r="28" fill="#EEEAF8" />
      <path d="M8 56c1-13 9-19 20-19s19 6 20 19z" fill={d.outfit} />
      <rect x="24" y="31" width="8" height="8" rx="3" fill={d.skin} />
      <circle cx="28" cy="23" r="11" fill={d.skin} />
      {dreamer === "mint" && <path d="M16 25c-2-12 5-17 12-17s14 5 12 17c-1-6-4-9-12-9s-11 3-12 9z" fill={d.hair} />}
      {dreamer === "peach" && <path d="M15 34c-4-16 3-26 13-26s17 10 13 26c-1-9-2-16-13-16s-12 7-13 16z" fill={d.hair} />}
      {dreamer === "violet" && (
        <g fill={d.hair}>
          <circle cx="20" cy="14" r="5" /><circle cx="28" cy="11" r="5.5" /><circle cx="36" cy="14" r="5" /><circle cx="17" cy="20" r="4" /><circle cx="39" cy="20" r="4" />
        </g>
      )}
      {dreamer === "gold" && (
        <>
          <path d="M17 23c-1-10 5-15 11-15s12 5 11 15c-2-5-5-7-11-7s-9 2-11 7z" fill={d.hair} />
          <path d="M39 14c5 2 7 8 4 15-1-5-3-8-6-10z" fill={d.hair} />
          <g fill="none" stroke="#2B2838" strokeWidth="1.2"><circle cx="23.5" cy="24" r="3.6" /><circle cx="32.5" cy="24" r="3.6" /><path d="M27.1 24h1.8" /></g>
        </>
      )}
      <circle cx="24" cy="24" r="1.1" fill="#2B2838" />
      <circle cx="32" cy="24" r="1.1" fill="#2B2838" />
      <path d="M25 28.5c2 1.6 4 1.6 6 0" fill="none" stroke="#2B2838" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="21" cy="27.5" r="1.8" fill="#F4B9A0" opacity=".7" />
      <circle cx="35" cy="27.5" r="1.8" fill="#F4B9A0" opacity=".7" />
    </svg>
  );
}
