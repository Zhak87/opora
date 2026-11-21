import type { Kind } from "@/lib/games";

// Метка «Игра» / «Практика» на карточке: по любой карточке сразу понятно, что это.
// light — карточка светлая (на тёмной обложке игры метка полупрозрачная).
export function KindBadge({ kind, label, light }: { kind: Kind; label: string; light?: boolean }) {
  const tone =
    kind === "game"
      ? light
        ? "bg-[#1f1d55] text-paper"
        : "bg-paper/15 text-paper ring-1 ring-paper/25"
      : "bg-sage-soft text-sage-deep";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] ${tone}`}>{label}</span>;
}
