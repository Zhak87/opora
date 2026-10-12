import type { SupabaseClient } from "@supabase/supabase-js";
import type { Course, CourseDay } from "./course";

const COURSE_FIELDS = "id, topic, goal, length, plan, locale, tz, status, email_daily, created_at";
const DAY_FIELDS = "day, content, mood_before, mood_after, reflection, action_done, completed_on";

// Текущий курс человека: идущий, а если его нет — последний пройденный.
export async function currentCourse(supabase: SupabaseClient): Promise<{ course: Course; days: CourseDay[] } | null> {
  const { data } = await supabase
    .from("courses")
    .select(COURSE_FIELDS)
    .in("status", ["active", "done"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const course = data as Course;
  const { data: days } = await supabase.from("course_days").select(DAY_FIELDS).eq("course_id", course.id).order("day");
  return { course, days: (days ?? []) as CourseDay[] };
}
