import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { PUBLIC_COLUMNS, type Psychologist } from "@/lib/pro";
import { freeSlots } from "@/lib/sessions";
import { getLocale } from "@/i18n/server";
import { scheduleMessages } from "@/i18n/schedule";
import { Card } from "@/components/ui";
import { PublicShell } from "@/components/pro/PublicShell";
import { Avatar } from "@/components/pro/bits";
import { BookForm } from "@/components/schedule/SlotPicker";

// Запись к психологу: выбор окна, а при первой записи — что разрешить видеть.
export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) notFound();
  const { supabase, user } = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/p/${slug}/book`)}`);
  const { data } = await supabase.from("psychologists").select(PUBLIC_COLUMNS).eq("slug", slug).maybeSingle();
  const p = data as unknown as Psychologist | null;
  if (!p) notFound();
  const locale = await getLocale();
  const m = scheduleMessages[locale].book;

  const own = p.user_id === user.id;
  const { count } = await supabase
    .from("client_links")
    .select("id", { count: "exact", head: true })
    .eq("client_id", user.id)
    .eq("psychologist_id", p.user_id)
    .in("status", ["pending", "active"]);
  const linked = (count ?? 0) > 0;
  const slots = await freeSlots(supabase, p.user_id, 30);

  return (
    <PublicShell home="/">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={p.full_name} src={p.photo_url} size={56} />
          <div>
            <p className="text-sm text-ink-soft">{m.title}</p>
            <h1 className="font-serif text-[26px] leading-tight text-ink">{p.full_name}</h1>
          </div>
        </div>
        <Card className="p-6 sm:p-8">
          {own ? (
            <p className="text-[15px] text-ink-soft">{m.own}</p>
          ) : !linked && !p.accepting_clients ? (
            <p className="text-[15px] text-ink-soft">{m.notAccepting}</p>
          ) : (
            <BookForm psychologist={p.user_id} slots={slots} formats={p.formats} firstTime={!linked} />
          )}
        </Card>
      </div>
    </PublicShell>
  );
}
