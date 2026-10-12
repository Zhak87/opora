import { NextResponse } from "next/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { courseState, todayIn, type Course, type CourseDay } from "@/lib/course";
import { emailSendingEnabled, renderDailyEmail, sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

// Утренняя рассылка писем дня. Запускается Vercel Cron раз в день (vercel.json), с заголовком
// Authorization: Bearer CRON_SECRET. Пока отправка не включена (см. emailSendingEnabled), только считает письма.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 503 });

  const dry = !emailSendingEnabled() || new URL(req.url).searchParams.get("dry") === "1";
  // Бесплатный Resend: 100 писем в день и не больше 2 в секунду.
  const limit = Math.max(1, Number(process.env.DAILY_EMAILS_LIMIT) || 90);
  const admin = createAdminClient();

  const { data: courses, error } = await admin
    .from("courses")
    .select("id, user_id, topic, goal, length, plan, locale, tz, status, email_daily, created_at, last_emailed_on")
    .eq("status", "active")
    .eq("email_daily", true)
    .order("created_at")
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const report = { dry, candidates: courses?.length ?? 0, sent: 0, skipped: 0, failed: 0 };
  for (const row of courses ?? []) {
    if (report.sent >= limit) break;
    const course = row as Course & { user_id: string; last_emailed_on: string | null };
    const today = todayIn(course.tz);
    if (course.last_emailed_on === today) {
      report.skipped++;
      continue;
    }
    const { data: days } = await admin
      .from("course_days")
      .select("day, content, mood_before, mood_after, reflection, action_done, completed_on")
      .eq("course_id", course.id);
    const state = courseState(course, (days ?? []) as CourseDay[], today);
    // Не надоедаем: если человек пропал, напоминаем мягко на 2-й и 5-й день, а через неделю перестаём писать.
    const idle = state.done > 0 ? state.idleDays : 0;
    if (state.finished || state.lockedUntilTomorrow || idle >= 7 || (idle >= 2 && idle !== 2 && idle !== 5)) {
      report.skipped++;
      continue;
    }

    const [{ data: user }, { data: profile }] = await Promise.all([
      admin.auth.admin.getUserById(course.user_id),
      admin.from("profiles").select("name").eq("id", course.user_id).maybeSingle(),
    ]);
    const to = user?.user?.email;
    if (!to) {
      report.skipped++;
      continue;
    }
    const email = renderDailyEmail({ course, state, name: profile?.name, userId: course.user_id });
    try {
      if (!dry) {
        await sendEmail({ to, ...email });
        await new Promise((r) => setTimeout(r, 600));
      }
      if (!dry) await admin.from("courses").update({ last_emailed_on: today }).eq("id", course.id);
      report.sent++;
    } catch (e) {
      console.error("daily email", course.id, e);
      report.failed++;
    }
  }
  return NextResponse.json(report);
}
