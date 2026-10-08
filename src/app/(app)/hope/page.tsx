export const dynamic = "force-dynamic";

import { HOPE_PROMPTS, HOPE_QUESTIONS, HOPE_THOUGHTS, REFLECTIONS, pickForDay } from "@/lib/content";
import { StartForm } from "@/components/StartForm";
import { Gratitude } from "@/components/Gratitude";
import { PageHeader } from "@/components/ui";
import { ArrowIcon } from "@/components/icons";

export default function HopePage() {
  const thought = pickForDay(HOPE_THOUGHTS);
  const question = pickForDay(HOPE_QUESTIONS, 2);

  return (
    <>
      <PageHeader title="Надежда">Тихое место, чтобы вспомнить, на что можно опереться.</PageHeader>

      <div className="stagger space-y-12">
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#f6efe4] via-lilac-soft to-mist px-7 py-12 text-center shadow-soft sm:px-14 sm:py-16">
          <div
            className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-[120%] -translate-x-1/2 rounded-[100%] opacity-60"
            style={{ background: "radial-gradient(closest-side, #fffdf9, transparent)" }}
            aria-hidden
          />
          <p className="relative mb-5 text-xs uppercase tracking-[0.16em] text-lilac-deep">Мысль на сегодня</p>
          <blockquote className="relative mx-auto max-w-xl font-serif text-[24px] leading-snug text-ink sm:text-[30px]">
            {thought.text}
          </blockquote>
          <p className="relative mx-auto mt-5 max-w-md text-[15px] text-ink-soft">{thought.note}</p>
        </section>

        <section>
          <h2 className="mb-1 font-serif text-[22px] text-ink">Поговорить о важном</h2>
          <p className="mb-5 text-[15px] text-ink-soft">О будущем, смысле и вашем пути.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {HOPE_PROMPTS.map((p) => (
              <StartForm
                key={p.title}
                mode="hope"
                title={p.title}
                prompt={p.text}
                className="group flex w-full items-center justify-between gap-3 rounded-[22px] border border-line/70 bg-paper/80 px-5 py-4 text-left transition hover:shadow-soft"
              >
                <span className="text-[15px] text-ink">{p.title}</span>
                <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </StartForm>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-line/70 bg-sage-soft/50 p-6 sm:p-8">
          <h2 className="mb-1 font-serif text-[22px] text-ink">Три хороших вещи</h2>
          <p className="mb-6 text-[15px] text-ink-soft">
            Короткая практика благодарности. Вспомните три вещи, даже совсем небольшие, которые сегодня были хорошими.
          </p>
          <Gratitude />
        </section>

        <section>
          <h2 className="mb-5 font-serif text-[22px] text-ink">Размышления</h2>
          <div className="space-y-3">
            {REFLECTIONS.map((r) => (
              <details key={r.title} className="group rounded-[22px] border border-line/70 bg-paper/75 px-6 py-5 open:shadow-soft">
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
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-lilac-deep">Вопрос для размышления</p>
          <p className="mx-auto max-w-lg font-serif text-[21px] leading-snug text-ink">{question}</p>
          <StartForm
            mode="hope"
            title="Вопрос для размышления"
            prompt={`Хочу подумать над вопросом: «${question}»`}
            className="mt-6 rounded-full bg-paper px-5 py-2.5 text-sm text-ink shadow-soft transition hover:shadow-lift"
          >
            Подумать вместе
          </StartForm>
        </section>
      </div>
    </>
  );
}
