import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMsg } from "@/i18n/server";
import { trialMessages } from "@/i18n/trial";
import { Notice, buttonStyles } from "@/components/ui";
import { ConvertForm } from "@/components/trial/ConvertForm";
import { Countdown } from "@/components/trial/TrialBadge";
import { leaveTrial } from "@/lib/trial-actions";
import { TRIAL_MINUTES, isGuest, trialOver, trialUntil } from "@/lib/trial";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMsg(trialMessages)).metaTitle };
}

// Экран гостя: сколько времени осталось и как сохранить всё, создав аккаунт.
// Сюда же попадают, когда пробное время вышло или гость открыл комнаты.
export default async function TrialPage({ searchParams }: { searchParams: Promise<{ state?: string; from?: string }> }) {
  const { state, from } = await searchParams;
  const t = await getMsg(trialMessages);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!isGuest(claims)) {
    // Не гость: либо пробный доступ уже был на этом устройстве, либо его не удалось начать.
    const text = state === "busy" ? t.busy : state === "unavailable" ? t.unavailable : t.used.text;
    return (
      <div className="text-center">
        <h1 className="mb-3 font-serif text-[26px] text-ink">{t.used.title}</h1>
        <p className="text-[15px] leading-relaxed text-ink-soft">{text}</p>
        <div className="mt-7 flex flex-col gap-2.5">
          <Link href={claims ? "/" : "/signup"} className={`${buttonStyles.primary} h-13`}>{claims ? t.active.back : t.used.signup}</Link>
          {!claims && <Link href="/login" className={`${buttonStyles.ghost} h-12`}>{t.used.login}</Link>}
        </div>
      </div>
    );
  }

  const over = trialOver(claims);
  const head = over ? t.over : from === "rooms" ? t.rooms : { title: t.active.title, text: t.active.text(TRIAL_MINUTES) };
  return (
    <>
      <h1 className="mb-2 font-serif text-[26px] leading-tight text-ink">{head.title}</h1>
      <p className="mb-6 text-[15px] leading-relaxed text-ink-soft">{head.text}</p>
      {!over && (
        <p className="mb-6 flex items-center justify-between rounded-2xl bg-lilac-soft px-4 py-3 text-sm text-ink">
          <span>{t.active.left}</span>
          <Countdown until={trialUntil(claims)} className="font-display text-base text-lilac-deep" />
        </p>
      )}
      {state === "need" && <div className="mb-5"><Notice tone="info">{t.needAccount}</Notice></div>}
      <ConvertForm />
      <div className="mt-6 flex flex-col items-center gap-3 text-sm">
        {!over && <Link href="/" className="text-sky-deep hover:text-ink">{t.active.back}</Link>}
        <p className="text-ink-soft">
          {t.haveAccount} <Link href="/login" className="text-sky-deep hover:text-ink">{t.used.login}</Link>
        </p>
        <form action={leaveTrial}>
          <button type="submit" className="text-xs text-ink-faint underline-offset-4 transition hover:text-ink-soft hover:underline">{t.leave}</button>
        </form>
      </div>
    </>
  );
}
