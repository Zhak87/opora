"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { AIError, aiConfigured, generateJSON } from "@/lib/ai";
import { looksLikeCrisis } from "@/lib/prompt";
import { getTopic } from "@/lib/topics";
import {
  COURSE_LENGTHS,
  DAY_SYSTEM,
  courseLanguageNote,
  courseState,
  fallbackDay,
  normalizeDay,
  normalizeOutline,
  outlineSystem,
  todayIn,
  validTz,
  weekOf,
  type Course,
  type CourseDay,
} from "@/lib/course";
import { getLocale } from "@/i18n/server";
import { courseMessages } from "@/i18n/course";

type Result = { ok: true } | { error: string } | { crisis: true };

async function authed() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/welcome");
  return { supabase, user };
}

function refresh() {
  revalidatePath("/course", "layout");
  revalidatePath("/");
}

export async function createCourse(input: { topic?: string; goal?: string; length: number; email: boolean; tz?: string }): Promise<Result> {
  const { supabase, user } = await authed();
  const locale = await getLocale();
  const err = courseMessages[locale].errors;
  const goal = String(input.goal ?? "").trim().slice(0, 2000);
  // Если человеку сейчас опасно, курс подождёт: сначала живая помощь.
  if (looksLikeCrisis(goal)) return { crisis: true };
  if (!aiConfigured()) return { error: err.notConnected };
  const length = COURSE_LENGTHS.find((l) => l === Number(input.length)) ?? 30;
  const topic = getTopic(input.topic, "ru");

  const [{ data: msgs }, { data: profile }] = await Promise.all([
    supabase.from("messages").select("content, created_at").eq("role", "user").order("created_at", { ascending: false }).limit(40),
    supabase.from("profiles").select("name").eq("id", user.id).single(),
  ]);
  const talk = (msgs ?? [])
    .reverse()
    .map((m) => `— ${m.content.slice(0, 500)}`)
    .join("\n");
  const material = [
    profile?.name ? `Имя: ${profile.name}` : "",
    topic ? `Тема курса: ${topic.title} (${topic.hint}).` : "",
    goal ? `Запрос человека его словами: ${goal}` : "Человек не описал запрос подробно.",
    talk ? `Что человек писал в разговорах раньше (для контекста):\n${talk.slice(-5000)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  let plan = null;
  try {
    plan = normalizeOutline(
      await generateJSON({
        system: outlineSystem(length) + "\n\n" + courseLanguageNote(locale),
        messages: [{ role: "user", content: material }],
        maxTokens: 16384,
      }),
      length,
    );
  } catch (e) {
    console.error("course outline", e);
    if (e instanceof AIError && e.status === 401) return { error: err.badKey };
    return { error: err.busy };
  }
  if (!plan) return { error: err.buildFailed };

  // Одновременно идёт один курс: прежний завершается, его дни сохраняются.
  await supabase.from("courses").update({ status: "stopped" }).eq("user_id", user.id).eq("status", "active");
  const { error } = await supabase.from("courses").insert({
    topic: topic?.slug ?? null,
    goal,
    length,
    plan,
    locale,
    tz: validTz(input.tz),
    email_daily: Boolean(input.email),
  });
  if (error) return { error: err.saveFailed };
  refresh();
  return { ok: true };
}

async function load(courseId: string) {
  const { supabase, user } = await authed();
  const { data } = await supabase
    .from("courses")
    .select("id, topic, goal, length, plan, locale, tz, status, email_daily, created_at")
    .eq("id", courseId)
    .single();
  if (!data) return null;
  const course = data as Course;
  const { data: days } = await supabase
    .from("course_days")
    .select("day, content, mood_before, mood_after, reflection, action_done, completed_on")
    .eq("course_id", courseId)
    .order("day");
  return { supabase, user, course, days: (days ?? []) as CourseDay[] };
}

// Содержание дня собирается, когда человек его открывает: с учётом вчерашнего ответа.
export async function prepareDay(courseId: string, day: number, basic = false): Promise<Result> {
  const locale = await getLocale();
  const t = courseMessages[locale];
  const loaded = await load(courseId);
  if (!loaded) return { error: t.errors.saveFailed };
  const { supabase, course, days } = loaded;
  const state = courseState(course, days);
  if (course.status !== "active" || day !== state.current || state.lockedUntilTomorrow) return { ok: true };
  if (days.find((d) => d.day === day)?.content) return { ok: true };

  const plan = course.plan.days[day - 1];
  let content = basic ? fallbackDay(plan, t.day.basicQuestion) : null;
  if (!content) {
    if (!aiConfigured()) return { error: t.errors.notConnected };
    const prev = days.find((d) => d.day === day - 1);
    const week = course.plan.weeks[weekOf(day, course.length)];
    const topic = getTopic(course.topic, "ru");
    const material = [
      `Курс: «${course.plan.title}», ${course.length} дней. ${course.plan.promise}`,
      topic ? `Тема: ${topic.title}.` : "",
      course.goal ? `Запрос человека: ${course.goal}` : "",
      `Сегодня день ${day} из ${course.length}. Ступень: «${week?.title}» — ${week?.goal}`,
      `План дня: «${plan.title}». ${plan.focus} Маленькое действие: ${plan.task}. Около ${plan.minutes} минут.`,
      day < course.length ? `Завтра будет: «${course.plan.days[day].title}».` : "Это последний день курса: помоги подвести итог пути.",
      prev?.reflection ? `Вчера человек ответил на вопрос дня: «${prev.reflection.slice(0, 1200)}»` : "",
      prev?.mood_before && prev?.mood_after ? `Вчера настроение до занятия ${prev.mood_before}/5, после ${prev.mood_after}/5.` : "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      content = normalizeDay(
        await generateJSON({ system: DAY_SYSTEM + "\n\n" + courseLanguageNote(locale), messages: [{ role: "user", content: material }] }),
      );
    } catch (e) {
      console.error("course day", e);
      if (e instanceof AIError && e.status === 401) return { error: t.errors.badKey };
      return { error: t.day.prepareFailed };
    }
    if (!content) return { error: t.day.prepareFailed };
  }

  const { error } = await supabase.from("course_days").upsert({ course_id: courseId, day, content }, { onConflict: "course_id,day" });
  if (error) return { error: t.errors.saveFailed };
  revalidatePath(`/course/day/${day}`);
  return { ok: true };
}

export async function completeDay(
  courseId: string,
  day: number,
  input: { moodBefore?: number | null; moodAfter?: number | null; reflection?: string; actionDone?: boolean },
): Promise<{ ok: true; crisis: boolean } | { error: string }> {
  const t = courseMessages[await getLocale()];
  const loaded = await load(courseId);
  if (!loaded) return { error: t.errors.saveFailed };
  const { supabase, course, days } = loaded;
  const state = courseState(course, days);
  if (course.status !== "active" || day !== state.current || state.lockedUntilTomorrow) return { error: t.errors.saveFailed };

  const mood = (v: unknown) => {
    const n = Math.round(Number(v));
    return n >= 1 && n <= 5 ? n : null;
  };
  const reflection = String(input.reflection ?? "").trim().slice(0, 4000);
  const { error } = await supabase.from("course_days").upsert(
    {
      course_id: courseId,
      day,
      mood_before: mood(input.moodBefore),
      mood_after: mood(input.moodAfter),
      reflection: reflection || null,
      action_done: Boolean(input.actionDone),
      completed_on: todayIn(course.tz),
      completed_at: new Date().toISOString(),
    },
    { onConflict: "course_id,day" },
  );
  if (error) return { error: t.errors.saveFailed };
  await supabase
    .from("courses")
    .update({ updated_at: new Date().toISOString(), ...(day >= course.length ? { status: "done" } : {}) })
    .eq("id", courseId);
  // Без revalidatePath: иначе страница сразу перерисуется в режим «перечитать» и праздничный экран исчезнет.
  // Главная и страница курса динамические и при переходе всё равно покажут свежие данные.
  return { ok: true, crisis: looksLikeCrisis(reflection) };
}

export async function setCourseEmail(courseId: string, on: boolean) {
  const { supabase } = await authed();
  await supabase.from("courses").update({ email_daily: on }).eq("id", courseId);
  refresh();
}

export async function stopCourse(formData: FormData) {
  const { supabase } = await authed();
  await supabase.from("courses").update({ status: "stopped" }).eq("id", String(formData.get("id")));
  refresh();
  redirect("/course");
}
