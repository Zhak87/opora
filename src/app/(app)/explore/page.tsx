import Link from "next/link";
import { getTopics } from "@/lib/topics";
import { getLocale } from "@/i18n/server";
import { topicsPage } from "@/i18n/topics";
import { StartForm } from "@/components/StartForm";
import { PageHeader, toneBg, toneText } from "@/components/ui";
import { ArrowIcon, BackIcon } from "@/components/icons";
import { playMessages } from "@/i18n/play";

export default async function ExplorePage() {
  const locale = await getLocale();
  const m = topicsPage[locale];
  const p = playMessages[locale].explore;
  return (
    <>
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {m.home}
      </Link>
      <PageHeader title={m.title}>
        {m.intro}
      </PageHeader>
      <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {getTopics(locale).map((t) => (
          <StartForm
            key={t.slug}
            topic={t.slug}
            className={`group flex h-full w-full flex-col justify-between rounded-[26px] ${toneBg[t.tone]} p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:min-h-[148px] sm:p-6`}
          >
            <span className={`mb-6 h-2.5 w-2.5 rounded-full bg-current opacity-60 ${toneText[t.tone]}`} />
            <span>
              <span className="block hyphens-auto break-words text-[15px] font-medium text-ink sm:text-[17px]">{t.title}</span>
              <span className="mt-1 block text-[13px] leading-snug text-ink-soft">{t.hint}</span>
            </span>
          </StartForm>
        ))}
      </div>
      <Link
        href="/tools/mirror"
        className="group mt-6 flex items-center gap-4 rounded-[28px] p-5 text-paper shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift sm:p-6"
        style={{ background: "radial-gradient(120% 100% at 50% 110%,#56508f,#2a2762 50%,#12133a)" }}
      >
        <span className="relative h-11 w-9 shrink-0 overflow-hidden rounded-[50%] border-2 border-[#e6d3a8] bg-gradient-to-b from-[#6f6bb8] to-[#2c2a66]" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-medium">{p.mirrorTitle}</span>
          <span className="mt-0.5 block text-[13.5px] leading-snug text-paper/70">{p.mirrorHint}</span>
        </span>
        <ArrowIcon className="h-4 w-4 shrink-0 text-paper/70 transition group-hover:translate-x-0.5" />
      </Link>
      <div className="mt-10 text-center text-sm text-ink-faint">
        {m.notFound}{" "}
        <StartForm className="text-sky-deep underline-offset-4 hover:underline">{m.justStart}</StartForm>
      </div>
    </>
  );
}
