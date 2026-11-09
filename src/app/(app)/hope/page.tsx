export const dynamic = "force-dynamic";

import { hopePrompts, hopeQuestions, hopeThoughts, reflections, pickForDay } from "@/lib/content";
import { getLocale } from "@/i18n/server";
import { hope } from "@/i18n/hope";
import { StartForm } from "@/components/StartForm";
import { Gratitude } from "@/components/Gratitude";
import { PageHeader } from "@/components/ui";
import { ArrowIcon } from "@/components/icons";

export default async function HopePage() {
  const locale = await getLocale();
  const m = hope[locale];
  const thought = pickForDay(hopeThoughts(locale));
  const question = pickForDay(hopeQuestions(locale), 2);

  return (
    <>
      <PageHeader title={m.title}>{m.intro}</PageHeader>

      <div className="stagger space-y-12">
        <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#a9b4ff] via-[#c7b2f5] to-[#ffc9b5] px-7 pb-12 pt-10 shadow-lift sm:px-12 sm:pb-14 sm:pt-12">
          <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 animate-morph bg-paper/30" aria-hidden />
          <span className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 animate-morph bg-paper/20 [animation-delay:-6s]" aria-hidden />
          <p className="relative mb-16 inline-flex rounded-full bg-paper/40 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-ink/70 sm:mb-20">{m.thoughtToday}</p>
          <blockquote className="relative max-w-xl font-serif text-[23px] leading-[1.25] text-ink sm:text-[32px]">
            {thought.text}
          </blockquote>
          <p className="relative mt-5 max-w-md text-[15px] text-ink/70">{thought.note}</p>
        </section>

        <section>
          <h2 className="mb-1 font-serif text-[22px] text-ink">{m.talkImportant}</h2>
          <p className="mb-5 text-[15px] text-ink-soft">{m.talkImportantHint}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {hopePrompts(locale).map((p) => (
              <StartForm
                key={p.title}
                mode="hope"
                title={p.title}
                prompt={p.text}
                className="group flex w-full items-center justify-between gap-3 lift rounded-[22px] bg-paper shadow-soft px-5 py-4 text-left"
              >
                <span className="text-[15px] text-ink">{p.title}</span>
                <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </StartForm>
            ))}
          </div>
        </section>

        <section className="rounded-[30px] bg-sage-soft p-6 sm:p-8">
          <h2 className="mb-1 font-serif text-[22px] text-ink">{m.threeGood}</h2>
          <p className="mb-6 text-[15px] text-ink-soft">
            {m.threeGoodHint}
          </p>
          <Gratitude />
        </section>

        <section>
          <h2 className="mb-5 font-serif text-[22px] text-ink">{m.reflections}</h2>
          <div className="space-y-3">
            {reflections(locale).map((r) => (
              <details key={r.title} className="group rounded-[22px] bg-paper shadow-soft px-6 py-5 open:shadow-soft">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[16px] text-ink">
                  {r.title}
                  <span className="text-ink-faint transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 font-serif text-[16.5px] leading-[1.75] text-ink-soft">{r.body}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-dashed border-lilac/60 px-6 py-8 text-center sm:px-10">
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-lilac-deep">{m.questionTitle}</p>
          <p className="mx-auto max-w-lg font-serif text-[21px] leading-snug text-ink">{question}</p>
          <StartForm
            mode="hope"
            title={m.questionTitle}
            prompt={m.questionPrompt(question)}
            className="mt-6 rounded-full bg-paper px-5 py-2.5 text-sm text-ink shadow-soft transition hover:shadow-lift"
          >
            {m.thinkTogether}
          </StartForm>
        </section>
      </div>
    </>
  );
}
