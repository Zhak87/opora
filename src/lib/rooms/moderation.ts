import { aiConfigured, generateJSON } from "@/lib/ai";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { publish } from "./hub";
import type { RoomMessage } from "./types";

// ИИ-модератор текстового чата комнаты.
// Он молчит, пока всё спокойно, и вмешивается только при явном нарушении: оскорбление, травля, угроза,
// чужие личные данные. Тогда он коротко напоминает о правилах и передаёт случай создателю комнаты.
// Модератор видит только последние сообщения этой комнаты, без имён. Личные разговоры с ИИ
// и переписка с психологом ему не передаются.
// ROOMS_AI_MODERATION=off — выключить проверку через ИИ (останется проверка личных данных по шаблонам).

export const FLAGS = ["insult", "harassment", "threat", "personal_data", "crisis"] as const;
export type Flag = (typeof FLAGS)[number];

// Чтобы модератор не мешал разговору: не чаще одного напоминания в две минуты на комнату.
const REMINDER_GAP_MS = 2 * 60 * 1000;

export function aiModerationOn() {
  return aiConfigured() && process.env.ROOMS_AI_MODERATION !== "off";
}

// Личные данные, которые видно без ИИ: телефон, почта, ИИН, номер карты.
export function localCheck(text: string): Flag | null {
  const t = text.replace(/[\s().-]/g, "");
  if (/(?:\+?7|8)7\d{9}/.test(t) || /\+\d{10,14}/.test(t)) return "personal_data";
  if (/[\w.+-]+@[\w-]+\.[\w.]{2,}/.test(text)) return "personal_data";
  if (/(?<!\d)\d{12}(?!\d)/.test(t) || /(?<!\d)\d{16}(?!\d)/.test(t)) return "personal_data";
  return null;
}

const SYSTEM = `Ты — спокойный модератор группового чата в приложении психологической самопомощи «Опора».
Твоя задача — заметить только явные нарушения в ПОСЛЕДНЕМ сообщении. Остальные сообщения — контекст.
Категории:
- insult — оскорбление другого участника или группы людей;
- harassment — травля, унижение, сексуальные домогательства, настойчивые нападки на конкретного человека;
- threat — угроза причинить вред другим;
- personal_data — публикация чужих личных данных: телефон, адрес, ИИН, почта, документы, фото других людей;
- crisis — автор пишет, что хочет причинить вред себе или не хочет жить;
- none — всё остальное.
НЕ нарушение: грусть, злость на ситуацию, мат без адресата, несогласие, резкое мнение, рассказ о своих трудностях.
Сомневаешься — отвечай none. Не оценивай, не советуй.
Ответь строго JSON: {"category": "<одна из категорий>", "reason": "<до 12 слов на русском, что именно нарушено>"}`;

async function aiCheck(context: { author: string; body: string }[]): Promise<{ flag: Flag | null; reason: string }> {
  const lines = context.map((m) => `${m.author}: ${m.body.slice(0, 600)}`).join("\n");
  const res = (await generateJSON({
    system: SYSTEM,
    messages: [{ role: "user", content: `Чат комнаты (последнее сообщение — внизу):\n${lines}` }],
    maxTokens: 200,
    temperature: 0,
  })) as { category?: string; reason?: string };
  const flag = FLAGS.includes(res?.category as Flag) ? (res.category as Flag) : null;
  return { flag, reason: String(res?.reason ?? "").slice(0, 200) };
}

// Проверить новое сообщение. Вызывается после ответа отправителю (after), поэтому не задерживает чат.
export async function moderate(roomId: string, message: { id: string; sender_id: string; body: string }) {
  if (!adminConfigured()) return;
  const db = createAdminClient();
  let flag = localCheck(message.body);
  let reason = flag ? "Похоже на личные данные (телефон, почта, ИИН или карта)" : "";

  if (!flag && aiModerationOn()) {
    const { data: recent } = await db
      .from("room_messages")
      .select("sender_id, body, kind, created_at")
      .eq("room_id", roomId)
      .eq("kind", "user")
      .is("hidden_at", null)
      .lte("created_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(8);
    // Имена заменяем на «Участник N»: модератору не нужно знать, кто есть кто.
    const ids: string[] = [];
    const ctx = ((recent ?? []) as { sender_id: string; body: string }[]).reverse().map((m) => {
      if (!ids.includes(m.sender_id)) ids.push(m.sender_id);
      return { author: `Участник ${ids.indexOf(m.sender_id) + 1}`, body: m.body };
    });
    if (!ctx.length || ctx[ctx.length - 1].body !== message.body) {
      if (!ids.includes(message.sender_id)) ids.push(message.sender_id);
      ctx.push({ author: `Участник ${ids.indexOf(message.sender_id) + 1}`, body: message.body });
    }
    try {
      ({ flag, reason } = await aiCheck(ctx));
    } catch (e) {
      console.error("rooms moderation:", (e as Error).message);
      return;
    }
  }
  if (!flag) return;

  const { data: room } = await db.from("rooms").select("creator_id, ended_at").eq("id", roomId).maybeSingle();
  if (!room || room.ended_at) return;

  await db.from("room_messages").update({ flag }).eq("id", message.id);
  publish(roomId, "flagged", { id: message.id, flag });

  // Кризис — не нарушение: модератор мягко показывает, куда обратиться, и не жалуется на человека.
  if (flag !== "crisis") {
    const { data: report } = await db
      .from("room_reports")
      .insert({ room_id: roomId, target_id: message.sender_id, message_id: message.id, reason, source: "ai" })
      .select("id, created_at")
      .single();
    if (report) publish(roomId, "report", { id: report.id }, room.creator_id);
  }

  const { data: last } = await db
    .from("room_messages")
    .select("created_at")
    .eq("room_id", roomId)
    .eq("kind", "moderator")
    .eq("flag", flag === "crisis" ? "crisis" : "reminder")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < REMINDER_GAP_MS) return;

  const { data: note } = await db
    .from("room_messages")
    .insert({ room_id: roomId, kind: "moderator", flag: flag === "crisis" ? "crisis" : "reminder", body: flag, reply_to: message.id })
    .select("id, created_at")
    .single();
  if (note) {
    const msg: RoomMessage = {
      id: note.id,
      sender_id: null,
      sender_name: null,
      kind: "moderator",
      body: flag,
      flag: flag === "crisis" ? "crisis" : "reminder",
      reply_to: message.id,
      hidden: false,
      created_at: note.created_at,
    };
    publish(roomId, "message", msg);
  }
}
