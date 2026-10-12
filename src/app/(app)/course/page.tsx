import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { currentCourse } from "@/lib/course-data";
import { courseState } from "@/lib/course";
import { getLocale } from "@/i18n/server";
import { courseMessages } from "@/i18n/course";
import { ButtonLink } from "@/components/ui";
import { BackIcon } from "@/components/icons";
import { MoodSpark, PathMap } from "@/components/course/PathMap";
import { EmailToggle, StopCourse } from "@/components/course/CourseControls";

export default async function CoursePage() {
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const t = courseMessages[locale];
  const m = t.overview;
  const found = await currentCourse(supabase);
  if (!found) redirect("/course/new");
  const { course, days } = found;
  const { plan, length } = course;
  const state = courseState(course, days);
  const n = Math.min(state.current, length);
  const day = plan.days[n - 1];
  const next = plan.days[n];
  const pct = Math.round((state.done / length) * 100);

  return (
    <>
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {m.back}
      </Link>

      <header className="mb-8 animate-rise">
        <p className="mb-2 text-sm text-ink-soft">
          {t.brand} · {state.finished ? t.home.finished : m.dayOf(n, length)}
        </p>
        <h1 className="font-serif text-[32px] leading-tight text-ink sm:text-[40px]">{plan.title}</h1>
        {plan.promise && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">{plan.promise}</p>}
        <div className="mt-6 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-line/80">
            <div className="h-full rounded-full bg-gradient-to-r from-sky via-lilac to-sage transition-all duration-1000" style={{ width: `${Math.max(pct, 2)}%` }} />
          </div>
          <span className="text-sm tabular-nums text-ink-soft">{pct}%</span>
        </div>
      </header>

      <div className="stagger space-y-8">
        {/* Главное действие экрана: занятие на сегодня */}
        {state.finished ? (
          <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-sage-soft via-paper to-lilac-soft p-7 shadow-lift sm:p-10">
            <p className="font-serif text-[28px] leading-tight text-ink">{m.finishedTitle}</p>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">{m.finishedText}</p>
            <ButtonLink href="/course/new" className="mt-7">
              {m.newCourse}
            </ButtonLink>
          </section>
        ) : state.lockedUntilTomorrow ? (
          <section className="rounded-[32px] border border-line/70 bg-gradient-to-br from-paper via-mist/50 to-lilac-soft/60 p-7 shadow-soft sm:p-9">
            <p className="text-xs uppercase tracking-[0.14em] text-sage-deep">✓ {m.todayDone}</p>
            <p className="mt-3 font-serif text-[26px] leading-tight text-ink">{m.lockedTitle(n)}</p>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft">{m.lockedText}</p>
            <div className="mt-6 rounded-[20px] bg-paper/80 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.14em] text-lilac-deep">{m.tomorrow}</p>
              <p className="mt-1 text-[16px] text-ink">{day.title}</p>
            </div>
          </section>
        ) : (
          <Link
            href={`/course/day/${n}`}
            className="group relative block overflow-hidden rounded-[32px] bg-ink p-7 text-paper shadow-lift transition-all duration-300 hover:-translate-y-0.5 sm:p-9"
          >
            <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 animate-breathe rounded-full bg-gradient-to-br from-lilac/40 via-sky/30 to-sage/30 blur-2xl" aria-hidden />
            <span className="relative block text-xs uppercase tracking-[0.14em] text-paper/60">
              {m.today} · {m.minutes(day.minutes)}
            </span>
            <span className="relative mt-3 block font-serif text-[28px] leading-tight sm:text-[32px]">{day.title}</span>
            <span className="relative mt-2 block max-w-md text-[15px] leading-relaxed text-paper/70">{day.focus}</span>
            <span className="relative mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-paper px-6 text-[15px] font-medium text-ink transition group-hover:gap-3">
              {m.start(n)} <span aria-hidden>→</span>
            </span>
            {next && (
              <span className="relative mt-5 block text-xs text-paper/50">
                {m.tomorrow}: {next.title}
              </span>
            )}
          </Link>
        )}

        <section className="grid grid-cols-3 gap-2 sm:gap-3">
          <Stat value={state.streak} label={m.streak(state.streak)} tone="from-lilac-soft" />
          <Stat value={state.done} label={m.doneLabel(state.done)} tone="from-sage-soft" />
          <div className="rounded-[22px] border border-line/60 bg-gradient-to-br from-mist to-paper p-4">
            <p className="text-xs text-ink-soft">{m.mood}</p>
            {state.moods.length ? (
              <>
                <MoodSpark moods={state.moods} />
                <p className="text-[11px] leading-tight text-ink-faint">{m.moodHint}</p>
              </>
            ) : (
              <p className="mt-2 text-[12px] leading-snug text-ink-faint">{m.moodEmpty}</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-4 px-1 text-[15px] text-ink-soft">{m.path}</h2>
          <PathMap plan={plan} length={length} state={state} weekLabel={m.week} />
        </section>

        {course.status === "active" && user?.email && <EmailToggle courseId={course.id} on={course.email_daily} email={user.email} />}

        {course.status === "active" && (
          <div className="pt-2 text-center">
            <StopCourse courseId={course.id} />
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className={`rounded-[22px] border border-line/60 bg-gradient-to-br ${tone} to-paper p-4`}>
      <p className="font-serif text-[30px] leading-none text-ink">{value}</p>
      <p className="mt-2 text-[12px] leading-snug text-ink-soft">{label}</p>
    </div>
  );
}
