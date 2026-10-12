import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { currentCourse } from "@/lib/course-data";
import { courseState } from "@/lib/course";
import { renderDailyEmail } from "@/lib/email";

// Как будет выглядеть завтрашнее (или сегодняшнее) письмо дня — для страницы курса.
export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const found = await currentCourse(supabase);
  if (!found) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
  const state = courseState(found.course, found.days);
  const { html } = renderDailyEmail({ course: found.course, state, name: profile?.name, userId: user.id });
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" } });
}
