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
export const PhoneIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M6.5 4.5h3l1.5 4-2 1.3a10 10 0 0 0 5.2 5.2l1.3-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A15 15 0 0 1 5 6.1a1.5 1.5 0 0 1 1.5-1.6Z" /></svg>
);
export const WhatsAppIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M4.5 19.5l1.2-3.6A8 8 0 1 1 8.4 18.6Z" /><path d="M9.3 8.8c-.3 2.6 2.4 5.6 5.4 5.9l1-1.2-1.8-.9-.8.8a4.5 4.5 0 0 1-2.3-2.3l.8-.8-.9-1.8Z" /></svg>
);
export const BellIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5h-14Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
);
export const GridIcon = ({ className }: P) => (
  <svg {...base} className={className}><rect x="4.5" y="4.5" width="6" height="6" rx="1.8" /><rect x="13.5" y="4.5" width="6" height="6" rx="1.8" /><rect x="4.5" y="13.5" width="6" height="6" rx="1.8" /><rect x="13.5" y="13.5" width="6" height="6" rx="1.8" /></svg>
);
export const UsersIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="9.5" cy="9" r="3" /><path d="M4 18.5c.9-2.6 3-4 5.5-4s4.6 1.4 5.5 4" /><path d="M15.5 6.3a3 3 0 0 1 0 5.4M17.5 14.8c1.2.6 2 1.8 2.5 3.7" /></svg>
);
export const LinkIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M10.5 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1" /><path d="M13.5 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1" /></svg>
);
export const IdIcon = ({ className }: P) => (
  <svg {...base} className={className}><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><circle cx="9" cy="11" r="2" /><path d="M6 15.5c.6-1.3 1.7-2 3-2s2.4.7 3 2M14.5 10h3M14.5 13h2.5" /></svg>
);
export const ShieldIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 3.5 5.5 6v5.5c0 4 2.8 7.4 6.5 8.5 3.7-1.1 6.5-4.5 6.5-8.5V6Z" /><path d="m9.3 12 1.9 1.9 3.6-3.8" /></svg>
);
export const HeartHandIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 8.2c-1-1.7-3.6-2-4.8-.4-1 1.3-.6 3 .6 4.1L12 15.5l4.2-3.6c1.2-1.1 1.6-2.8.6-4.1-1.2-1.6-3.8-1.3-4.8.4Z" /><path d="M4 19.5h4l3 1 5.5-2" /></svg>
);
export const CheckIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="m5.5 12.5 4 4 9-9.5" /></svg>
);
export const CopyIcon = ({ className }: P) => (
  <svg {...base} className={className}><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" /></svg>
);
