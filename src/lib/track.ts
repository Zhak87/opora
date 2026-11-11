import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { VISITOR_COOKIE } from "@/lib/visitor";

// Продуктовая аналитика (воронка): какие шаги человек проходит от захода на сайт до возвращения.
// Пишем только название события и короткую пометку. Тексты разговоров и записей сюда не попадают.
// Хранение и отчёт: supabase/migrations/0013_product_events.sql.

export type EventName =
  | "landing_view" | "guide_start" | "guide_complete" | "trial_start" | "signup_start" | "signup_complete"
  | "app_open" | "chat_start" | "chat_reply" | "practice_start" | "practice_complete" | "journal_entry"
  | "room_view" | "room_join" | "room_create" | "psychologist_view" | "contact_request";

// События, которые может прислать сама страница (остальные пишет только сервер).
export const CLIENT_EVENTS: EventName[] = [
  "landing_view", "guide_start", "guide_complete", "signup_start", "app_open",
  "practice_start", "practice_complete", "room_view", "room_join", "psychologist_view",
];

// Случайный номер браузера: связывает шаги одного человека до и после регистрации.
async function visitorId() {
  const jar = await cookies();
  const current = jar.get(VISITOR_COOKIE)?.value;
  if (current && /^[0-9a-f-]{36}$/.test(current)) return current;
  const id = crypto.randomUUID();
  try {
    jar.set(VISITOR_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 365 * 2, sameSite: "lax", httpOnly: true });
  } catch {
    // Из серверного компонента куку поставить нельзя: событие запишется по аккаунту.
    return null;
  }
  return id;
}

// Записать событие. Никогда не мешает основному действию: любая ошибка просто пропускается.
export async function track(name: EventName, props: Record<string, string | number | boolean> = {}) {
  try {
    const supabase = await createClient();
    await supabase.rpc("track_event", { p_name: name, p_visitor: await visitorId(), p_props: props });
  } catch {
    // аналитика необязательна
  }
}
