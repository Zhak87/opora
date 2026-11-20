import Link from "next/link";
import { Orb } from "./Orb";
import { buttonStyles } from "./ui";
import { startTrial } from "@/lib/trial-actions";
import { HELP_UI, type HelpLang } from "@/content/help";

// Оформление открытых статей: язык задаёт сама страница, а не выбор в приложении.
export function HelpShell({ lang, other, children }: { lang: HelpLang; other?: string; children: React.ReactNode }) {
  const ui = HELP_UI[lang];
  return (
    <div lang={lang} className="min-h-dvh">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/welcome" className="flex items-center gap-3">
          <Orb size={34} face />
          <span className="font-display text-[19px] font-semibold lowercase tracking-[-0.03em] text-ink">опора</span>
        </Link>
        {other && (
          <Link href={other} hrefLang={lang === "ru" ? "kk" : "ru"} className="rounded-full bg-paper/80 px-4 py-2 text-sm text-ink-soft shadow-soft hover:text-ink">
            {ui.other}
          </Link>
        )}
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-2 sm:px-8">{children}</main>
    </div>
  );
}

export function HelpCta({ lang, primary }: { lang: HelpLang; primary: "talk" | "specialists" }) {
  const ui = HELP_UI[lang];
  const talk = (
    <form action={startTrial} className="contents" key="talk">
      <button type="submit" className={`${primary === "talk" ? buttonStyles.primary : buttonStyles.soft}`}>{ui.talk}</button>
    </form>
  );
  const spec = (
    <Link key="spec" href="/specialists" className={`${primary === "specialists" ? buttonStyles.primary : buttonStyles.soft}`}>
      {ui.specialists}
    </Link>
  );
  return <div className="flex flex-col gap-3 sm:flex-row">{primary === "talk" ? [talk, spec] : [spec, talk]}</div>;
}
