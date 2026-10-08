import Link from "next/link";
import { TOPICS } from "@/lib/topics";
import { StartForm } from "@/components/StartForm";
import { PageHeader, toneBg, toneText } from "@/components/ui";
import { BackIcon } from "@/components/icons";

export default function ExplorePage() {
  return (
    <>
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> Главная
      </Link>
      <PageHeader title="Разобраться в себе">
        Выберите то, что ближе всего к вашему состоянию. Мы начнём мягко и будем двигаться в вашем темпе.
      </PageHeader>
      <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {TOPICS.map((t) => (
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
      <div className="mt-10 text-center text-sm text-ink-faint">
        Не нашли своё?{" "}
        <StartForm className="text-sky-deep underline-offset-4 hover:underline">Просто начните разговор</StartForm>
      </div>
    </>
  );
}
