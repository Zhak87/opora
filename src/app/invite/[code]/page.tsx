import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { PUBLIC_COLUMNS, type Psychologist } from "@/lib/pro";
import { getLocale } from "@/i18n/server";
import { careMessages } from "@/i18n/care";
import { ButtonLink, Card } from "@/components/ui";
import { PublicShell } from "@/components/pro/PublicShell";
import { PsychologistProfile } from "@/components/pro/PsychologistProfile";
import { AcceptInvite, InviteView } from "@/components/pro/AcceptInvite";

// Ссылка-приглашение психолога: профиль, вход или регистрация, выбор, чем делиться, и подключение.
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = careMessages[locale].invite;
  const home = user ? "/" : "/welcome";

  const valid = /^[A-Za-z0-9_-]{8,32}$/.test(code);
  const { data: info } = valid ? await supabase.rpc("invite_info", { p_code: code }) : { data: null };
  const found = (info as { psychologist_id: string }[] | null)?.[0];
  const { data } = found
    ? await supabase.from("psychologists").select(PUBLIC_COLUMNS).eq("user_id", found.psychologist_id).maybeSingle()
    : { data: null };
  const p = data as unknown as Psychologist | null;

  if (!p) {
    return (
      <PublicShell home={home}>
        <div className="mx-auto max-w-md pt-10 text-center">
          <h1 className="font-serif text-[28px] text-ink">{m.invalid}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{m.invalidHint}</p>
          <ButtonLink href={home} variant="soft" className="mt-8">
            {m.toHome}
          </ButtonLink>
        </div>
      </PublicShell>
    );
  }

  const own = user?.id === p.user_id;
  let linked = false;
  let name = "";
  if (user && !own) {
    const [{ count }, { data: profile }] = await Promise.all([
      supabase
        .from("client_links")
        .select("id", { count: "exact", head: true })
        .eq("client_id", user.id)
        .eq("psychologist_id", p.user_id)
        .in("status", ["pending", "active"]),
      supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
    ]);
    linked = (count ?? 0) > 0;
    name = profile?.name ?? "";
  }
  const next = encodeURIComponent(`/invite/${code}`);

  return (
    <PublicShell home={home} wide>
      {!own && <InviteView code={code} />}
      <p className="mb-4 text-xs uppercase tracking-[0.16em] text-lilac-deep">{m.eyebrow}</p>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <PsychologistProfile p={p} locale={locale} />
        <Card className="p-6 sm:p-7 lg:sticky lg:top-6">
          {own ? (
            <p className="text-[15px] leading-relaxed text-ink-soft">{m.ownInvite}</p>
          ) : linked ? (
            <div className="space-y-4">
              <p className="text-[15px] leading-relaxed text-ink">{m.already}</p>
              <ButtonLink href="/care" className="w-full">
                {m.open}
              </ButtonLink>
            </div>
          ) : user ? (
            <AcceptInvite code={code} name={name} />
          ) : (
            <div className="space-y-4">
              <p className="text-[15px] leading-relaxed text-ink-soft">{m.accountHint}</p>
              <ButtonLink href={`/signup?next=${next}`} className="w-full">
                {m.signupCta}
              </ButtonLink>
              <ButtonLink href={`/login?next=${next}`} variant="soft" className="w-full">
                {m.signinCta}
              </ButtonLink>
              <p className="pt-2 text-center text-xs text-ink-faint">
                <Link href="/privacy" className="hover:text-ink">
                  {careMessages[locale].care.noTraining}
                </Link>
              </p>
            </div>
          )}
        </Card>
      </div>
    </PublicShell>
  );
}
