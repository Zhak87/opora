import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions";
import { NameForm, DangerZone } from "@/components/ProfileForms";
import { VoicePicker } from "@/components/VoicePicker";
import { normalizeVoice } from "@/lib/voices";
import { Card, Notice, PageHeader, buttonStyles } from "@/components/ui";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { INTL } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { profileMessages } from "@/i18n/profile";
import { legalMessages } from "@/i18n/legal";
import { aboutMessages } from "@/i18n/about";
import { PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { AUTHOR_PHONE_DISPLAY, AUTHOR_TEL_HREF, AUTHOR_WHATSAPP_HREF } from "@/lib/author";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ cleared?: string; error?: string; confirm?: string }>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const m = profileMessages[locale];
  const legal = legalMessages[locale];
  const a = aboutMessages[locale];
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { count: talks }, { count: notes }, { count: pro }] = await Promise.all([
    supabase.from("profiles").select("name, created_at, voice").eq("id", user!.id).single(),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
    supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
    supabase.from("psychologists").select("user_id", { count: "exact", head: true }).eq("user_id", user!.id),
  ]);
  const since = new Date(profile?.created_at ?? Date.now()).toLocaleDateString(INTL[locale], {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <PageHeader title={m.title} />

      <div className="stagger space-y-5">
        {sp.cleared && <Notice>{m.cleared}</Notice>}
        {sp.error && <Notice tone="error">{m.deleteError}</Notice>}
        {sp.confirm && <Notice tone="error">{m.confirmNeeded}</Notice>}

        <Card className="p-6 sm:p-8">
          <p className="text-sm text-ink-soft">{user!.email}</p>
          <p className="mt-1 text-xs text-ink-faint">{m.since(since)}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-mist/70 px-4 py-3">
              <p className="font-serif text-2xl text-ink">{talks ?? 0}</p>
              <p className="text-xs text-ink-soft">{m.talks(talks ?? 0)}</p>
            </div>
            <div className="rounded-2xl bg-sage-soft/80 px-4 py-3">
              <p className="font-serif text-2xl text-ink">{notes ?? 0}</p>
              <p className="text-xs text-ink-soft">{m.notes(notes ?? 0)}</p>
            </div>
          </div>
          <div className="mt-8">
            <NameForm name={profile?.name ?? ""} />
          </div>
        </Card>

        <Card className="p-6 sm:p-8">
          <h2 className="text-[15px] font-medium text-ink">{m.languageTitle}</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{m.languageHint}</p>
          <LanguageSwitcher full className="mt-4" />
        </Card>

        <Card className="p-6 sm:p-8">
          <VoicePicker initial={normalizeVoice(profile?.voice)} />
        </Card>

        <Card className="p-6 sm:p-8">
          <h2 className="mb-2 text-[15px] font-medium text-ink">{m.privacyTitle}</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            {m.privacyText}
          </p>
          <p className="mt-3 flex gap-4 text-sm">
            <Link href="/privacy" className="text-sky-deep hover:text-ink">{legal.privacyTitle}</Link>
            <Link href="/terms" className="text-sky-deep hover:text-ink">{legal.termsTitle}</Link>
          </p>
        </Card>

        <Card className="p-6 sm:p-8">
          <h2 className="mb-2 text-[15px] font-medium text-ink">{a.title}</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            {a.madeBy} <span className="text-ink">{a.author}</span>
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{a.contactHint}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a href={AUTHOR_TEL_HREF} className={buttonStyles.soft} aria-label={`${a.call}: ${AUTHOR_PHONE_DISPLAY}`}>
              <PhoneIcon className="h-[18px] w-[18px]" />
              {AUTHOR_PHONE_DISPLAY}
            </a>
            <a href={AUTHOR_WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" className={buttonStyles.soft}>
              <WhatsAppIcon className="h-[18px] w-[18px]" />
              {a.whatsapp}
            </a>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex-1">
            <h2 className="text-[15px] font-medium text-ink">{m.proTitle}</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{pro ? m.proOwnText : m.proText}</p>
          </div>
          <Link href={pro ? "/pro" : "/pro/join"} className={`${pro ? buttonStyles.primary : buttonStyles.soft} shrink-0`}>
            {pro ? m.proOpen : m.proJoin}
          </Link>
        </Card>

        <Card className="p-6 sm:p-8">
          <DangerZone />
        </Card>

        <form action={signOut} className="pt-2 text-center">
          <button className={buttonStyles.ghost}>{m.signOut}</button>
        </form>
      </div>
    </>
  );
}
