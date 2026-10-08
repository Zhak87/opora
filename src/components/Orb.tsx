// Мягкая «дышащая» сфера — главный визуальный образ приложения.
export function Orb({ size = 160, className = "", still = false }: { size?: number; className?: string; still?: boolean }) {
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden>
      <div
        className={`absolute inset-0 rounded-full blur-2xl opacity-70 ${still ? "" : "animate-breathe"}`}
        style={{ background: "radial-gradient(circle at 40% 40%, #ebe6f4, #c9d8e6 50%, #d6e5cf 80%)" }}
      />
      <div
        className={`absolute inset-[14%] rounded-full ${still ? "" : "animate-breathe"}`}
        style={{
          background: "radial-gradient(circle at 35% 30%, #fffdf9 0%, #e7e1f2 35%, #bccfe0 70%, #b4cbaa 100%)",
          boxShadow: "inset -8px -12px 30px rgb(127 113 168 / 0.15), 0 20px 50px -20px rgb(95 125 152 / 0.45)",
          animationDelay: "-1s",
        }}
      />
    </div>
  );
}
