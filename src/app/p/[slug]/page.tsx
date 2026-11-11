import { Track } from "@/components/Track";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { PUBLIC_COLUMNS, type Psychologist } from "@/lib/pro";
import { getLocale } from "@/i18n/server";
import { careMessages } from "@/i18n/care";
import { PublicShell } from "@/components/pro/PublicShell";
import { PsychologistProfile } from "@/components/pro/PsychologistProfile";
import { ButtonLink } from "@/components/ui";
import { scheduleMessages } from "@/i18n/schedule";
import { common } from "@/i18n/common";
import { publicMetadata } from "@/lib/seo";

const loadProfile = cache(async (slug: string) => {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) notFound();
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("psychologists").select(PUBLIC_COLUMNS).eq("slug", slug).maybeSingle();
  if (!data) notFound();
  return { user, p: data as unknown as Psychologist };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { p } = await loadProfile((await params).slug);
  if (p.status !== "approved") return { robots: { index: false } };
  const locale = await getLocale();
  const occupation = locale === "en" ? "Psychologist" : "Психолог";
  const title = `${p.full_name} — ${occupation} | ${common[locale].brand}`;
  const description = (p.headline || p.about || scheduleMessages[locale].catalog.intro).trim().slice(0, 160);
  return publicMetadata(`/p/${p.slug}`, title, description);
}

// Публичный профиль психолога. Гость видит только опубликованные анкеты (правило в базе),
// сам специалист — свою в любом статусе, как предпросмотр.
export default async function PublicProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { user, p } = await loadProfile((await params).slug);
  const locale = await getLocale();
  return (
    <PublicShell home={user ? "/" : "/welcome"}>
      <Track name="psychologist_view" />
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
