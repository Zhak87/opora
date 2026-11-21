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

// Знаки тематических комнат: тонкие линии, как остальные иконки «Опоры».
const glyphs: Record<string, React.ReactNode> = {
  "night-thoughts": <><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" /><path d="M16 4.5v2M15 5.5h2M19.5 8.5v1.5M18.75 9.25h1.5" /></>,
  "love-hard": <><path d="M12 19.5s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.1c0 5.1-7 9.4-7 9.4Z" /><path d="M12 8.5 10.8 12l2.4 1.2L12 16" /></>,
  "falling-behind": <><path d="M4 19.5h4v-4h4v-4h4v-4h4" /><circle cx="6" cy="12" r="1.6" /><path d="M6 13.6v2.4" /></>,
  burnout: <><rect x="3.5" y="8" width="15" height="8" rx="2.2" /><path d="M21 11v2M6.5 11v2" /></>,
  lonely: <><circle cx="12" cy="8" r="3" /><path d="M6.5 19.5a5.5 5.5 0 0 1 11 0" /><path d="M19 5.5c1 .7 1.5 1.6 1.5 2.5s-.5 1.8-1.5 2.5" /></>,
  "money-future": <><circle cx="12" cy="12" r="7.5" /><path d="M14.4 9.4c-.4-.8-1.3-1.2-2.4-1.2-1.5 0-2.5.8-2.5 1.9 0 2.6 5 1.4 5 4 0 1.1-1 1.9-2.5 1.9-1.1 0-2-.4-2.5-1.3M12 6.8v1.4M12 15.8v1.4" /></>,
};

export function TopicGlyph({ slug, className }: { slug: string; className?: string }) {
  return <svg {...base} className={className} aria-hidden="true">{glyphs[slug] ?? glyphs.lonely}</svg>;
}

export const VolumeIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M4.5 9.5h3l4-3.5v12l-4-3.5h-3z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></svg>
);

// Аватар ИИ-собеседника: мягкий градиент Опи с первой буквой имени — так его не спутать с человеком.
export function PersonaAvatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-ink"
      style={{ width: size, height: size, fontSize: size * 0.42, background: "linear-gradient(140deg, #A9B4FF 0%, #C7B2F5 52%, #FFC9B5 100%)" }}
    >
      {name.slice(0, 1)}
    </span>
  );
}
