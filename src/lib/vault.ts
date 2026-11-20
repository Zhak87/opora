import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// Замок на разговоры с ИИ. В базе лежит только зашифрованный текст: «enc1.<iv>.<шифр+метка>».
// Ключ каждого человека выводится из главного ключа (CHAT_ENCRYPTION_KEY, лежит только на сервере
// в server.env, не в базе и не в её копиях) и его id. Без главного ключа ни база, ни её копия,
// ни админка, ни Supabase Studio текст не покажут.
//
// Старые сообщения без префикса читаются как есть: так сайт работает до и во время перешифровки.

const PREFIX = "enc1.";
const INFO = Buffer.from("opora-chat-v1");
const cache = new Map<string, Buffer>();
let master: Buffer | null | undefined;

function masterKey(): Buffer | null {
  if (master !== undefined) return master;
  const raw = process.env.CHAT_ENCRYPTION_KEY?.trim();
  const key = raw ? Buffer.from(raw, "base64") : null;
  if (raw && key?.length !== 32) console.error("[vault] CHAT_ENCRYPTION_KEY должен быть 32 байта в base64");
  master = key?.length === 32 ? key : null;
  if (!master && process.env.NODE_ENV === "production") console.warn("[vault] нет CHAT_ENCRYPTION_KEY: разговоры сохраняются без шифрования");
  return master;
}

function userKey(userId: string): Buffer | null {
  const m = masterKey();
  if (!m) return null;
  let key = cache.get(userId);
  if (!key) {
    key = Buffer.from(hkdfSync("sha256", m, Buffer.from(userId), INFO, 32));
    if (cache.size > 5000) cache.clear();
    cache.set(userId, key);
  }
  return key;
}

export function vaultEnabled() {
  return masterKey() !== null;
}

export function isSealed(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX);
}

// id человека входит в шифр как «доп. данные»: чужой текст, подложенный в строку другого человека, не откроется.
export function seal(userId: string, text: string): string {
  const key = userKey(userId);
  if (!key || isSealed(text)) return text;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(userId));
  const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return `${PREFIX}${iv.toString("base64url")}.${body.toString("base64url")}`;
}

// Человеку никогда не показываем технических ошибок: если текст не открылся, вместо него мягкая заглушка.
export const UNREADABLE = "…";

export function unseal(userId: string, value: string): string;
export function unseal(userId: string, value: string | null | undefined): string | null | undefined;
export function unseal(userId: string, value: string | null | undefined) {
  if (!isSealed(value)) return value;
  const key = userKey(userId);
  if (!key) {
    console.error("[vault] есть зашифрованный текст, но нет CHAT_ENCRYPTION_KEY");
    return UNREADABLE;
  }
  try {
    const [iv, body] = value.slice(PREFIX.length).split(".");
    const raw = Buffer.from(body, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(userId));
    decipher.setAuthTag(raw.subarray(raw.length - 16));
    return Buffer.concat([decipher.update(raw.subarray(0, raw.length - 16)), decipher.final()]).toString("utf8");
  } catch {
    console.error("[vault] не удалось расшифровать текст");
    return UNREADABLE;
  }
}

// Вывод «сохранить в дневник» из метки собеседника — это слова человека, их тоже закрываем.
// Маршрут (фокус, фаза, оценка) — это коды для метрик, они остаются открытыми.
export function sealMeta<T extends { save?: string } | null | undefined>(userId: string, meta: T): T {
  if (!meta?.save) return meta;
  return { ...meta, save: seal(userId, meta.save) };
}

export function unsealMeta<T>(userId: string, meta: T): T {
  const m = meta as { save?: unknown } | null | undefined;
  if (!m || typeof m !== "object" || !isSealed(m.save)) return meta;
  return { ...m, save: unseal(userId, m.save) } as T;
}

export function unsealRows<T extends { content?: string | null; meta?: unknown }>(userId: string, rows: T[] | null | undefined): T[] {
  return (rows ?? []).map((r) => ({
    ...r,
    ...(typeof r.content === "string" ? { content: unseal(userId, r.content) } : {}),
    ...("meta" in r ? { meta: unsealMeta(userId, r.meta) } : {}),
  }));
}

// Материал для психолога (client_ai_material): реплики клиента приходят из базы зашифрованными и целиком.
// Открываем их ключом клиента и укорачиваем, как раньше делала база.
export function unsealMaterial<T>(clientId: string, data: T): T {
  const d = data as { ai_chats?: { at?: string; text?: unknown }[] } | null | undefined;
  if (!d || !Array.isArray(d.ai_chats)) return data;
  return {
    ...d,
    ai_chats: d.ai_chats.map((m) => ({ ...m, text: typeof m.text === "string" ? unseal(clientId, m.text).slice(0, 800) : m.text })),
  } as T;
}
