// «Капля» — живой персонаж Опоры: мягкая форма, которая медленно перетекает, дышит
// и (по желанию) смотрит на человека. Цвет и выражение можно связать с настроением 1–5.

const MOODS: Record<number, [string, string, string]> = {
  1: ["#ffb79c", "#f6a6c6", "#c7b2f5"],
  2: ["#f6b8d8", "#c7b2f5", "#a9b4ff"],
  3: ["#a9b4ff", "#c7b2f5", "#ffc9b5"],
  4: ["#8fd3ff", "#a9b4ff", "#c7b2f5"],
  5: ["#9fe6c8", "#a9d4ff", "#c7b2f5"],
};

// Рот: от грустной дуги к улыбке.
const MOUTH: Record<number, string> = {
  1: "M38 66 Q50 58 62 66",
  2: "M39 64 Q50 61 61 64",
  3: "M40 63 Q50 68 60 63",
  4: "M38 62 Q50 71 62 62",
  5: "M36 61 Q50 74 64 61",
};

export function Orb({
  size = 160,
  className = "",
  still = false,
  face = false,
  mood = 3,
}: {
  size?: number;
  className?: string;
  still?: boolean;
  face?: boolean;
  mood?: number;
}) {
  const m = Math.min(5, Math.max(1, Math.round(mood)));
  const [a, b, c] = MOODS[m];
  const live = still ? "" : "animate-morph";
  return (
    <div className={`relative shrink-0 ${still ? "" : "animate-float"} ${className}`} style={{ width: size, height: size }} aria-hidden>
      {/* мягкое свечение под формой */}
      <div
        className={`absolute inset-[8%] opacity-60 blur-2xl ${live}`}
        style={{ background: `linear-gradient(135deg, ${a}, ${c})`, borderRadius: "50%" }}
      />
      <div
        className={`absolute inset-[6%] overflow-hidden ${live}`}
        style={{
          borderRadius: "58% 42% 46% 54% / 52% 44% 56% 48%",
          background: `linear-gradient(140deg, ${a} 0%, ${b} 52%, ${c} 100%)`,
          boxShadow: "inset -10px -14px 30px rgb(108 99 255 / 0.18), inset 10px 12px 26px rgb(255 255 255 / 0.55)",
          transition: "background 1.2s ease",
        }}
      >
        <div
          className="absolute left-[16%] top-[12%] h-[38%] w-[38%] rounded-full"
          style={{ background: "radial-gradient(closest-side, rgb(255 255 255 / 0.85), transparent)" }}
        />
      </div>
      {face && (
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <g className={still ? "" : "[animation:blink_5s_infinite] [transform-box:fill-box] [transform-origin:center]"}>
            <ellipse cx="40" cy="50" rx="3.4" ry="4" fill="#1d1e2c" />
            <ellipse cx="60" cy="50" rx="3.4" ry="4" fill="#1d1e2c" />
          </g>
          <path d={MOUTH[m]} stroke="#1d1e2c" strokeWidth="3" strokeLinecap="round" fill="none" style={{ transition: "d 0.6s ease" }} />
        </svg>
      )}
    </div>
  );
}
