import { aiConfigured, generateShort, synthesize, ttsConfigured } from "@/lib/ai";
import { looksLikeCrisis } from "@/lib/crisis";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { humans, isOnline, publish, setHooks } from "./hub";
import { postNote } from "./moderation";
import { reserve, settle, speechSeconds, textCost, ttsCost, type Spend } from "./budget";
import type { RoomIntent, RoomMessage } from "./types";

// ИИ-собеседники тематических комнат. Вся логика и все деньги — здесь, на сервере, одна на всех посетителей:
//  • в комнате нет людей — нет ни генерации, ни озвучки; открытие каталога ИИ не запускает;
//  • вход человека — не больше одной короткой реплики-приглашения (переподключение — не вход);
//  • дальше ИИ отвечает на сообщения людей, а если люди говорят между собой — уступает им;
//  • пока человек молча слушает, собеседники коротко разговаривают между собой: несколько серий по 3 реплики,
//    одна генерация на серию; человек написал — беседа сразу уступает ему; ушёл — всё отменяется;
//  • одна генерация и одна озвучка на реплику для всей комнаты, сколько бы людей ни слушало;
//  • перед каждым запросом атомарно резервируется бюджет (budget.ts); исчерпан — ИИ молчит, чат людей работает;
//  • ушёл последний человек — очереди генерации и озвучки отменяются.
//
// ROOMS_AI=off (по умолчанию) — ИИ-собеседники молчат, видны только примеры разговоров;
// ROOMS_AI=text — текстовые ответы; ROOMS_AI=voice — ещё и озвучка по кнопке «Слушать ИИ».

export type AiMode = "off" | "text" | "voice";
export function aiMode(): AiMode {
  const v = process.env.ROOMS_AI;
  const mode: AiMode = v === "voice" ? "voice" : v === "text" || v === "on" ? "text" : "off";
  if (mode === "off" || !aiConfigured() || !adminConfigured()) return "off";
  if (mode === "voice" && !ttsConfigured()) return "text";
  return mode;
}

const num = (name: string, fallback: number) => Number(process.env[name]) || fallback;
// Ждём, пока человек допишет: несколько сообщений подряд получают один ответ.
const DEBOUNCE_MS = num("ROOMS_AI_DEBOUNCE_MS", 2500);
// Не чаще одной реплики ИИ в столько миллисекунд на комнату.
const MIN_GAP_MS = num("ROOMS_AI_MIN_GAP_MS", 10_000);
// Не больше стольких реплик ИИ в час на комнату.
const MAX_PER_HOUR = num("ROOMS_AI_MAX_PER_HOUR", 40);
// Не больше стольких запросов к ИИ одновременно на весь сервис.
const MAX_PARALLEL = num("ROOMS_AI_PARALLEL", 3);
// Сессия для памяти ИИ: сообщения за последние два часа, не больше 14 и не больше 4500 символов.
const SESSION_MS = 2 * 60 * 60 * 1000;
const CONTEXT_MESSAGES = 14;
const CONTEXT_CHARS = 4500;
const MAX_OUTPUT_TOKENS = num("ROOMS_AI_MAX_TOKENS", 220);
const REPLY_CHARS = 420;
// Приглашение после входа: не чаще раза в 10 минут на комнату и раза в 3 часа на человека.
const GREET_ROOM_GAP_MS = 10 * 60 * 1000;
const GREET_USER_GAP_MS = 3 * 60 * 60 * 1000;
// Люди говорят между собой, если за 4 минуты писали двое и больше.
const PEOPLE_TALK_MS = 4 * 60 * 1000;
// Беседа собеседников между собой, пока люди молча слушают (ROOMS_AI_BANTER=off — выключить).
const BANTER = process.env.ROOMS_AI_BANTER !== "off";
// Сколько тишины после последней реплики, прежде чем собеседники заговорят между собой.
const BANTER_IDLE_MS = num("ROOMS_AI_BANTER_IDLE_MS", 20_000);
// Пауза между сериями и число серий подряд, пока человек молчит (потом — тишина до нового сообщения или входа).
const BANTER_GAP_MS = num("ROOMS_AI_BANTER_GAP_MS", 35_000);
const BANTER_ROUNDS = num("ROOMS_AI_BANTER_ROUNDS", 3);
const BANTER_LINES = 3;
// Озвучиваем только свежие реплики: старые никто уже не ждёт.
const AUDIO_FRESH_MS = 15 * 60 * 1000;

type Persona = { id: string; slug: string; voice: string; name: string; names: string[]; manner: string };
type Meta = { id: string; kind: string; title: string; description: string; personas: Persona[]; at: number };
type Pending = { id: string; userId: string; body: string };
type Stats = { people: Set<string>; humanMessages: number; aiReplies: number; tokens: number; tts: number; cost: number };
type State = {
  controller: AbortController;
  sessionId: Promise<string | null>;
  timer?: ReturnType<typeof setTimeout>;
  pending?: Pending;
  busy: boolean;
  lastAiAt: number;
  recent: number[];
  greeted: Map<string, number>;
  answered: Set<string>;
  audio: Map<string, Promise<Uint8Array | null>>;
  crisisUntil: number;
  pausedNotice: boolean;
  banterTimer?: ReturnType<typeof setTimeout>;
  banterRounds: number;
  // Растёт с каждым сообщением человека: начатая беседа ИИ видит, что пора уступить.
  epoch: number;
  stats: Stats;
};

type Global = { rooms: Map<string, State>; meta: Map<string, Meta>; intents: Map<string, { intent: RoomIntent; at: number }>; active: number };
const g = globalThis as unknown as { __oporaCompanions?: Global };
const G: Global = (g.__oporaCompanions ??= { rooms: new Map(), meta: new Map(), intents: new Map(), active: 0 });

const db = () => createAdminClient();

/* ---------- Комната и её персонажи ---------- */

async function meta(roomId: string): Promise<Meta | null> {
  const cached = G.meta.get(roomId);
  if (cached && Date.now() - cached.at < 5 * 60_000) return cached;
  const client = db();
  const { data: room } = await client.from("rooms").select("id, kind, title, description, ended_at").eq("id", roomId).maybeSingle();
  if (!room || room.ended_at) return null;
  const { data: rows } = await client
    .from("room_personas")
    .select("id, slug, voice, content, manner, sort")
    .eq("room_id", roomId)
    .eq("active", true)
    .order("sort");
  const personas = ((rows ?? []) as { id: string; slug: string; voice: string; content: Record<string, { name: string }>; manner: string }[]).map((p) => {
    const names = [...new Set(Object.values(p.content ?? {}).map((t) => t?.name).filter(Boolean))] as string[];
    return { id: p.id, slug: p.slug, voice: p.voice, manner: p.manner, name: p.content?.ru?.name ?? p.slug, names };
  });
  const m: Meta = { id: room.id, kind: room.kind, title: room.title, description: room.description, personas, at: Date.now() };
  G.meta.set(roomId, m);
  return m;
}

function state(roomId: string): State {
  let s = G.rooms.get(roomId);
  if (!s) {
    s = {
      controller: new AbortController(),
      sessionId: startSession(roomId),
      busy: false,
      lastAiAt: 0,
      recent: [],
      greeted: new Map(),
      answered: new Set(),
      audio: new Map(),
      crisisUntil: 0,
      pausedNotice: false,
      banterRounds: 0,
      epoch: 0,
      stats: { people: new Set(), humanMessages: 0, aiReplies: 0, tokens: 0, tts: 0, cost: 0 },
    };
    G.rooms.set(roomId, s);
  }
  return s;
}

async function startSession(roomId: string) {
  if (!adminConfigured()) return null;
  const { data } = await db().from("room_sessions").insert({ room_id: roomId }).select("id").single();
  return (data?.id as string) ?? null;
}

async function endSession(s: State) {
  const id = await s.sessionId.catch(() => null);
  if (!id) return;
  await db()
    .from("room_sessions")
    .update({
      ended_at: new Date().toISOString(),
      people: s.stats.people.size,
      human_messages: s.stats.humanMessages,
      ai_replies: s.stats.aiReplies,
      tokens: s.stats.tokens,
      tts_sec: Math.round(s.stats.tts * 10) / 10,
      cost_micro: s.stats.cost,
    })
    .eq("id", id);
}

/* ---------- Присутствие ---------- */

setHooks({
  occupied: (roomId) => {
    state(roomId);
  },
  empty: (roomId) => {
    // Последний человек ушёл: отменяем всё, что ещё готовится, и закрываем сессию.
    const s = G.rooms.get(roomId);
    if (!s) return;
    G.rooms.delete(roomId);
    clearTimeout(s.timer);
    clearTimeout(s.banterTimer);
    s.controller.abort();
    s.audio.clear();
    endSession(s).catch((e) => console.error("rooms session:", (e as Error).message));
  },
  joined: (roomId, userId, first) => {
    const s = state(roomId);
    s.stats.people.add(userId);
    if (!first) return;
    s.banterRounds = 0;
    greet(roomId, userId)
      .catch((e) => console.error("rooms greet:", (e as Error).message))
      .finally(() => {
        const st = G.rooms.get(roomId);
        if (st) scheduleBanter(roomId, st, BANTER_IDLE_MS);
      });
  },
});

export function setIntent(roomId: string, userId: string, intent: RoomIntent) {
  G.intents.set(`${roomId}:${userId}`, { intent, at: Date.now() });
  // «Пока просто послушаю» — собеседники начинают разговор между собой почти сразу.
  const s = G.rooms.get(roomId);
  if (intent === "listen" && s) {
    s.banterRounds = 0;
    scheduleBanter(roomId, s, 4000);
  }
}

function intentOf(roomId: string, userId: string): RoomIntent | null {
  const v = G.intents.get(`${roomId}:${userId}`);
  return v && Date.now() - v.at < SESSION_MS ? v.intent : null;
}

/* ---------- Контекст разговора ---------- */

type Row = { id: string; sender_id: string | null; kind: string; body: string; persona_id: string | null; created_at: string };

async function recentMessages(roomId: string): Promise<Row[]> {
  const { data } = await db()
    .from("room_messages")
    .select("id, sender_id, kind, body, persona_id, created_at")
    .eq("room_id", roomId)
    .in("kind", ["user", "ai"])
    .is("hidden_at", null)
    .gte("created_at", new Date(Date.now() - SESSION_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(CONTEXT_MESSAGES);
  return ((data ?? []) as Row[]).reverse();
}

// Расшифровка для модели. Люди без имён — «Участник N»: ИИ не нужно знать, кто есть кто,
// и в комнату не попадает ничего из личных разговоров человека с ИИ.
function transcript(rows: Row[], m: Meta) {
  const ids: string[] = [];
  const who = (r: Row) => {
    if (r.kind === "ai") return `${m.personas.find((p) => p.id === r.persona_id)?.name ?? "ИИ"} (ИИ)`;
    if (!ids.includes(r.sender_id!)) ids.push(r.sender_id!);
    return `Участник ${ids.indexOf(r.sender_id!) + 1}`;
  };
  const lines = rows.map((r) => `${who(r)}: ${r.body.replace(/\s+/g, " ").slice(0, 400)}`);
  while (lines.join("\n").length > CONTEXT_CHARS && lines.length > 1) lines.shift();
  return { text: lines.join("\n"), label: (userId: string) => `Участник ${ids.indexOf(userId) + 1}` };
}

function system(m: Meta, crisis: boolean, banter = false) {
  return `Ты пишешь реплики ИИ-собеседников в общей комнате взаимной поддержки приложения «Опора». Тема комнаты: «${m.title}». ${m.description}
В комнате общаются реальные люди. Собеседники ниже — ИИ, в интерфейсе у них всегда метка «ИИ». Они не люди и не психологи.
${m.personas.map((p) => `- ${p.slug}: ${p.name}. ${p.manner}`).join("\n")}
Правила:
${banter
  ? `- Сейчас люди молча читают, и собеседники разговаривают между собой на тему комнаты: каждая реплика отвечает на предыдущую, по очереди разными собеседниками, живо и по-разному (свой характер у каждого). Можно опираться на то, что раньше сказал участник, но не пересказывай его слова и не обращайся к нему с вопросами.
- Говорите об общих мыслях, наблюдениях, маленьких практиках и о том, что многие в такой ситуации чувствуют. Не повторяйте уже сказанное в разговоре и не здоровайтесь.
- Коротко: 1–2 предложения, до 220 символов на реплику. Без списков, заголовков и эмодзи.`
  : `- Отвечай на конкретное последнее сообщение участника, по смыслу и с учётом сказанного раньше. Не здоровайся повторно и не повторяй уже сказанное.
- Обычно отвечает один собеседник. Второй — только если добавляет что-то действительно другое. Не больше двух реплик, собеседники не спорят.
- Коротко: 1–3 предложения, до 300 символов на реплику. Без списков, заголовков и эмодзи.`}
- Не каждое сообщение требует совета: иногда важнее показать, что человека услышали. Совет — один маленький шаг и только если его просят или он уместен.
- Не ставь диагнозов, не называй расстройств, не советуй лекарства и лечение. Не выдавай себя за психолога или человека. Не выдумывай свой опыт, истории и травмы.
- Не расспрашивай о чувствительном: здоровье, адрес, телефон, суммы денег, имена близких. Если человек делится этим сам — не повторяй.
- Если в комнате пишут несколько людей, обращайся к автору последнего сообщения и можешь бережно пригласить остальных.
- Пиши на языке последнего сообщения участника (русский, казахский или английский); если участники ещё не писали — по-русски.
${crisis ? "- ВАЖНО: недавно в комнате прозвучала угроза жизни. Один собеседник, очень бережно: безопасность важнее всего, предложи прямо сейчас связаться с близким человеком или с бесплатной линией помощи (её номер уже показан в комнате), спроси, есть ли рядом кто-то. Ничего не обсуждай про способы и не задавай уточняющих вопросов о намерениях.\n" : ""}Ответ — строго JSON: {"replies":[{"persona":"<id собеседника>","text":"<реплика>"}]}`;
}

function parseReplies(text: string, m: Meta, banter = false) {
  try {
    const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    const json = JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1)) as { replies?: { persona?: string; text?: string }[] };
    const out: { persona: Persona; text: string }[] = [];
    for (const r of json.replies ?? []) {
      const persona = m.personas.find((p) => p.slug === r.persona) ?? (out.length ? null : m.personas[0]);
      const body = String(r.text ?? "").replace(/\s+/g, " ").trim().slice(0, REPLY_CHARS);
      // В ответе человеку — разные собеседники; в беседе между собой — по очереди, без двух реплик подряд от одного.
      if (!persona || !body) continue;
      if (banter ? out.at(-1)?.persona.id === persona.id : out.some((o) => o.persona.id === persona.id)) continue;
      out.push({ persona, text: body });
      if (out.length === (banter ? BANTER_LINES : 2)) break;
    }
    return out;
  } catch {
    return [];
  }
}

/* ---------- Один запрос к ИИ под бюджетом ---------- */

async function generate(roomId: string, s: State, m: Meta, userId: string | null, prompt: string, crisis = false, banter = false) {
  if (G.active >= MAX_PARALLEL) return null;
  const sys = system(m, crisis, banter);
  const estIn = Math.ceil((sys.length + prompt.length) / 3.2);
  const estimate: Spend = { tokens: estIn + MAX_OUTPUT_TOKENS, tts_sec: 0, replies: 1, cost_micro: textCost(estIn, MAX_OUTPUT_TOKENS) };
  const client = db();
  if (!(await reserve(client, roomId, userId, estimate))) {
    // Бюджет исчерпан: один раз за сессию говорим об этом комнате, без технических подробностей.
    if (!s.pausedNotice) {
      s.pausedNotice = true;
      publish(roomId, "ai_paused", null);
    }
    return null;
  }
  G.active++;
  publish(roomId, "ai_typing", { on: true });
  let used: Spend = { tokens: 0, tts_sec: 0, replies: 0, cost_micro: 0 };
  try {
    const res = await generateShort({
      system: sys,
      messages: [{ role: "user", content: prompt }],
      maxTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.7,
      signal: s.controller.signal,
    });
    const replies = parseReplies(res.text, m, banter);
    used = { tokens: res.inputTokens + res.outputTokens, tts_sec: 0, replies: replies.length, cost_micro: textCost(res.inputTokens, res.outputTokens) };
    return replies;
  } catch (e) {
    if (!s.controller.signal.aborted) console.error("rooms companions:", (e as Error).message);
    return null;
  } finally {
    G.active--;
    publish(roomId, "ai_typing", { on: false });
    s.stats.tokens += used.tokens;
    s.stats.cost += used.cost_micro;
    await settle(client, roomId, userId, {
      tokens: used.tokens - estimate.tokens,
      tts_sec: 0,
      replies: used.replies - estimate.replies,
      cost_micro: used.cost_micro - estimate.cost_micro,
    });
  }
}

async function post(roomId: string, s: State, replies: { persona: Persona; text: string }[], replyTo: string | null) {
  // Пока ИИ думал, все ушли — сообщение никто не увидит, не пишем.
  if (!humans(roomId) || s.controller.signal.aborted || G.rooms.get(roomId) !== s) return;
  const client = db();
  for (const r of replies) {
    const { data } = await client
      .from("room_messages")
      .insert({ room_id: roomId, kind: "ai", body: r.text, persona_id: r.persona.id, reply_to: replyTo })
      .select("id, created_at")
      .single();
    if (!data) continue;
    const msg: RoomMessage = {
      id: data.id,
      sender_id: null,
      sender_name: null,
      kind: "ai",
      body: r.text,
      flag: null,
      reply_to: replyTo,
      hidden: false,
      created_at: data.created_at,
      persona_id: r.persona.id,
    };
    publish(roomId, "message", msg);
    s.stats.aiReplies++;
    s.lastAiAt = Date.now();
    s.recent.push(s.lastAiAt);
  }
  await client.from("rooms").update({ last_activity_at: new Date().toISOString() }).eq("id", roomId);
}

const canSpeak = (s: State) => {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  s.recent = s.recent.filter((t) => t > hourAgo);
  return s.recent.length < MAX_PER_HOUR;
};

/* ---------- Приглашение после входа ---------- */

async function greet(roomId: string, userId: string) {
  if (aiMode() === "off") return;
  const m = await meta(roomId);
  if (!m || m.kind !== "topic" || !m.personas.length) return;
  const s = state(roomId);
  const prev = s.greeted.get(userId) ?? 0;
  if (Date.now() - prev < GREET_USER_GAP_MS) return;
  s.greeted.set(userId, Date.now());
  // Человек может уйти за пару секунд: не тратимся на тех, кто просто заглянул.
  await new Promise((r) => setTimeout(r, 2000));
  if (!isOnline(roomId, userId) || s.busy || !canSpeak(s)) return;
  const rows = await recentMessages(roomId);
  const lastAi = [...rows].reverse().find((r) => r.kind === "ai");
  const lastHuman = [...rows].reverse().find((r) => r.kind === "user");
  // Комната уже живая или ИИ недавно приглашал — молчим.
  if (lastAi && Date.now() - new Date(lastAi.created_at).getTime() < GREET_ROOM_GAP_MS) return;
  if (lastHuman && Date.now() - new Date(lastHuman.created_at).getTime() < GREET_ROOM_GAP_MS) return;
  s.busy = true;
  try {
    const t = transcript(rows, m);
    const prompt = `${t.text ? `Недавний разговор в комнате:\n${t.text}\n\n` : ""}В комнату только что вошёл человек и пока молчит. Один собеседник коротко (1–2 предложения, до 200 символов) продолжает тему комнаты и без давления приглашает присоединиться: можно написать пару слов или просто побыть рядом. Не задавай больше одного вопроса.`;
    const replies = await generate(roomId, s, m, userId, prompt);
    if (replies?.length) await post(roomId, s, replies.slice(0, 1), null);
  } finally {
    s.busy = false;
  }
}

/* ---------- Ответ на сообщение человека ---------- */

// Вызывается после того, как сообщение человека записано. Ничего не ждёт: ответ ИИ придёт живым событием.
export function onHumanMessage(roomId: string, msg: Pending) {
  const s = G.rooms.get(roomId);
  if (s) s.stats.humanMessages++;
  if (aiMode() === "off" || !s) return;
  if (looksLikeCrisis(msg.body)) {
    // Отдельный сценарий: сначала — помощь и номера линии поддержки от модератора, без генерации.
    // Затем один собеседник отвечает в бережном режиме безопасности (см. system()).
    s.crisisUntil = Date.now() + 15 * 60 * 1000;
    postNote(roomId, "crisis", "crisis", msg.id).catch(() => {});
  }
  // Человек заговорил — беседа собеседников между собой уступает ему.
  s.epoch++;
  s.banterRounds = 0;
  clearTimeout(s.banterTimer);
  s.pending = msg;
  clearTimeout(s.timer);
  s.timer = setTimeout(() => reply(roomId).catch((e) => console.error("rooms reply:", (e as Error).message)), DEBOUNCE_MS);
}

async function reply(roomId: string) {
  const s = G.rooms.get(roomId);
  const msg = s?.pending;
  if (!s || !msg || s.answered.has(msg.id)) return;
  if (!humans(roomId)) return;
  if (s.busy) {
    // Ответ уже готовится: вернёмся к новому сообщению сразу после него.
    s.timer = setTimeout(() => reply(roomId).catch(() => {}), 1500);
    return;
  }
  const wait = s.lastAiAt + MIN_GAP_MS - Date.now();
  if (wait > 0) {
    s.timer = setTimeout(() => reply(roomId).catch(() => {}), wait);
    return;
  }
  const m = await meta(roomId);
  if (!m || m.kind !== "topic" || !m.personas.length || !canSpeak(s)) return;

  const rows = await recentMessages(roomId);
  const last = rows.at(-1);
  // Пока ждали, кто-то из людей уже ответил — это его разговор.
  if (last && last.kind === "user" && last.id !== msg.id && last.sender_id !== msg.userId) {
    s.answered.add(msg.id);
    return;
  }
  const lower = msg.body.toLowerCase();
  // «Пообщайтесь между собой» — вместо ответа собеседники сразу начинают беседу друг с другом.
  if (BANTER && m.personas.length >= 2 && /(сами|между собой|друг с другом|өзара|each other)/u.test(lower) && /(общ|говор|болтай|сөйлес|talk|chat)/u.test(lower)) {
    s.answered.add(msg.id);
    s.banterRounds = 0;
    scheduleBanter(roomId, s, 3000);
    return;
  }
  const mentioned = m.personas.find((p) => p.names.some((n) => new RegExp(`(^|[^\\p{L}])${n.toLowerCase()}([^\\p{L}]|$)`, "u").test(lower)));
  const askedAi = mentioned || /(^|[^\p{L}])(ии|ai|бот)([^\p{L}]|$)/iu.test(lower);
  const since = Date.now() - PEOPLE_TALK_MS;
  const talkers = new Set(rows.filter((r) => r.kind === "user" && new Date(r.created_at).getTime() > since).map((r) => r.sender_id));
  // Люди говорят между собой — ИИ уступает им разговор, если к нему не обратились напрямую.
  if (talkers.size >= 2 && !askedAi) {
    s.answered.add(msg.id);
    return;
  }

  s.busy = true;
  s.answered.add(msg.id);
  try {
    const t = transcript(rows, m);
    const intent = intentOf(roomId, msg.userId);
    const wish = intent === "vent" ? " Человек сказал, что хочет выговориться: выслушай и отрази, без советов." : intent === "advice" ? " Человек попросил совета: можно предложить один маленький шаг." : "";
    const who = mentioned ? ` Участник обратился к собеседнику ${mentioned.slug} — отвечает он.` : "";
    const prompt = `Разговор в комнате (последнее сообщение — внизу):\n${t.text}\n\nОтветь на последнее сообщение (${t.label(msg.userId)}).${wish}${who}`;
    const replies = await generate(roomId, s, m, msg.userId, prompt, Date.now() < s.crisisUntil);
    if (replies?.length) await post(roomId, s, Date.now() < s.crisisUntil ? replies.slice(0, 1) : replies, msg.id);
  } finally {
    s.busy = false;
  }
  // Человек замолчал после ответа — через паузу собеседники продолжат тему между собой.
  scheduleBanter(roomId, s, BANTER_IDLE_MS);
}

/* ---------- Беседа собеседников между собой, пока люди слушают ---------- */

function scheduleBanter(roomId: string, s: State, delay: number) {
  if (!BANTER || aiMode() === "off" || s.banterRounds >= BANTER_ROUNDS || G.rooms.get(roomId) !== s) return;
  clearTimeout(s.banterTimer);
  const epoch = s.epoch;
  s.banterTimer = setTimeout(() => banter(roomId, s, epoch).catch((e) => console.error("rooms banter:", (e as Error).message)), delay);
}

async function banter(roomId: string, s: State, epoch: number) {
  // Беседа идёт, только пока в комнате есть живой человек и он молчит.
  const live = () => G.rooms.get(roomId) === s && s.epoch === epoch && !s.controller.signal.aborted && humans(roomId) > 0;
  const waiting = s.pending && !s.answered.has(s.pending.id);
  if (!live() || s.busy || waiting || Date.now() < s.crisisUntil || s.banterRounds >= BANTER_ROUNDS || !canSpeak(s)) return;
  const m = await meta(roomId);
  if (!m || m.kind !== "topic" || m.personas.length < 2) return;
  const rows = await recentMessages(roomId);
  const since = Date.now() - PEOPLE_TALK_MS;
  const talkers = new Set(rows.filter((r) => r.kind === "user" && new Date(r.created_at).getTime() > since).map((r) => r.sender_id));
  // Люди разговаривают между собой — собеседники им не мешают.
  if (talkers.size >= 2 || !live()) return;
  s.busy = true;
  s.banterRounds++;
  try {
    const t = transcript(rows, m);
    const prompt = `${t.text ? `Разговор в комнате (последнее — внизу):\n${t.text}\n\n` : ""}Люди в комнате сейчас молча читают. Продолжите разговор собеседников между собой: ${BANTER_LINES} короткие реплики по очереди, каждая отвечает на предыдущую. Развивайте тему комнаты или то, о чём говорили раньше, ничего не повторяя. Последняя реплика может оставить место для участника, но без прямых вопросов к нему.`;
    const lines = await generate(roomId, s, m, null, prompt, false, true);
    if (!lines?.length) return;
    for (const [i, line] of lines.entries()) {
      if (i > 0) {
        // Реплики приходят по одной, как в живом чате: «печатает…», затем сообщение.
        publish(roomId, "ai_typing", { on: true });
        await new Promise((r) => setTimeout(r, Math.min(9000, 2500 + line.text.length * 35)));
        publish(roomId, "ai_typing", { on: false });
      }
      if (!live()) return;
      await post(roomId, s, [line], null);
    }
  } finally {
    s.busy = false;
  }
  if (live()) scheduleBanter(roomId, s, BANTER_GAP_MS);
}

/* ---------- «Слушать ИИ»: одна озвучка реплики на всю комнату ---------- */

export async function aiAudio(roomId: string, messageId: string, userId: string): Promise<Uint8Array | null> {
  if (aiMode() !== "voice") return null;
  // Озвучка только для живого слушателя, который сейчас в комнате (его присутствие подтверждено).
  if (!isOnline(roomId, userId)) return null;
  const s = G.rooms.get(roomId);
  if (!s) return null;
  const ready = s.audio.get(messageId);
  if (ready) return ready;
  const job = (async () => {
    const client = db();
    const { data: msg } = await client
      .from("room_messages")
      .select("id, room_id, kind, body, persona_id, hidden_at, created_at")
      .eq("id", messageId)
      .maybeSingle();
    if (!msg || msg.room_id !== roomId || msg.kind !== "ai" || msg.hidden_at) return null;
    if (Date.now() - new Date(msg.created_at).getTime() > AUDIO_FRESH_MS) return null;
    const m = await meta(roomId);
    const voice = m?.personas.find((p) => p.id === msg.persona_id)?.voice ?? "Sulafat";
    const sec = speechSeconds(msg.body.length);
    const spend: Spend = { tokens: 0, tts_sec: sec, replies: 0, cost_micro: ttsCost(msg.body.length, sec) };
    if (!(await reserve(client, roomId, userId, spend))) return null;
    try {
      const wav = await synthesize(msg.body, voice, s.controller.signal);
      const real = Math.max(0.5, (wav.length - 44) / 48_000);
      const delta = real - sec;
      s.stats.tts += real;
      s.stats.cost += ttsCost(msg.body.length, real);
      await settle(client, roomId, userId, { tokens: 0, tts_sec: delta, replies: 0, cost_micro: ttsCost(0, delta) });
      return wav;
    } catch (e) {
      if (!s.controller.signal.aborted) console.error("rooms tts:", (e as Error).message);
      await settle(client, roomId, userId, { tokens: 0, tts_sec: -sec, replies: 0, cost_micro: -spend.cost_micro });
      return null;
    }
  })();
  s.audio.set(messageId, job);
  // В памяти держим только последние реплики.
  if (s.audio.size > 20) s.audio.delete(s.audio.keys().next().value!);
  const out = await job;
  if (!out) s.audio.delete(messageId);
  return out;
}

// Для проверок: сколько комнат сейчас «живут» в движке и сколько запросов к ИИ идёт.
export function engineStats() {
  return { rooms: G.rooms.size, active: G.active };
}
