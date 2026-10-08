type P = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export const HomeIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M4 11.5 12 5l8 6.5" /><path d="M6.5 10v8.5h11V10" /></svg>
);
export const TalkIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M5 17.5c-1-1.3-1.5-2.8-1.5-4.5C3.5 8.9 7.3 5.5 12 5.5s8.5 3.4 8.5 7.5-3.8 7.5-8.5 7.5c-1.4 0-2.7-.3-3.9-.8L4.5 20.5Z" /></svg>
);
export const JournalIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M6.5 4.5h10a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-10Z" /><path d="M6.5 4.5v15" /><path d="M10 9h5M10 12.5h4" /></svg>
);
export const HopeIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M3.5 17.5h17" /><path d="M7 17.5a5 5 0 0 1 10 0" /><path d="M12 6v2.5M5.6 9.1l1.6 1.6M18.4 9.1l-1.6 1.6" /></svg>
);
export const ProfileIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="9" r="3.5" /><path d="M5.5 19.5c1.2-3 3.7-4.5 6.5-4.5s5.3 1.5 6.5 4.5" /></svg>
);
export const CompassIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="8" /><path d="m14.8 9.2-1.8 4-3.8 1.6 1.8-4Z" /></svg>
);
export const PenIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M5 19l1-4L15.5 5.5a2 2 0 0 1 3 3L9 18Z" /><path d="M13.5 7.5l3 3" /></svg>
);
export const ArrowIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const BackIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
);
export const SendIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 19V6M6.5 11.5 12 6l5.5 5.5" /></svg>
);
export const PlusIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 5v14M5 12h14" /></svg>
);
export const TrashIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg>
);
export const SparkIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 4c.6 3.9 2.1 5.4 6 6-3.9.6-5.4 2.1-6 6-.6-3.9-2.1-5.4-6-6 3.9-.6 5.4-2.1 6-6Z" /></svg>
);
export const LeafIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z" /><path d="M5 19 13 11" /></svg>
);
