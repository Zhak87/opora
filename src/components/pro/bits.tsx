import type { ReactNode } from "react";
import type { PsyStatus } from "@/lib/pro";

// Небольшие общие детали кабинета специалиста и профиля психолога.

const STATUS_TONE: Record<PsyStatus, string> = {
  draft: "bg-sand text-[#8a7458]",
  pending: "bg-mist text-sky-deep",
  approved: "bg-sage-soft text-sage-deep",
  rejected: "bg-[#fbf1ec] text-[#a0614f]",
  suspended: "bg-[#fbf1ec] text-[#a0614f]",
};

export function StatusPill({ status, label }: { status: PsyStatus; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS_TONE[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function Avatar({ name, src, size = 48 }: { name: string; src?: string | null; size?: number }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "·";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lilac-soft to-mist font-serif text-ink"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function Stat({ value, label, tone = "bg-paper/80" }: { value: ReactNode; label: string; tone?: string }) {
  return (
    <div className={`rounded-[20px] border border-line/70 ${tone} p-3.5 shadow-soft sm:rounded-[24px] sm:p-5`}>
      <p className="font-serif text-[26px] leading-none text-ink sm:text-[34px]">{value}</p>
      <p className="mt-2 text-xs leading-snug text-ink-soft sm:text-sm">{label}</p>
    </div>
  );
}

export function Chip({ children, tone = "bg-sand/70 text-ink-soft" }: { children: ReactNode; tone?: string }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-[13px] ${tone}`}>{children}</span>;
}
