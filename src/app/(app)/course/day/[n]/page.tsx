import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { currentCourse } from "@/lib/course-data";
import { courseState, fallbackDay, todayIn, weekOf } from "@/lib/course";
import { getLocale } from "@/i18n/server";
import { courseMessages } from "@/i18n/course";
import { ButtonLink } from "@/components/ui";
import { BackIcon } from "@/components/icons";
import { DayFlow, DayPreparing } from "@/components/course/DayFlow";

export const maxDuration = 60;

export default async function CourseDayPage({ params }: { params: Promise<{ n: string }> }) {
  const { supabase } = await requireUser();
  const t = courseMessages[await getLocale()];
  const m = t.day;
  const found = await currentCourse(supabase);
  if (!found) redirect("/course/new");
  const { course, days } = found;
  const n = Number((await params).n);
  if (!Number.isInteger(n) || n < 1 || n > course.length) notFound();

  const state = courseState(course, days);
  const plan = course.plan.days[n - 1];
  const row = days.find((d) => d.day === n);

  const back = (
    <Link href="/course" className="mb-8 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
      <BackIcon className="h-4 w-4" /> {t.overview.backToPath}
    </Link>
  );

  const week = weekOf(n, course.length);
  const weekEnd = n < course.length && weekOf(n + 1, course.length) !== week;
  const today = todayIn(course.tz);
  // Серия дней с учётом сегодняшнего: вчера пройден → сегодня станет +1.
  const yesterday = new Date(`${today}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const continues = days.some((d) => d.completed_on === yesterday.toISOString().slice(0, 10));
  const flow = {
    courseId: course.id,
    day: n,
    length: course.length,
    title: plan.title,
    minutes: plan.minutes,
    weekEndTitle: weekEnd ? course.plan.weeks[week]?.title ?? null : null,
    nextTitle: course.plan.days[n]?.title ?? null,
    // Если день уже пройден сегодня, серия его уже учитывает.
    streak: row?.completed_on === today ? state.streak : continues ? state.streak + 1 : 1,
    firstMood: days.find((d) => d.day === 1)?.mood_before ?? null,
  };

  // Пройденный день можно перечитать.
  if (row?.completed_on) {
    const c = row.content;
    const review = (
      <>
        <p className="mb-2 text-xs uppercase tracking-[0.14em] text-sage-deep">
          ✓ {m.label(n)} · {m.reviewTitle}
        </p>
        <h1 className="font-serif text-[30px] leading-tight text-ink sm:text-[36px]">{plan.title}</h1>
        <div className="stagger mt-8 space-y-5">
          {c?.letter && (
            <section className="rounded-[28px] border border-line/70 bg-paper/80 p-6 shadow-soft sm:p-8">
              <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">{m.letter}</p>
              <p className="mt-3 whitespace-pre-line font-serif text-[18px] leading-relaxed text-ink">{c.letter}</p>
            </section>
          )}
          {c?.insight && (
            <section className="rounded-[28px] border border-line/60 bg-paper/60 p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">{c.insight.title || m.insight}</p>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{c.insight.text}</p>
            </section>
          )}
          {c?.practice && (
            <section className="rounded-[28px] border border-line/60 bg-mist/40 p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.14em] text-sky-deep">{c.practice.title || m.practice}</p>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink">
                {c.practice.steps.map((s, k) => (
                  <li key={k}>{s.text}</li>
                ))}
              </ol>
            </section>
          )}
          <section className="rounded-[28px] bg-gradient-to-br from-lilac-soft/70 to-paper p-6 sm:p-8">
            <p className="font-serif text-[20px] leading-snug text-ink">{c?.question || m.basicQuestion}</p>
            {row.reflection && (
              <>
                <p className="mt-4 text-xs uppercase tracking-[0.14em] text-lilac-deep">{m.yourAnswer}</p>
                <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{row.reflection}</p>
              </>
            )}
          </section>
          <section className="rounded-[28px] bg-sage-soft/70 p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.14em] text-sage-deep">{m.action}</p>
            <p className="mt-2 text-[16px] text-ink">{c?.action || plan.task}</p>
          </section>
        </div>
      </>
    );
    return (
      <>
        {back}
        <DayFlow {...flow} content={c ?? fallbackDay(plan, m.basicQuestion)} review={review} />
      </>
    );
  }

  if (course.status !== "active" || n !== state.current || state.lockedUntilTomorrow)
    return (
      <>
        {back}
        <div className="rounded-[30px] border border-line/70 bg-paper/80 p-8 text-center shadow-soft">
          <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">{m.label(n)}</p>
          <p className="mt-3 font-serif text-[26px] text-ink">{state.lockedUntilTomorrow && n === state.current ? t.overview.lockedTitle(n) : m.lockedTitle}</p>
          <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-soft">{m.lockedText}</p>
          <ButtonLink href="/course" variant="soft" className="mt-6">
            {m.toPath}
          </ButtonLink>
        </div>
      </>
    );

  if (!row?.content)
    return (
      <>
        {back}
        <DayPreparing courseId={course.id} day={n} />
      </>
    );

  return (
    <>
      {back}
      <DayFlow {...flow} content={row.content} />
    </>
  );
}
