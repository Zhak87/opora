import { getMsg } from "@/i18n/server";
import { roomsMessages } from "@/i18n/rooms";

export default async function Loading() {
  const m = await getMsg(roomsMessages);
  return (
    <div className="animate-fade" aria-busy="true" aria-label={m.loading}>
      <div className="mb-3 h-6 w-20 animate-pulse rounded-full bg-lilac-soft/80" />
      <div className="mb-4 h-10 w-48 animate-pulse rounded-full bg-sand/70" />
      <div className="mb-8 h-5 w-80 max-w-full animate-pulse rounded-full bg-sand/60" />
      <div className="mb-5 h-12 w-56 animate-pulse rounded-[18px] bg-sand/70" />
      <div className="mb-5 h-12 w-full animate-pulse rounded-[20px] bg-paper shadow-soft" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-[26px] bg-paper shadow-soft" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
      <p className="sr-only">{m.loading}</p>
    </div>
  );
}
