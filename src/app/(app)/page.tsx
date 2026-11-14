import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { greeting, relativeDate } from "@/lib/format";
import { dailyQuestions, pickForDay } from "@/lib/content";
import { getLocale } from "@/i18n/server";
import { home } from "@/i18n/home";
import { common } from "@/i18n/common";
import { Mascot } from "@/components/Mascot";
import { StartForm } from "@/components/StartForm";
import { latestPlan } from "@/lib/plan-data";
import { currentCourse } from "@/lib/course-data";
import { courseState } from "@/lib/course";
import { courseMessages } from "@/i18n/course";
import { TipCheck } from "@/components/plan/TipCheck";
import { TalkIcon, CompassIcon, ArrowIcon, HeartHandIcon, ShieldIcon, GridIcon, CheckIcon, JournalIcon } from "@/components/icons";
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
import styles from "./Home.module.css";

export default async function HomePage() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/welcome");
  const { data: session } = await supabase.auth.getClaims();
  if (!guideSeen(session?.claims, (await cookies()).get(GUIDE_COOKIE)?.value)) redirect("/guide");

  const [locale, timeZone] = await Promise.all([getLocale(), getTimeZone()]);
  const m = home[locale];
  const now = new Date();
  const today = dayKey(now, timeZone);
  const [{ data: profile }, { data: recent }, stored, course, care, { data: checkin }, pending] = await Promise.all([
    supabase.from("profiles").select("name, intake").eq("id", user.id).single(),
    supabase.from("conversations").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(3),
    latestPlan(supabase),
    currentCourse(supabase),
    hasCare(supabase, user.id),
    supabase.from("checkins").select("mood").eq("user_id", user.id).eq("day", today).maybeSingle(),
    adminPending(supabase).catch(() => null),
  ]);
  const wb = wellbeingMessages[locale].checkin;
  const suggest = scheduleMessages[locale].catalog;
  const dream = dreamMessages[locale];
  const tipIndex = stored?.plan.tips.length ? Math.floor(now.getTime() / 86_400_000) % stored.plan.tips.length : 0;
  const tip = stored?.plan.tips[tipIndex];
  const question = pickForDay(dailyQuestions(locale));
  const name = profile?.name?.trim();
  const push = isGuest(session?.claims) ? null : pushConfig();

  return (
    <div className={styles.home} data-user-home>
      <header className={styles.header}>
        <h1>{greeting(now, locale, timeZone)}{name ? `, ${name}` : ""}</h1>
      </header>

      <section className={styles.welcome} aria-labelledby="home-talk-title">
        <div className={styles.welcomeContent}>
          <h2 id="home-talk-title">{m.talkTitle}</h2>
          <p>{m.talkHint}</p>
          <StartForm className={styles.primary}>
            <TalkIcon className="size-5" />
            {m.talk}
            <ArrowIcon className="size-4" />
          </StartForm>
        </div>
        <div className={styles.mascot}>
          <Mascot mood={checkin?.mood} />
        </div>
      </section>

      <nav className={styles.actions} aria-label={m.quickActions}>
        <QuickLink href="/journal" title={m.journal} image="journal" />
        <QuickLink href="/dreams/new" title={dream.newDream} image="dream" />
        <QuickLink href="/play" title={m.play} image="practices" />
        <QuickLink href="/explore" title={m.explore} image="explore" />
      </nav>

      <div className={styles.activity}>
        <section className={styles.checkin} aria-labelledby="home-checkin-title">
          <h2 id="home-checkin-title">{m.howAreYou}</h2>
          {checkin && (
            <p className={styles.checkinHint}>
              <CheckIcon className="size-4 shrink-0 text-sage-deep" />
              {wb.homeDone}
            </p>
          )}
          <ul className={styles.moods}>
            {m.moodLabels.map((label, index) => {
              const value = index + 1;
              const selected = checkin?.mood === value;
              return (
                <li key={value}>
                  <Link
                    href={`/wellbeing?mood=${value}`}
                    prefetch={false}
                    className={styles.mood}
                    data-mood={value}
                    aria-current={selected ? "true" : undefined}
                  >
                    <span className={styles.moodFace} aria-hidden="true"><span /></span>
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link href="/wellbeing" className={styles.textLink}>
            {m.openCheckin}
            <ArrowIcon className="size-4 shrink-0" />
          </Link>
        </section>
        {recent && recent.length > 0 && (
          <section className={styles.history} aria-labelledby="home-recent">
            <div className={styles.historyHeading}>
              <h2 id="home-recent" className={styles.sectionTitle}>{m.continueTalk}</h2>
              <Link href="/talk" className={styles.textLink}>{m.all} <ArrowIcon className="size-4" /></Link>
            </div>
            <ul className={styles.historyList}>
              {recent.map((conversation) => (
                <li key={conversation.id}>
                  <Link href={`/talk/${conversation.id}`} className={styles.historyLink}>
                    <span className={styles.historyIcon} aria-hidden="true"><TalkIcon className="size-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{conversation.title}</span>
                      <span className="block text-xs text-ink-soft">{relativeDate(conversation.updated_at, locale)}</span>
                    </span>
                    <ArrowIcon className={styles.rowArrow} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <details className={styles.extras}>
        <summary>{m.moreSupport}</summary>
        <Needs initial={needForMood(checkin?.mood)} />
        <section className={styles.question} aria-labelledby="home-question">
          <h2 id="home-question" className={styles.questionLabel}>{m.questionOfDay}</h2>
          <p>{question}</p>
          <div className={styles.questionActions}>
            <Link href={`/journal?q=${encodeURIComponent(question)}`} className={styles.secondary}>
              {m.answerInJournal}
            </Link>
            <StartForm prompt={m.discussPrompt(question)} className={styles.textLink}>
              {m.discuss}
              <ArrowIcon className="size-4" />
            </StartForm>
          </div>
        </section>
        <div className={styles.more}>
          <CourseCard course={course} c={courseMessages[locale].home} />
          <DreamHomeLink title={dream.homeTitle} hint={dream.homeHint} />

          {!care && <ActionLink href="/specialists" title={suggest.suggestTitle} hint={suggest.suggestText} Icon={HeartHandIcon} />}

          {stored && tip && (
            <section className={styles.tip} aria-labelledby="home-tip">
              <div className={styles.historyHeading}>
                <h2 id="home-tip" className={styles.sectionTitle}>{m.tipToday}</h2>
                <Link href="/play/me" className={styles.textLink}>{m.allTips}</Link>
              </div>
              <TipCheck compact planId={stored.id} index={tipIndex} tip={tip} days={stored.progress.tips?.[tipIndex] ?? []} />
            </section>
          )}
        </div>

        {profile && !intakeSeen(profile.intake) && <IntakeCard />}
        {push && <PushOptIn publicKey={push.publicKey} locale={locale} prompt />}
      </details>

      {pending !== null && (
        <section className={styles.staff} aria-labelledby="home-staff">
          <h2 id="home-staff" className={styles.sectionTitle}>{common[locale].staffNavigation}</h2>
          <div className={styles.more}>
            <ActionLink href="/admin/psychologists" title={m.adminTitle} hint={m.adminHint(pending)} Icon={ShieldIcon} />
            <ActionLink href="/admin" title={panelMessages[locale].homeLink} hint={panelMessages[locale].homeHint} Icon={GridIcon} />
          </div>
        </section>
      )}
    </div>
  );
}

function QuickLink({ href, title, image }: { href: string; title: string; image: "journal" | "dream" | "practices" | "explore" }) {
  return (
    <Link href={href} className={styles.quickLink}>
      <Image src={`/home/${image}.webp`} alt="" width={500} height={500} sizes="(min-width: 70rem) 270px, 45vw" data-art={image} />
      <span className={styles.quickLabel}>{title}<ArrowIcon className={styles.rowArrow} /></span>
    </Link>
  );
}

function CourseCard({
  course,
  c,
}: {
  course: Awaited<ReturnType<typeof currentCourse>>;
  c: (typeof courseMessages)["ru"]["home"];
}) {
  if (!course || course.course.status !== "active") {
    return <ActionLink href="/course/new" title={c.ctaTitle} hint={c.ctaHint} Icon={JournalIcon} />;
  }

  const { course: k, days } = course;
  const state = courseState(k, days);
  const day = Math.min(state.current, k.length);
  return (
    <Link href={state.lockedUntilTomorrow ? "/course" : `/course/day/${day}`} className={styles.action}>
      <span className={styles.actionIcon} aria-hidden="true"><JournalIcon className="size-5" /></span>
      <span className={styles.actionText}>
        <span className={styles.actionTitle}>{k.plan.days[day - 1]?.title}</span>
        <span className={styles.actionHint}>{c.dayOf(day, k.length)} · {state.lockedUntilTomorrow ? c.doneToday : k.plan.title}</span>
        <progress className={styles.progress} value={state.done} max={k.length} aria-label={c.eyebrow} />
      </span>
      <ArrowIcon className={styles.rowArrow} />
    </Link>
  );
}

function ActionLink({ href, title, hint, Icon }: {
  href: string;
  title: string;
  hint: string;
  Icon: typeof CompassIcon;
}) {
  return (
    <Link href={href} className={styles.action}>
      <span className={styles.actionIcon} aria-hidden="true"><Icon className="size-5" /></span>
      <span className={styles.actionText}>
        <span className={styles.actionTitle}>{title}</span>
        <span className={styles.actionHint}>{hint}</span>
      </span>
      <ArrowIcon className={styles.rowArrow} />
    </Link>
  );
}
