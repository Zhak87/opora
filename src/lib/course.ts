import { AI_LANGUAGE, type Locale } from "@/i18n/config";

// Курс «Мой путь»: программа на несколько недель под запрос человека.
// План курса (недели и короткое описание каждого дня) ИИ собирает один раз, при создании.
// Подробное содержание дня (письмо, объяснение, практика, вопрос) — когда человек открывает этот день,
// с учётом того, что он написал накануне. Так курс живой и не тратит лишние запросы к ИИ.

export const COURSE_LENGTHS = [7, 14, 30] as const;
export type CourseLength = (typeof COURSE_LENGTHS)[number];

export type CourseWeek = { title: string; goal: string };
export type CourseDayPlan = { title: string; focus: string; task: string; minutes: number };
export type CoursePlan = { title: string; promise: string; weeks: CourseWeek[]; days: CourseDayPlan[] };

export type DayContent = {
  letter: string;
  insight: { title: string; text: string } | null;
  practice: { title: string; steps: { text: string; seconds: number }[] } | null;
  question: string;
  action: string;
  takeaway: string;
};

export type Course = {
  id: string;
  topic: string | null;
  goal: string;
  length: CourseLength;
  plan: CoursePlan;
  locale: string;
  tz: string;
  status: "active" | "done" | "stopped";
  email_daily: boolean;
  created_at: string;
};

export type CourseDay = {
  day: number;
  content: DayContent | null;
  mood_before: number | null;
  mood_after: number | null;
  reflection: string | null;
  action_done: boolean;
  completed_on: string | null;
};

export const weeksFor = (length: number) => Math.max(1, Math.floor(length / 7));
// Номер недели (с нуля) для дня курса: хвост месяца (дни 29–30) относится к последней неделе.
export const weekOf = (day: number, length: number) => Math.min(Math.floor((day - 1) / 7), weeksFor(length) - 1);

// Сегодняшняя дата (YYYY-MM-DD) в часовом поясе человека.
export function todayIn(tz: string, now = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function validTz(tz: unknown) {
  if (typeof tz !== "string" || tz.length > 64) return "Asia/Almaty";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return "Asia/Almaty";
  }
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

export type CourseState = {
  done: number;
  current: number; // день, который сейчас стоит пройти (или length + 1, если курс пройден)
  finished: boolean;
  // Следующий день открывается на следующий календарный день: «по дню за раз», как в лучших курсах.
  lockedUntilTomorrow: boolean;
  streak: number;
  // Сколько дней человек не заходил с последнего пройденного дня (для мягкого письма «мы сохранили ваше место»).
  idleDays: number;
  moods: { day: number; before: number | null; after: number | null }[];
};

export function courseState(course: Pick<Course, "length" | "tz" | "created_at">, days: CourseDay[], today = todayIn(course.tz)): CourseState {
  const byDay = new Map(days.map((d) => [d.day, d]));
  let current = 1;
  while (current <= course.length && byDay.get(current)?.completed_on) current++;
  const finished = current > course.length;
  const prev = byDay.get(current - 1);
  const lockedUntilTomorrow = !finished && current > 1 && prev?.completed_on === today;

  const dates = new Set(days.map((d) => d.completed_on).filter(Boolean) as string[]);
  let streak = 0;
  const d = new Date(`${today}T12:00:00Z`);
  if (!dates.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }

  const last = [...dates].sort().pop() ?? course.created_at.slice(0, 10);
  return {
    done: days.filter((x) => x.completed_on).length,
    current,
    finished,
    lockedUntilTomorrow,
    streak,
    idleDays: Math.max(0, daysBetween(last, today)),
    moods: days
      .filter((x) => x.completed_on)
      .sort((a, b) => a.day - b.day)
      .map((x) => ({ day: x.day, before: x.mood_before, after: x.mood_after })),
  };
}

/* ---------- Подсказки для ИИ ---------- */

export function courseLanguageNote(locale: Locale) {
  return `Язык ответа: весь текст пиши на ${AI_LANGUAGE[locale]} языке, грамотно и естественно, как носитель языка, даже если материалы человека на другом языке. Это указание важнее слов «пиши по-русски» выше. Обращение вежливое: по-русски на «вы», по-казахски на «сіз». По-казахски пиши только кириллицей. Ключи JSON оставь как в образце.`;
}

export function outlineSystem(length: number) {
  const weeks = weeksFor(length);
  return `Ты — бережный и опытный психолог-консультант в приложении «Опора». Человек хочет пройти курс самопомощи на ${length} дней, чтобы справиться со своей трудностью. Составь для него программу: по одному короткому занятию в день, 5–10 минут.

Как строить программу:
- Опирайся на проверенные подходы: психообразование (понять, как устроена трудность), саморегуляция и заземление, когнитивно-поведенческие техники (замечать и проверять мысли), ACT (принятие и действия по ценностям), поведенческая активация, самосочувствие, решение проблем по шагам, поддерживающие отношения, сон и тело.
- Путь идёт от простого к глубокому: сначала замечать и успокаиваться, затем понимать, затем пробовать новое, затем закреплять и смотреть в будущее. Каждая неделя — своя ступень.
- Каждый день — одна ясная идея и одно маленькое, выполнимое действие в жизни, а не только размышление. Дни разнообразные: практика дыхания или тела, работа с мыслями, письмо себе, разговор с близким, маленький эксперимент, благодарность, забота о себе, ценности.
- Опирайся на то, что человек рассказал о себе, его словами и ситуациями. Если данных мало, делай программу тёплой и универсальной.
- Это курс самопомощи, а не лечение. Не ставь диагнозов, не обещай вылечить, не назначай лекарства.

Пиши по-русски, тепло, просто, на «вы». Без markdown.

Верни строго JSON:
{
  "title": "живое личное название курса, 2–5 слов",
  "promise": "1–2 тёплых предложения: что изменится за эти дни, если идти шаг за шагом",
  "weeks": [ { "title": "название ступени, 1–3 слова", "goal": "1 предложение: что даёт эта неделя" } ],
  "days": [ { "title": "название дня, 2–5 слов", "focus": "о чём этот день, до 15 слов", "task": "маленькое действие на сегодня, до 15 слов", "minutes": 7 } ]
}

Требования: в weeks ровно ${weeks} ${weeks === 1 ? "элемент" : "элемента"}; в days ровно ${length} дней по порядку; minutes от 3 до 15. Названия не повторяются. Последний день подводит итог пути и помогает взять с собой главное.`;
}

export const DAY_SYSTEM = `Ты — тёплый и знающий психолог-консультант в приложении «Опора». Человек проходит личный курс самопомощи, по одному занятию в день. Подготовь содержание сегодняшнего занятия по плану дня. Это должно ощущаться как письмо от человека, который помнит, с чем пришёл собеседник, и искренне рад, что он продолжает.

Состав занятия:
- letter: письмо дня, 3–5 предложений. Обратись к человеку, свяжи сегодняшний день с его запросом и, если есть, с тем, что он написал вчера. Отметь, что он уже прошёл. Без пафоса.
- insight: короткое и ясное объяснение, почему это работает, 2–3 небольших абзаца, разделённых пустой строкой. Простыми словами, как объясняет хороший специалист.
- practice: практика на 3–6 шагов, каждый шаг — что именно сделать. seconds — сколько секунд на шаг (0, если таймер не нужен, до 120).
- question: один глубокий, но бережный вопрос для размышления, на который человек ответит письменно.
- action: маленькое конкретное действие в жизни на сегодня, выполнимое за несколько минут.
- takeaway: короткая фраза, которую стоит взять с собой, до 12 слов.

Это самопомощь, а не лечение: не ставь диагнозов, советы подавай как рекомендации. Пиши по-русски, тепло, на «вы», без markdown и без заголовков в тексте.

Верни строго JSON:
{ "letter": "…", "insight": { "title": "…", "text": "…" }, "practice": { "title": "…", "steps": [ { "text": "…", "seconds": 30 } ] }, "question": "…", "action": "…", "takeaway": "…" }`;

/* ---------- Проверка ответов ИИ ---------- */

const str = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const arr = (v: unknown) => (Array.isArray(v) ? v : []);

export function normalizeOutline(raw: unknown, length: number): CoursePlan | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const days = arr(r.days)
    .map((d) => ({
      title: str(d?.title, 80),
      focus: str(d?.focus, 200),
      task: str(d?.task, 200),
      minutes: Math.max(3, Math.min(15, Math.round(Number(d?.minutes) || 7))),
    }))
    .filter((d) => d.title && d.task)
    .slice(0, length);
  // Без полного числа дней курс не собрать: лучше попросить ИИ ещё раз.
  if (days.length < length) return null;
  const n = weeksFor(length);
  const weeks = arr(r.weeks)
    .map((w) => ({ title: str(w?.title, 40), goal: str(w?.goal, 200) }))
    .filter((w) => w.title)
    .slice(0, n);
  while (weeks.length < n) weeks.push({ title: `${weeks.length + 1}`, goal: "" });
  const title = str(r.title, 80);
  if (!title) return null;
  return { title, promise: str(r.promise, 400), weeks, days };
}

export function normalizeDay(raw: unknown): DayContent | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const ins = (r.insight ?? {}) as Record<string, unknown>;
  const pr = (r.practice ?? {}) as Record<string, unknown>;
  const steps = arr(pr.steps)
    .map((s) => ({
      text: str(typeof s === "string" ? s : s?.text, 300),
      seconds: Math.max(0, Math.min(120, Math.round(Number(s?.seconds) || 0))),
    }))
    .filter((s) => s.text)
    .slice(0, 7);
  const letter = str(r.letter, 1200);
  const action = str(r.action, 300);
  if (!letter || !action) return null;
  return {
    letter,
    insight: str(ins.text, 1800) ? { title: str(ins.title, 80), text: str(ins.text, 1800) } : null,
    practice: steps.length >= 2 ? { title: str(pr.title, 80), steps } : null,
    question: str(r.question, 300),
    action,
    takeaway: str(r.takeaway, 140),
  };
}

// Если ИИ недоступен, день всё равно можно пройти: письмо и действие берём из плана курса.
export function fallbackDay(plan: CourseDayPlan, question: string): DayContent {
  return { letter: plan.focus, insight: null, practice: null, question, action: plan.task, takeaway: "" };
}
