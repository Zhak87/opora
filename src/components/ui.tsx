import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-[18px] px-6 h-12 text-[15px] font-medium transition-all duration-300 ease-[cubic-bezier(0.3,1.4,0.5,1)] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.96]";

export const buttonStyles = {
  primary: `${buttonBase} bg-ink text-paper hover:bg-lilac-deep hover:-translate-y-0.5 shadow-soft hover:shadow-lift`,
  soft: `${buttonBase} bg-paper text-ink shadow-soft hover:-translate-y-0.5 hover:shadow-lift`,
  ghost: `${buttonBase} text-ink-soft hover:text-ink hover:bg-sand`,
  danger: `${buttonBase} bg-paper text-[#c2453d] border border-[#f7d2cf] hover:bg-[#ffeeec]`,
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
        className="h-13 w-full rounded-[18px] border-2 border-transparent bg-milk px-4 text-[15px] text-ink placeholder:text-ink-faint outline-none transition focus:border-lilac-deep/60 focus:bg-paper focus:ring-4 focus:ring-lilac-soft"
        {...props}
      />
    </label>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-[30px] bg-paper shadow-soft ${className}`}>{children}</div>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-8 animate-rise sm:mb-10">
      {eyebrow && <p className="mb-3 inline-flex rounded-full bg-lilac-soft px-3 py-1 text-xs font-medium text-lilac-deep">{eyebrow}</p>}
      <h1 className="font-serif text-[30px] leading-[1.1] text-ink sm:text-[40px]">{title}</h1>
      {children && <div className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">{children}</div>}
    </header>
  );
}

export const toneBg = {
  blue: "bg-mist",
  green: "bg-sage-soft",
  lavender: "bg-lilac-soft",
  beige: "bg-peach-soft",
} as const;

export const toneText = {
  blue: "text-sky-deep",
  green: "text-sage-deep",
  lavender: "text-lilac-deep",
  beige: "text-peach-deep",
} as const;

export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${tone === "error" ? "bg-[#ffeeec] text-[#b23b33]" : "bg-sage-soft text-sage-deep"}`}
    >
      {children}
    </p>
  );
}
