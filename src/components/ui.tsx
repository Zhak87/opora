import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 h-12 text-[15px] font-medium transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

export const buttonStyles = {
  primary: `${buttonBase} bg-ink text-paper hover:bg-ink/90 shadow-soft`,
  soft: `${buttonBase} bg-paper text-ink border border-line hover:border-sand-deep hover:shadow-soft`,
  ghost: `${buttonBase} text-ink-soft hover:text-ink hover:bg-sand/60`,
  danger: `${buttonBase} bg-paper text-[#a0614f] border border-[#ecd6cd] hover:bg-[#fbf1ec]`,
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof buttonStyles }) {
  return <button className={`${buttonStyles[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonStyles }) {
  return <Link className={`${buttonStyles[variant]} ${className}`} {...props} />;
}

export function Field({ label, ...props }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-ink-soft">{label}</span>
      <input
        className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-[15px] text-ink placeholder:text-ink-faint outline-none transition focus:border-sky focus:ring-4 focus:ring-mist"
        {...props}
      />
    </label>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-[28px] border border-line/70 bg-paper/80 backdrop-blur-sm shadow-soft ${className}`}>{children}</div>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-8 animate-rise sm:mb-10">
      {eyebrow && <p className="mb-2 text-sm text-ink-soft">{eyebrow}</p>}
      <h1 className="font-serif text-[32px] leading-tight text-ink sm:text-[40px]">{title}</h1>
      {children && <div className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">{children}</div>}
    </header>
  );
}

export const toneBg = {
  blue: "bg-mist",
  green: "bg-sage-soft",
  lavender: "bg-lilac-soft",
  beige: "bg-sand",
} as const;

export const toneText = {
  blue: "text-sky-deep",
  green: "text-sage-deep",
  lavender: "text-lilac-deep",
  beige: "text-[#9a8466]",
} as const;

export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${tone === "error" ? "bg-[#fbf1ec] text-[#94594a]" : "bg-sage-soft text-sage-deep"}`}
    >
      {children}
    </p>
  );
}
