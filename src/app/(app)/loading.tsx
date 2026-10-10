import { getMsg } from "@/i18n/server";
import { welcomeMessages } from "@/i18n/welcome";

// Мгновенный отклик при переходе: мягкий «скелет» страницы, пока загружаются данные.
export default async function Loading() {
  const m = await getMsg(welcomeMessages);
  return (
    <div className="animate-fade" aria-busy="true" aria-label={m.loading}>
      <div className="mb-3 h-4 w-28 animate-pulse rounded-full bg-sand/80" />
      <div className="mb-10 h-10 w-64 animate-pulse rounded-full bg-sand/70" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-[26px] border border-line/50 bg-paper/70"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
