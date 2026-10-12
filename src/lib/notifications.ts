import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/config";
import { notificationMessages } from "@/i18n/notifications";
import { currentCourse } from "./course-data";
import { courseState, todayIn, weekOf } from "./course";
import { latestPlan } from "./plan-data";
import { dailyQuestions, pickForDay } from "./content";

// Центр уведомлений внутри приложения. Уведомления не хранятся в базе: они собираются на лету
// из состояния курса, личного плана и вопроса дня, а прочитанные отмечаются в cookie этого браузера.

export type Notice = {
  id: string;
  kind: "course" | "milestone" | "tip" | "question";
  title: string;
  text: string;
  href: string;
};

export const SEEN_COOKIE = "opora-seen"; // пишет MarkSeen в браузере

export async function seenIds() {
  const raw = (await cookies()).get(SEEN_COOKIE)?.value ?? "";
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {}
  return new Set(value.split("|").filter(Boolean));
}

const MILESTONES = new Set([3, 7, 14, 21, 30]);

export async function buildNotifications(supabase: SupabaseClient, locale: Locale): Promise<Notice[]> {
  const m = notificationMessages[locale];
  const [found, plan] = await Promise.all([currentCourse(supabase), latestPlan(supabase)]);
  const today = todayIn(found?.course.tz ?? "Asia/Almaty");
  const list: Notice[] = [];

  if (!found) {
    list.push({ id: `course-invite:${today}`, kind: "course", title: m.noCourse, text: m.noCourseText, href: "/course/new" });
  } else {
    const { course, days } = found;
    const state = courseState(course, days, today);
    const n = Math.min(state.current, course.length);
    const day = course.plan.days[n - 1];
    if (state.finished) {
      list.push({ id: `course-finished:${course.id}`, kind: "milestone", title: m.courseFinished, text: m.courseFinishedText, href: "/course" });
    } else if (state.lockedUntilTomorrow) {
      list.push({ id: `course-done:${today}`, kind: "course", title: m.courseDoneToday(n - 1), text: m.courseTomorrow(day.title), href: "/course" });
      // Сегодня закончилась неделя пути.
      if (weekOf(n, course.length) !== weekOf(n - 1, course.length)) {
        const week = course.plan.weeks[weekOf(n - 1, course.length)];
        list.push({ id: `week-done:${course.id}:${n - 1}`, kind: "milestone", title: m.weekDone(week?.title ?? ""), text: m.weekDoneText, href: "/course" });
      }
    } else if (state.idleDays >= 2 && state.done > 0) {
      list.push({ id: `course-return:${today}`, kind: "course", title: m.courseReturn, text: m.courseReturnText(n, day.title), href: `/course/day/${n}` });
    } else {
      list.push({ id: `course-day:${today}:${n}`, kind: "course", title: m.courseToday(n), text: day.title, href: `/course/day/${n}` });
    }
    if (state.lockedUntilTomorrow && MILESTONES.has(state.streak)) {
      list.push({ id: `streak:${course.id}:${state.streak}`, kind: "milestone", title: m.streak(state.streak), text: m.streakText, href: "/course" });
    }
  }

  if (plan?.plan.tips.length) {
    const tip = plan.plan.tips[Math.floor(Date.now() / 86_400_000) % plan.plan.tips.length];
    list.push({ id: `tip:${today}`, kind: "tip", title: m.tip(tip.title), text: tip.action, href: "/play/me" });
  }

  const question = pickForDay(dailyQuestions(locale));
  list.push({ id: `question:${today}`, kind: "question", title: m.question, text: question, href: `/journal?q=${encodeURIComponent(question)}` });
  return list;
}

export async function unreadCount(supabase: SupabaseClient, locale: Locale) {
  const [list, seen] = await Promise.all([buildNotifications(supabase, locale), seenIds()]);
  return list.filter((n) => !seen.has(n.id)).length;
}
