import type { Metadata } from "next";
import Link from "next/link";
import { HELP_PAGES, HELP_UI } from "@/content/help";
import { HelpCta, HelpShell } from "@/components/HelpShell";
import { publicMetadata } from "@/lib/seo";

const ui = HELP_UI.ru;

export const metadata: Metadata = publicMetadata("/help", ui.hubTitle, ui.hubDescription);

// Оглавление статей: отсюда поисковик находит все статьи, а человек — нужную тему.
export default function HelpIndex() {
  const groups = [
    { lang: "ru" as const, pages: HELP_PAGES.filter((p) => p.lang === "ru") },
    { lang: "kk" as const, pages: HELP_PAGES.filter((p) => p.lang === "kk") },
  ];
  return (
    <HelpShell lang="ru">
      <h1 className="font-serif text-[32px] leading-[1.1] text-ink sm:text-[46px]">{ui.hubH1}</h1>
      <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">{ui.hubLead}</p>
      <div className="mt-8"><HelpCta lang="ru" primary="talk" /></div>
      {groups.map((g) => (
        <section key={g.lang} lang={g.lang} className="mt-12">
          {g.lang === "kk" && <h2 className="mb-4 font-serif text-[24px] text-ink">{HELP_UI.kk.hubH1}</h2>}
          <ul className="grid gap-3 sm:grid-cols-2">
            {g.pages.map((p) => (
              <li key={p.slug}>
                <Link href={`/help/${p.slug}`} className="block h-full rounded-3xl bg-paper/80 px-5 py-4 shadow-soft transition hover:shadow-lift">
                  <span className="block text-[16px] font-medium text-ink">{p.h1}</span>
                  <span className="mt-1.5 block text-[14px] leading-relaxed text-ink-soft">{p.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </HelpShell>
  );
}
