import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/sessions";
import { listMessages } from "@/lib/care-chat";
import { getTimeZone } from "@/lib/tz";
import { getLocale } from "@/i18n/server";
import { careChatMessages as chatMessages } from "@/i18n/care-chat";
import { common } from "@/i18n/common";
import { Avatar } from "@/components/pro/bits";
import { CareChat } from "@/components/chat/CareChat";
import { BackIcon, ShieldIcon } from "@/components/icons";

// Переписка клиента со своим психологом.
export default async function ClientChat({ params }: { params: Promise<{ peer: string }> }) {
  const { peer } = await params;
  if (!UUID_RE.test(peer)) notFound();
  const { supabase, user } = await requireUser();
  const [{ data: p }, { count }, messages] = await Promise.all([
    supabase.from("psychologists").select("user_id, full_name, photo_url").eq("user_id", peer).maybeSingle(),
    supabase
      .from("client_links")
      .select("id", { count: "exact", head: true })
      .eq("client_id", user!.id)
      .eq("psychologist_id", peer)
      .in("status", ["pending", "active"]),
    listMessages(supabase, { psychologist: peer, client: user!.id }),
  ]);
  const open = (count ?? 0) > 0;
  if (!open && !messages.length) notFound();
  const locale = await getLocale();
  const m = chatMessages[locale];
  const name = p?.full_name ?? m.someone;

  return (
    <>
      <Link href="/care" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {common[locale].back}
      </Link>
      <header className="mb-6 flex items-center gap-4">
        <Avatar name={name} src={p?.photo_url} size={52} />
        <div className="min-w-0">
          <p className="text-sm text-ink-soft">{m.title}</p>
          <h1 className="truncate font-serif text-[26px] leading-tight text-ink sm:text-[30px]">{name}</h1>
        </div>
      </header>
      <CareChat me={user!.id} peer={peer} initial={messages} tz={await getTimeZone()} canWrite={open} empty={m.empty} />
      <p className="mt-4 flex items-start gap-2 px-2 text-xs leading-relaxed text-ink-faint">
        <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {m.privacy} {m.safety}
        </span>
      </p>
    </>
  );
}
