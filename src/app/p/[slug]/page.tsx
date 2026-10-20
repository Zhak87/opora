import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { PUBLIC_COLUMNS, type Psychologist } from "@/lib/pro";
import { getLocale } from "@/i18n/server";
import { careMessages } from "@/i18n/care";
import { PublicShell } from "@/components/pro/PublicShell";
import { PsychologistProfile } from "@/components/pro/PsychologistProfile";
import { ButtonLink } from "@/components/ui";
import { scheduleMessages } from "@/i18n/schedule";

// Публичный профиль психолога. Гость видит только опубликованные анкеты (правило в базе),
// сам специалист — свою в любом статусе, как предпросмотр.
export default async function PublicProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) notFound();
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("psychologists").select(PUBLIC_COLUMNS).eq("slug", slug).maybeSingle();
  const p = data as unknown as Psychologist | null;
  if (!p) notFound();
  const locale = await getLocale();
  return (
    <PublicShell home={user ? "/" : "/welcome"}>
      {user?.id === p.user_id && p.status !== "approved" && (
        <p className="mb-4 rounded-2xl bg-mist/60 px-5 py-3 text-sm text-sky-deep">{careMessages[locale].invite.ownInvite}</p>
      )}
      <PsychologistProfile
        p={p}
        locale={locale}
        action={
          p.status === "approved" && p.accepting_clients && user?.id !== p.user_id ? (
            <ButtonLink href={`/p/${p.slug}/book`}>{scheduleMessages[locale].catalog.book}</ButtonLink>
          ) : null
        }
      />
    </PublicShell>
  );
}
