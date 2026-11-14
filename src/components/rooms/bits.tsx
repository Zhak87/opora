type P = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export const MicIcon = ({ className }: P) => (
  <svg {...base} className={className}><rect x="9" y="3.5" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" /></svg>
);
export const MicOffIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M15 9.5V6.5a3 3 0 0 0-5.6-1.5M9 9v2.5a3 3 0 0 0 4.6 2.5" /><path d="M5.5 11.5a6.5 6.5 0 0 0 10.4 5.2M18.4 13a6.5 6.5 0 0 0 .1-1.5M12 18v2.5M4 4l16 16" /></svg>
);
export const HeadphonesIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M4.5 15v-3a7.5 7.5 0 0 1 15 0v3" /><rect x="4" y="14" width="4" height="6" rx="1.8" /><rect x="16" y="14" width="4" height="6" rx="1.8" /></svg>
);
export const HandIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M8.5 12V6a1.5 1.5 0 0 1 3 0v5M11.5 10.5V4.8a1.5 1.5 0 0 1 3 0v5.7M14.5 10.5V6.3a1.5 1.5 0 0 1 3 0V14c0 3.6-2.6 6.5-6 6.5-2.3 0-3.7-1-5-3l-2.3-3.7a1.4 1.4 0 0 1 2.3-1.6l2 2.3" /></svg>
);
export const LeaveIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14M10 16l-4-4 4-4M6 12h9" /></svg>
);
export const DotsIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="6" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="18" cy="12" r="1.2" /></svg>
);

export function OnlineDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {active && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-60" />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${active ? "bg-sage-deep" : "bg-ink-faint/60"}`} />
    </span>
  );
}

// Знак ИИ-модератора: та же капля «Опоры», только маленькая и с подписью «ИИ».
export function ModeratorBadge({ tag }: { tag: string }) {
  return (
    <span className="inline-flex h-5 items-center rounded-full bg-gradient-to-r from-lilac-soft to-mist px-2 text-[10.5px] font-semibold uppercase tracking-wide text-lilac-deep">
      {tag}
    </span>
  );
}
