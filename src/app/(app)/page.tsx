import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { greeting, relativeDate } from "@/lib/format";
import { dailyQuestions, pickForDay } from "@/lib/content";
import { getLocale } from "@/i18n/server";
import { home } from "@/i18n/home";
import { Mascot } from "@/components/Mascot";
import { StartForm } from "@/components/StartForm";
import { latestPlan } from "@/lib/plan-data";
import { currentCourse } from "@/lib/course-data";
import { courseState } from "@/lib/course";
import { courseMessages } from "@/i18n/course";
import { TipCheck } from "@/components/plan/TipCheck";
import { TalkIcon, CompassIcon, PenIcon, ArrowIcon, HeartHandIcon, ShieldIcon, GridIcon } from "@/components/icons";
import { panelMessages } from "@/i18n/admin";
import { adminPending, hasCare } from "@/lib/pro";
import { scheduleMessages } from "@/i18n/schedule";
import { wellbeingMessages } from "@/i18n/wellbeing";
import { getTimeZone } from "@/lib/tz";
import { dayKey } from "@/lib/time";
import { intakeSeen } from "@/lib/intake";
import { IntakeCard } from "@/components/IntakeCard";
import { GUIDE_COOKIE, guideSeen } from "@/lib/guide";
import { Needs } from "@/components/Needs";
import { needForMood } from "@/lib/needs";
import { PushOptIn } from "@/components/PushOptIn";
import { pushConfig } from "@/lib/push-config";
import { isGuest } from "@/lib/trial";
import { dreamMessages } from "@/i18n/dreams";
import { DreamHomeLink } from "@/components/dreams/DreamJournal";

// Плитки настроения 1–5 на главной: ведут к отметке дня.
const MOOD_TILES = [
  [1, "bg-peach-soft", "😣"],
  [2, "bg-rose-soft", "😔"],
  [3, "bg-lilac-soft", "😐"],
  [4, "bg-mist", "🙂"],
  [5, "bg-sage-soft", "😌"],
] as const;

export default async function HomePage() {
  const { supabase, user } = await requireUser();
  // При первом входе сначала показываем знакомство с Опорой.
  const { data: session } = await supabase.auth.getClaims();
  if (user && !guideSeen(session?.claims, (await cookies()).get(GUIDE_COOKIE)?.value)) redirect("/guide");
  const locale = await getLocale();
  const m = home[locale];
  const today = dayKey(new Date(), await getTimeZone());
  const [{ data: profile }, { data: recent }, stored, course, care, { data: checkin }, pending] = await Promise.all([
    supabase.from("profiles").select("name, intake").eq("id", user!.id).single(),
    supabase.from("conversations").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(3),
    latestPlan(supabase),
    currentCourse(supabase),
    hasCare(supabase, user!.id),
    supabase.from("checkins").select("mood").eq("user_id", user!.id).eq("day", today).maybeSingle(),
    adminPending(supabase).catch(() => null),
  ]);
  const wb = wellbeingMessages[locale].checkin;
  const suggest = scheduleMessages[locale].catalog;
  const tipIndex = stored ? Math.floor(Date.now() / 86_400_000) % stored.plan.tips.length : 0;
  const question = pickForDay(dailyQuestions(locale));
  const name = profile?.name;
  const showIntake = profile && !intakeSeen(profile.intake);
  const push = user && !isGuest(session?.claims) ? pushConfig() : null;

  return (
    <div className="stagger">
      {/* Видно только администраторам: вход в проверку анкет психологов */}
      {pending !== null && (
        <Link
          href="/admin/psychologists"
          className="group mb-6 flex items-center gap-4 rounded-[26px] bg-mist px-5 py-4 shadow-soft transition hover:shadow-lift"
        >
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-paper text-sky-deep">
            <ShieldIcon className="h-6 w-6" />
            {pending > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-lilac-deep px-1 text-[11px] font-semibold text-paper">
                {pending}
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium text-ink">{m.adminTitle}</span>
            <span className="mt-0.5 block text-sm text-ink-soft">{m.adminHint(pending)}</span>
          </span>
          <ArrowIcon className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
        </Link>
      )}
      {/* Тоже только сотрудникам: панель с цифрами, пользователями и ролями */}
      {pending !== null && (
        <Link
          href="/admin"
          className="group -mt-3 mb-6 flex items-center gap-4 rounded-[26px] bg-lilac-soft px-5 py-4 shadow-soft transition hover:shadow-lift"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-paper text-lilac-deep">
            <GridIcon className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium text-ink">{panelMessages[locale].homeLink}</span>
            <span className="mt-0.5 block text-sm text-ink-soft">{panelMessages[locale].homeHint}</span>
          </span>
          <ArrowIcon className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
        </Link>
      )}
      {/* Капля смотрит на человека и меняет цвет под сегодняшнее настроение */}
      <section className="mb-8 flex flex-col items-center text-center sm:mb-10">
        <Mascot mood={checkin?.mood ?? 3} />
        <p className="mt-3 text-[15px] text-ink-soft">
          {greeting(new Date(), locale)}
          {name ? `, ${name}` : ""}
        </p>
        <h1 className="mt-1.5 font-serif text-[30px] leading-[1.1] text-ink sm:text-[42px]">{m.howAreYou}</h1>
        <Link href="/wellbeing" className="group mt-5 flex flex-col items-center gap-2" aria-label={checkin ? wb.homeDone : wb.homeTitle}>
          <span className="flex gap-2" aria-hidden>
            {MOOD_TILES.map(([v, bg, face]) => (
              <span
                key={v}
                className={`flex h-11 w-11 items-center justify-center rounded-[15px] text-[20px] transition duration-300 group-hover:-translate-y-0.5 sm:h-12 sm:w-12 ${bg} ${
                  checkin?.mood === v ? "ring-2 ring-lilac-deep ring-offset-2 ring-offset-milk" : checkin ? "opacity-45" : ""
                }`}
                style={{ transitionDelay: `${v * 30}ms` }}
              >
                {face}
              </span>
            ))}
          </span>
          <span className="text-sm text-ink-soft transition group-hover:text-ink">{checkin ? wb.homeDone : wb.homeTitle}</span>
        </Link>
      </section>

      {push && <PushOptIn publicKey={push.publicKey} locale={locale} prompt />}

      {/* Три главных действия: «Поговорить» — большая тёмная плитка, остальные рядом */}
      <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-[1.25fr_1fr_1fr] sm:gap-4">
        <StartForm className="lift group col-span-2 flex min-h-[132px] w-full flex-col justify-between rounded-[30px] bg-ink p-5 text-left text-paper shadow-lift sm:col-span-1 sm:min-h-[180px] sm:p-6">
          <span className="flex w-full items-start justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-lilac-deep">
              <TalkIcon className="h-6 w-6" />
            </span>
            <ArrowIcon className="h-5 w-5 text-paper/50 transition group-hover:translate-x-1 group-hover:text-paper" />
          </span>
          <span>
            <span className="block font-display text-[18px] font-medium tracking-[-0.02em]">{m.talk}</span>
            <span className="mt-0.5 block text-sm text-paper/60">{m.talkHint}</span>
          </span>
        </StartForm>
        <ActionLink href="/explore" title={m.explore} hint={m.exploreHint} tone="bg-mist text-sky-deep" Icon={CompassIcon} />
        <ActionLink href="/journal" title={m.journal} hint={m.journalHint} tone="bg-sage-soft text-sage-deep" Icon={PenIcon} />
      </section>

      {/* По потребностям: человек выбирает, что ему нужно, а не раздел приложения */}
      <Needs initial={needForMood(checkin?.mood)} />

      {showIntake && <IntakeCard />}

      <CourseCard course={course} c={courseMessages[locale].home} />

      <Link
        href="/play"
        className="group mb-4 flex items-center gap-5 overflow-hidden lift rounded-[30px] bg-paper p-5 shadow-soft sm:p-6"
      >
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center" aria-hidden>
          <span className="absolute h-14 w-14 animate-morph bg-gradient-to-br from-sage-soft to-mist" />
          <span className="absolute h-6 w-6 animate-morph bg-paper [animation-delay:-5s]" />
        </span>
        <span className="flex-1">
          <span className="block text-[17px] font-medium text-ink">{m.play}</span>
          <span className="mt-0.5 block text-sm text-ink-soft">{m.playHint}</span>
        </span>
        <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
      </Link>

      <DreamHomeLink title={dreamMessages[locale].homeTitle} hint={dreamMessages[locale].homeHint} />

      {stored && (
        <section className="mb-10 rounded-[30px] bg-sage-soft p-6 sm:p-8">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.14em] text-sage-deep">{m.tipToday}</p>
            <Link href="/play/me" className="shrink-0 text-sm text-ink-faint hover:text-ink">
              {m.allTips}
            </Link>
          </div>
          <TipCheck
            compact
            planId={stored.id}
            index={tipIndex}
            tip={stored.plan.tips[tipIndex]}
            days={stored.progress.tips?.[tipIndex] ?? []}
          />
        </section>
      )}

      <section className="mb-10 relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#a9b4ff] via-[#c7b2f5] to-[#ffc9b5] p-6 sm:p-8">
        <span className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 animate-morph bg-paper/30" aria-hidden />
        <p className="relative mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink/60">{m.questionOfDay}</p>
        <p className="relative font-serif text-[20px] leading-snug text-ink sm:text-[26px]">{question}</p>
        <div className="relative mt-6 flex flex-wrap gap-2">
          <Link
            href={`/journal?q=${encodeURIComponent(question)}`}
            className="rounded-full bg-paper px-4 py-2 text-sm text-ink shadow-soft transition hover:shadow-lift"
          >
            {m.answerInJournal}
          </Link>
          <StartForm
            prompt={m.discussPrompt(question)}
            className="rounded-full bg-paper/40 px-4 py-2 text-sm text-ink transition hover:bg-paper/70"
          >
            {m.discuss}
          </StartForm>
        </div>
      </section>

      {recent && recent.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between px-1">
            <h2 className="text-[15px] text-ink-soft">{m.continueTalk}</h2>
            <Link href="/talk" className="text-sm text-ink-faint hover:text-ink">{m.all}</Link>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-[26px] bg-paper shadow-soft">
            {recent.map((c) => (
              <li key={c.id}>
                <Link href={`/talk/${c.id}`} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-sand/60">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-ink">{c.title}</span>
                    <span className="text-xs text-ink-faint">{relativeDate(c.updated_at, locale)}</span>
                  </span>
                  <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Ненавязчиво: живой специалист как возможность, а не условие. */}
      {!care && (
        <Link
          href="/specialists"
          className="group mt-10 flex items-center gap-4 rounded-[26px] border-2 border-dashed border-sand-deep px-5 py-4 transition hover:border-lilac hover:bg-paper"
        >
          <HeartHandIcon className="h-6 w-6 shrink-0 text-lilac-deep" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] text-ink">{suggest.suggestTitle}</span>
            <span className="mt-0.5 block text-sm leading-relaxed text-ink-soft">{suggest.suggestText}</span>
          </span>
          <ArrowIcon className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
        </Link>
      )}
    </div>
  );
}

// Курс «Мой путь»: если идёт — день и прогресс, иначе приглашение собрать курс.
function CourseCard({
  course,
  c,
}: {
  course: Awaited<ReturnType<typeof currentCourse>>;
  c: (typeof courseMessages)["ru"]["home"];
}) {
  const active = course && course.course.status === "active" ? course : null;
  if (!active)
    return (
      <Link
        href="/course/new"
        className="group mb-4 flex items-center gap-5 overflow-hidden lift rounded-[30px] bg-paper p-5 shadow-soft sm:p-6"
      >
        <span className="flex h-14 w-14 shrink-0 items-end justify-center gap-1 pb-3" aria-hidden>
          {[10, 18, 26].map((h) => (
            <span key={h} className="w-2.5 rounded-full bg-gradient-to-t from-lilac-deep to-peach" style={{ height: h }} />
          ))}
        </span>
        <span className="flex-1">
          <span className="block text-[17px] font-medium text-ink">{c.ctaTitle}</span>
          <span className="mt-0.5 block text-sm text-ink-soft">{c.ctaHint}</span>
        </span>
        <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
      </Link>
    );
  const { course: k, days } = active;
  const state = courseState(k, days);
  const n = Math.min(state.current, k.length);
  const r = 24;
  const len = 2 * Math.PI * r;
  return (
    <Link
      href={state.lockedUntilTomorrow ? "/course" : `/course/day/${n}`}
      className="group mb-4 flex items-center gap-5 overflow-hidden lift rounded-[30px] bg-ink p-5 text-paper shadow-lift sm:p-6"
    >
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
        <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="28" cy="28" r={r} fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="3" />
          <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-lilac)" strokeWidth="3" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - state.done / k.length)} />
        </svg>
        <span className="font-display text-[17px] font-medium">{n}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs uppercase tracking-[0.14em] text-paper/55">
          {c.eyebrow} · {c.dayOf(n, k.length)}
        </span>
        <span className="mt-1 block truncate text-[17px] font-medium">{k.plan.days[n - 1]?.title}</span>
        <span className="mt-0.5 block text-sm text-paper/60">{state.lockedUntilTomorrow ? c.doneToday : k.plan.title}</span>
      </span>
      {!state.lockedUntilTomorrow && (
        <span className="hidden shrink-0 rounded-full bg-paper px-4 py-2 text-sm font-medium text-ink sm:inline">{c.go}</span>
      )}
    </Link>
  );
}

function ActionLink({
  href,
  title,
  hint,
  tone,
  Icon,
}: {
  href: string;
  title: string;
  hint: string;
  tone: string;
  Icon: (p: { className?: string }) => React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="lift group flex min-h-[150px] flex-col justify-between gap-4 rounded-[30px] bg-paper p-4 shadow-soft sm:min-h-[180px] sm:p-6"
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${tone}`}>
        <Icon className="h-6 w-6" />
      </span>
      <span>
        <span className="block font-display text-[15px] font-medium leading-tight tracking-[-0.02em] text-ink sm:text-[17px]">{title}</span>
        <span className="mt-1 block text-[13px] leading-snug text-ink-soft sm:text-sm">{hint}</span>
      </span>
    </Link>
  );
}
