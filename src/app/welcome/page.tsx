import Link from "next/link";
import { Orb } from "@/components/Orb";
import { ButtonLink } from "@/components/ui";
import { MusicToggle } from "@/components/Music";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getMsg } from "@/i18n/server";
import { common } from "@/i18n/common";
import { welcomeMessages } from "@/i18n/welcome";
import { legalMessages } from "@/i18n/legal";
import { aboutMessages } from "@/i18n/about";
import { profileMessages } from "@/i18n/profile";
import { guideMessages } from "@/i18n/guide";
import { trialMessages } from "@/i18n/trial";
import { startTrial } from "@/lib/trial-actions";
import { TRIAL_MINUTES } from "@/lib/trial";
import { buttonStyles } from "@/components/ui";
import { AUTHOR_PHONE_DISPLAY, AUTHOR_TEL_HREF, AUTHOR_WHATSAPP_HREF } from "@/lib/author";

const BUBBLES = [
  "left-0 top-[12%] bg-peach-soft",
  "right-0 top-[22%] bg-lilac-soft",
  "left-[4%] bottom-[16%] bg-sage-soft",
  "right-[2%] bottom-[8%] bg-mist",
];

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const m = await getMsg(welcomeMessages);
  const c = await getMsg(common);
  const legal = await getMsg(legalMessages);
  const a = await getMsg(aboutMessages);
  const pm = await getMsg(profileMessages);
  const g = await getMsg(guideMessages);
  const t = await getMsg(trialMessages);
  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-6 sm:px-8">
        <span className="flex items-center gap-2"><Orb size={34} still face /><span className="hidden font-display text-[19px] font-semibold lowercase tracking-[-0.03em] text-ink sm:inline">{c.brand}</span></span>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher />
          <MusicToggle withLabel className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline sm:pr-2" />
          <ButtonLink href="/login" variant="ghost" className="h-10 whitespace-nowrap px-3 sm:px-4">{m.signIn}</ButtonLink>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-5 pb-16 text-center sm:px-8">
        {deleted && (
          <p className="mb-8 rounded-full bg-paper/80 px-5 py-2 text-sm text-ink-soft shadow-soft">{m.deleted}</p>
        )}
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-6 lg:text-left">
          {/* Капля и чувства, с которыми сюда приходят, мягко плавают вокруг неё */}
          <div className="relative mx-auto flex h-[300px] w-full max-w-[420px] items-center justify-center sm:h-[400px] lg:order-2">
            <Orb size={220} face className="sm:hidden" />
            <Orb size={290} face className="hidden sm:block" />
            {m.feelings.slice(0, 4).map((f, i) => (
              <span
                key={f}
                className={`absolute animate-float whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-ink shadow-soft ${BUBBLES[i]}`}
                style={{ animationDelay: `${-i * 1.4}s` }}
              >
                {f}
              </span>
            ))}
          </div>
          <div className="flex flex-col items-center lg:items-start">
            <h1 className="max-w-2xl animate-rise font-serif text-[34px] leading-[1.08] text-ink sm:text-[54px]">{m.title}</h1>
            <p className="mt-6 max-w-lg animate-rise text-[17px] leading-relaxed text-ink-soft [animation-delay:120ms]">{m.lead}</p>
            <div className="mt-9 flex w-full max-w-xs animate-rise flex-col gap-3 [animation-delay:220ms] sm:max-w-none sm:flex-row sm:justify-center lg:justify-start">
              <form action={startTrial} className="contents">
                <button type="submit" className={`${buttonStyles.primary} h-14 whitespace-nowrap px-8`}>{m.tryDemo}</button>
              </form>
              <ButtonLink href="/signup" variant="soft" className="h-14 whitespace-nowrap px-8">{m.createAccount}</ButtonLink>
            </div>
            <p className="mt-4 animate-fade text-sm text-ink-soft [animation-delay:300ms]">{t.startHint(TRIAL_MINUTES)}</p>
            <p className="mt-1.5 max-w-md animate-fade text-xs leading-relaxed text-ink-faint [animation-delay:300ms]">
              {t.startNote[0]}
              <Link href="/terms" className="underline underline-offset-2 hover:text-ink-soft">{t.startNote[1]}</Link>
              {t.startNote[2]}
            </p>
            <Link href="/guide" className="group mt-5 inline-flex animate-fade items-center gap-2 rounded-full bg-paper/80 py-2 pl-2 pr-4 text-sm font-medium text-ink shadow-soft transition hover:shadow-lift [animation-delay:380ms]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lilac-deep text-paper">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 translate-x-px" fill="currentColor" aria-hidden><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
              </span>
              {g.welcomeLink}
            </Link>
          </div>
        </div>
      </main>

      <footer className="px-5 pb-8 text-center text-xs leading-relaxed text-ink-faint">
        <p>{m.footer}</p>
        <p className="mt-2">
          {a.footer}
          <span className="mx-2 text-line">·</span>
          <a href={AUTHOR_TEL_HREF} className="whitespace-nowrap underline-offset-4 transition-colors hover:text-ink-soft hover:underline">
            {AUTHOR_PHONE_DISPLAY}
          </a>
          <span className="mx-2 text-line">·</span>
          <a href={AUTHOR_WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" className="underline-offset-4 transition-colors hover:text-ink-soft hover:underline">
            {a.whatsapp}
          </a>
        </p>
        <p className="mt-2 flex justify-center gap-4">
          <Link href="/privacy" className="hover:text-ink">{legal.links.privacy}</Link>
          <Link href="/terms" className="hover:text-ink">{legal.links.terms}</Link>
          <Link href="/pro/join" className="hover:text-ink">{pm.proTitle}</Link>
        </p>
      </footer>
    </div>
  );
}
