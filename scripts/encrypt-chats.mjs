// Перешифровка старых разговоров с ИИ (один раз после включения замка, повторный запуск ничего не меняет).
// Запускается внутри контейнера сайта: Actions → Server → encrypt-chats (сначала encrypt-chats-check — только счёт).
// Шифр тот же, что в src/lib/vault.ts: AES-256-GCM, ключ человека = HKDF(CHAT_ENCRYPTION_KEY, id человека).
// Нужны NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY и CHAT_ENCRYPTION_KEY. Тексты в журнал не пишутся.
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const dry = process.argv.includes("--dry");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const master = Buffer.from(process.env.CHAT_ENCRYPTION_KEY?.trim() ?? "", "base64");
if (!url || !service) throw new Error("нет NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY");
if (master.length !== 32) throw new Error("нет CHAT_ENCRYPTION_KEY (32 байта в base64)");

const PREFIX = "enc1.";
const INFO = Buffer.from("opora-chat-v1");
const keys = new Map();
const key = (uid) => keys.get(uid) ?? keys.set(uid, Buffer.from(hkdfSync("sha256", master, Buffer.from(uid), INFO, 32))).get(uid);

function seal(uid, text) {
  if (typeof text !== "string" || text.startsWith(PREFIX)) return text;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(uid), iv);
  c.setAAD(Buffer.from(uid));
  const body = Buffer.concat([c.update(text, "utf8"), c.final(), c.getAuthTag()]);
  const sealed = `${PREFIX}${iv.toString("base64url")}.${body.toString("base64url")}`;
  if (unseal(uid, sealed) !== text) throw new Error("проверка шифра не прошла");
  return sealed;
}

function unseal(uid, value) {
  const [iv, body] = value.slice(PREFIX.length).split(".");
  const raw = Buffer.from(body, "base64url");
  const d = createDecipheriv("aes-256-gcm", key(uid), Buffer.from(iv, "base64url"));
  d.setAAD(Buffer.from(uid));
  d.setAuthTag(raw.subarray(raw.length - 16));
  return Buffer.concat([d.update(raw.subarray(0, raw.length - 16)), d.final()]).toString("utf8");
}

const headers = { apikey: service, authorization: `Bearer ${service}`, "content-type": "application/json" };
async function rest(path, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers } });
  if (!res.ok) throw new Error(`база ответила ${res.status} на ${path.split("?")[0]}`);
  return res.status === 204 ? null : res.json();
}
async function count(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { method: "HEAD", headers: { ...headers, prefer: "count=exact" } });
  return Number(res.headers.get("content-range")?.split("/")[1] ?? 0);
}

const openMsgs = "messages?content=not.like.enc1.*";
const openSaves = "messages?meta->>save=not.is.null&meta->>save=not.like.enc1.*";
const openTitles = "conversations?mode=eq.talk&title=not.like.enc1.*";

console.log(
  `Открытым текстом: сообщений ${await count(`${openMsgs}&select=id`)}, выводов «в дневник» ${await count(`${openSaves}&select=id`)}, названий ${await count(`${openTitles}&select=id`)}; уже зашифровано сообщений ${await count("messages?content=like.enc1.*&select=id")}`,
);
if (dry) process.exit(0);

let done = 0;
for (;;) {
  const rows = await rest(`${openMsgs}&select=id,user_id,content,meta&order=id&limit=200`);
  if (!rows.length) break;
  for (const r of rows) {
    const meta = r.meta && typeof r.meta.save === "string" ? { ...r.meta, save: seal(r.user_id, r.meta.save) } : r.meta;
    await rest(`messages?id=eq.${r.id}`, { method: "PATCH", body: JSON.stringify({ content: seal(r.user_id, r.content), meta }) });
  }
  done += rows.length;
  console.log(`сообщения: ${done}`);
}
// Выводы в метках у сообщений, текст которых уже был зашифрован (на случай частичного прогона).
for (;;) {
  const rows = await rest(`${openSaves}&select=id,user_id,meta&order=id&limit=200`);
  if (!rows.length) break;
  for (const r of rows) await rest(`messages?id=eq.${r.id}`, { method: "PATCH", body: JSON.stringify({ meta: { ...r.meta, save: seal(r.user_id, r.meta.save) } }) });
}
let titles = 0;
for (;;) {
  const rows = await rest(`${openTitles}&select=id,user_id,title&order=id&limit=200`);
  if (!rows.length) break;
  for (const r of rows) await rest(`conversations?id=eq.${r.id}`, { method: "PATCH", body: JSON.stringify({ title: seal(r.user_id, r.title) }) });
  titles += rows.length;
}
console.log(`Готово: сообщений ${done}, названий ${titles}. Осталось открытым: ${await count(`${openMsgs}&select=id`)}`);
