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

// Выражения маскота: по умолчанию спокойное лицо, рот которого следует за настроением.
export const EMOTIONS = ["calm", "joy", "wink", "care", "wow", "sleep"] as const;
export type Emotion = (typeof EMOTIONS)[number];

const INK = "#1d1e2c";
const line = { stroke: INK, strokeWidth: 3, strokeLinecap: "round" as const, fill: "none" };
const Dot = ({ x, big = false }: { x: number; big?: boolean }) => <ellipse cx={x} cy="50" rx={big ? 4.2 : 3.4} ry={big ? 5.2 : 4} fill={INK} />;
// Глаз-дуга: вверх (смеётся) или вниз (спит).
const Arc = ({ x, up }: { x: number; up: boolean }) => <path d={`M${x - 4.5} ${up ? 52 : 49} Q${x} ${up ? 45 : 54} ${x + 4.5} ${up ? 52 : 49}`} {...line} />;

function Face({ emotion, mood, still }: { emotion: Emotion; mood: number; still: boolean }) {
  const blink = still ? "" : "[animation:blink_5s_infinite] [transform-box:fill-box] [transform-origin:center]";
  if (emotion === "joy")
    return (
      <>
        <Arc x={40} up />
        <Arc x={60} up />
        <path d="M36 60 Q50 77 64 60" {...line} />
      </>
    );
  if (emotion === "wink")
    return (
      <>
        <Dot x={40} />
        <Arc x={60} up />
        <path d={MOUTH[5]} {...line} />
      </>
    );
  if (emotion === "sleep")
    return (
      <>
        <Arc x={40} up={false} />
        <Arc x={60} up={false} />
        <path d="M45 65 Q50 67.5 55 65" {...line} />
      </>
    );
  if (emotion === "wow")
    return (
      <>
        <g className={blink}>
          <Dot x={40} big />
          <Dot x={60} big />
        </g>
        <ellipse cx="50" cy="66" rx="4" ry="5" fill={INK} />
      </>
    );
  if (emotion === "care")
    return (
      <>
        <path d="M34.5 43 L44 40" {...line} strokeWidth={2.4} />
        <path d="M56 40 L65.5 43" {...line} strokeWidth={2.4} />
        <g className={blink}>
          <Dot x={40} />
          <Dot x={60} />
        </g>
        <path d="M42 65 Q50 62 58 65" {...line} />
      </>
    );
  return (
    <>
      <g className={blink}>
        <Dot x={40} />
        <Dot x={60} />
      </g>
      <path d={MOUTH[mood]} {...line} style={{ transition: "d 0.6s ease" }} />
    </>
  );
}

export function Orb({
  size = 160,
  className = "",
  still = false,
  face = false,
  mood = 3,
  emotion = "calm",
}: {
  size?: number;
  className?: string;
  still?: boolean;
  face?: boolean;
  mood?: number;
  emotion?: Emotion;
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
          <Face emotion={emotion} mood={m} still={still} />
        </svg>
      )}
    </div>
  );
}
