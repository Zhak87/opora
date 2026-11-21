// Живые события комнат в памяти сервера: кто сейчас в комнате, новые сообщения, завершение.
// Сайт работает одним процессом (deploy/docker-compose.yml, служба app), поэтому общий объект в памяти
// видят и страницы, и действия, и потоки событий. Если когда-нибудь запустить несколько копий сайта,
// эту часть нужно перенести в общий канал (например, Postgres LISTEN/NOTIFY или Redis).

export type RoomEvent = { event: string; data: unknown };

type Conn = {
  id: string;
  userId: string;
  name: string;
  send: (e: RoomEvent) => void;
  close: () => void;
  // последнее подтверждение присутствия (heartbeat) от этого человека
  seenAt?: number;
};

// Кто-то вошёл в пустую комнату (сессия началась) или ушёл последний (сессия закончилась).
// Сюда подписан ИИ-движок комнат: при уходе последнего человека он отменяет очереди генерации и озвучки.
export type HubHooks = {
  occupied?: (roomId: string) => void;
  empty?: (roomId: string) => void;
  joined?: (roomId: string, userId: string, first: boolean) => void;
};

type Hub = {
  rooms: Map<string, Map<string, Conn>>;
  catalog: Map<string, (e: RoomEvent) => void>;
  countsTimer: ReturnType<typeof setTimeout> | null;
  hooks: HubHooks;
  sweeper: ReturnType<typeof setInterval> | null;
};

const g = globalThis as unknown as { __oporaRooms?: Hub };
const hub: Hub = (g.__oporaRooms ??= { rooms: new Map(), catalog: new Map(), countsTimer: null, hooks: {}, sweeper: null });
hub.hooks ??= {};

// Присутствие подтверждается heartbeat'ом раз в 25 секунд. Если подтверждения нет дольше этого срока
// (вкладка уснула, сеть пропала, а соединение «висит»), человек считается ушедшим.
// Не меньше 35 секунд: клиенты шлют heartbeat раз в 25 секунд.
export const PRESENCE_TTL_MS = Math.max(Number(process.env.ROOMS_PRESENCE_TTL_MS) || 75_000, 35_000);

export function setHooks(hooks: HubHooks) {
  hub.hooks = hooks;
}

function sweep() {
  const now = Date.now();
  for (const [roomId, conns] of hub.rooms) {
    for (const c of [...conns.values()]) {
      if (now - (c.seenAt ?? now) > PRESENCE_TTL_MS) {
        try {
          c.close();
        } catch {}
        leave(roomId, c.id);
      }
    }
  }
}
hub.sweeper ??= setInterval(sweep, Math.min(15_000, PRESENCE_TTL_MS / 3));
(hub.sweeper as { unref?: () => void }).unref?.();

// Подтвердить присутствие человека во всех его вкладках этой комнаты. false — его здесь нет (нужно переподключиться).
export function beat(roomId: string, userId: string) {
  let found = false;
  for (const c of hub.rooms.get(roomId)?.values() ?? []) {
    if (c.userId === userId) {
      c.seenAt = Date.now();
      found = true;
    }
  }
  return found;
}

export function humans(roomId: string) {
  return presence(roomId).length;
}

export type PresencePerson = { userId: string; name: string };

// Люди в комнате: каждый считается один раз, сколько бы вкладок у него ни было открыто.
export function presence(roomId: string): PresencePerson[] {
  const seen = new Map<string, PresencePerson>();
  for (const c of hub.rooms.get(roomId)?.values() ?? []) if (!seen.has(c.userId)) seen.set(c.userId, { userId: c.userId, name: c.name });
  return [...seen.values()];
}

export function onlineCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [roomId, conns] of hub.rooms) {
    const n = new Set([...conns.values()].map((c) => c.userId)).size;
    if (n) out[roomId] = n;
  }
  return out;
}

export function isOnline(roomId: string, userId: string) {
  for (const c of hub.rooms.get(roomId)?.values() ?? []) if (c.userId === userId) return true;
  return false;
}

function countsChanged() {
  if (hub.countsTimer) return;
  // Склеиваем частые входы и выходы в одно обновление каталога.
  hub.countsTimer = setTimeout(() => {
    hub.countsTimer = null;
    const data = onlineCounts();
    for (const send of hub.catalog.values()) send({ event: "counts", data });
  }, 400);
}

export function join(roomId: string, conn: Conn) {
  let conns = hub.rooms.get(roomId);
  const wasEmpty = !conns || conns.size === 0;
  if (!conns) hub.rooms.set(roomId, (conns = new Map()));
  // Переподключение того же человека — не новый вход: ИИ не здоровается второй раз.
  const already = [...conns.values()].some((c) => c.userId === conn.userId);
  conn.seenAt = Date.now();
  conns.set(conn.id, conn);
  publish(roomId, "presence", presence(roomId));
  countsChanged();
  try {
    if (wasEmpty) hub.hooks.occupied?.(roomId);
    hub.hooks.joined?.(roomId, conn.userId, !already);
  } catch (e) {
    console.error("rooms hub hook:", e);
  }
}

export function leave(roomId: string, connId: string) {
  const conns = hub.rooms.get(roomId);
  if (!conns?.delete(connId)) return;
  if (!conns.size) hub.rooms.delete(roomId);
  publish(roomId, "presence", presence(roomId));
  countsChanged();
  if (!conns.size) {
    try {
      hub.hooks.empty?.(roomId);
    } catch (e) {
      console.error("rooms hub hook:", e);
    }
  }
}

export function publish(roomId: string, event: string, data: unknown, onlyUser?: string) {
  for (const c of hub.rooms.get(roomId)?.values() ?? []) {
    if (onlyUser && c.userId !== onlyUser) continue;
    try {
      c.send({ event, data });
    } catch {}
  }
}

// Отключить человека от комнаты (удалён создателем) или всех (комната завершена).
export function disconnect(roomId: string, userId?: string) {
  for (const c of [...(hub.rooms.get(roomId)?.values() ?? [])]) {
    if (userId && c.userId !== userId) continue;
    c.close();
    leave(roomId, c.id);
  }
}

export function watchCatalog(id: string, send: (e: RoomEvent) => void) {
  hub.catalog.set(id, send);
  send({ event: "counts", data: onlineCounts() });
  return () => hub.catalog.delete(id);
}

// Каталог изменился (новая комната, завершение, решение по заявке): открытые каталоги перечитают список.
export function catalogChanged() {
  for (const send of hub.catalog.values()) {
    try {
      send({ event: "changed", data: null });
    } catch {}
  }
}
