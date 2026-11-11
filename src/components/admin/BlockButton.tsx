"use client";

// Кнопка блокировки с подтверждением: действие серьёзное, случайное нажатие не должно сработать.
export function BlockButton({ label, confirmText, danger }: { label: string; confirmText?: string; danger: boolean }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
      className={`h-9 rounded-full px-4 text-sm transition ${danger ? "text-[#c2453d] hover:bg-[#ffeeec]" : "border border-line bg-paper text-ink hover:border-sand-deep"}`}
    >
      {label}
    </button>
  );
}
