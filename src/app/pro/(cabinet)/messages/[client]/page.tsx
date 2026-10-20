import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/sessions";
import { listMessages } from "@/lib/care-chat";
import { myClients, myPsychologist } from "@/lib/pro";
import { getLocale } from "@/i18n/server";
import { careChatMessages as chatMessages } from "@/i18n/care-chat";
import { proMessages } from "@/i18n/pro";
import { common } from "@/i18n/common";
import { Avatar } from "@/components/pro/bits";
import { CareChat } from "@/components/chat/CareChat";
import { BackIcon } from "@/components/icons";

// Переписка психолога с клиентом: только пока клиент работает с ним или ждёт ответа на заявку.
export default async function ProChat({ params }: { params: Promise<{ client: string }> }) {
  const { client: id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const { supabase, user } = await requireUser();
  const client = (await myClients(supabase, user!.id)).find((c) => c.link.client_id === id);
  if (!client) notFound();
  const [messages, me] = await Promise.all([listMessages(supabase, { psychologist: user!.id, client: id }), myPsychologist(supabase, user!.id)]);
  const locale = await getLocale();
  const m = chatMessages[locale];
  const name = client.name ?? proMessages[locale].clients.noName;

  return (
    <>
      <Link href="/pro/messages" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {common[locale].back}
      </Link>
      <header className="mb-6 flex items-center gap-4">
        <Avatar name={name} size={52} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-soft">{m.title}</p>
          <h1 className="truncate font-serif text-[26px] leading-tight text-ink sm:text-[30px]">{name}</h1>
        </div>
        {client.link.status === "active" && (
          <Link href={`/pro/clients/${id}`} className="hidden text-sm text-sky-deep hover:text-ink sm:block">
            {proMessages[locale].clients.card}
          </Link>
        )}
      </header>
      <div className="max-w-3xl">
        <CareChat me={user!.id} peer={id} initial={messages} tz={me!.timezone} canWrite empty={m.emptyPro} />
      </div>
    </>
  );
}
