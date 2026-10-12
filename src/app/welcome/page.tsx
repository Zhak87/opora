import Link from "next/link";
import { Orb } from "@/components/Orb";
import { ButtonLink } from "@/components/ui";
import { MusicToggle } from "@/components/Music";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getMsg } from "@/i18n/server";
import { common } from "@/i18n/common";
import { welcomeMessages } from "@/i18n/welcome";
import { legalMessages } from "@/i18n/legal";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const m = await getMsg(welcomeMessages);
  const c = await getMsg(common);
  const legal = await getMsg(legalMessages);
  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-6 sm:px-8">
        <span className="font-serif text-xl text-ink">{c.brand}</span>
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
        <Orb size={180} className="mb-10 animate-fade" />
        <h1 className="max-w-2xl animate-rise font-serif text-[38px] leading-[1.15] text-ink sm:text-[56px]">{m.title}</h1>
        <p className="mt-6 max-w-lg animate-rise text-[17px] leading-relaxed text-ink-soft [animation-delay:120ms]">{m.lead}</p>
        <div className="mt-10 flex w-full max-w-xs animate-rise flex-col gap-3 [animation-delay:220ms] sm:max-w-none sm:flex-row sm:justify-center">
          <ButtonLink href="/demo">{m.tryDemo}</ButtonLink>
          <ButtonLink href="/signup" variant="soft">{m.createAccount}</ButtonLink>
        </div>
        <p className="mt-4 animate-fade text-sm text-ink-faint [animation-delay:300ms]">{m.noEmail}</p>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-ink-faint animate-fade [animation-delay:400ms]">
          {m.feelings.map((f, i) => (
            <span key={f} className="flex items-center gap-3">
              {i > 0 && <span className="h-px w-6 bg-line" />}
              {f}
            </span>
          ))}
        </div>
      </main>

      <footer className="px-5 pb-8 text-center text-xs leading-relaxed text-ink-faint">
        <p>{m.footer}</p>
        <p className="mt-2 flex justify-center gap-4">
          <Link href="/privacy" className="hover:text-ink">{legal.links.privacy}</Link>
          <Link href="/terms" className="hover:text-ink">{legal.links.terms}</Link>
        </p>
      </footer>
    </div>
  );
}
