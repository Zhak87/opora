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
};

type Hub = {
  rooms: Map<string, Map<string, Conn>>;
  catalog: Map<string, (e: RoomEvent) => void>;
  countsTimer: ReturnType<typeof setTimeout> | null;
};

const g = globalThis as unknown as { __oporaRooms?: Hub };
const hub: Hub = (g.__oporaRooms ??= { rooms: new Map(), catalog: new Map(), countsTimer: null });

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
  if (!conns) hub.rooms.set(roomId, (conns = new Map()));
  conns.set(conn.id, conn);
  publish(roomId, "presence", presence(roomId));
  countsChanged();
}

export function leave(roomId: string, connId: string) {
  const conns = hub.rooms.get(roomId);
  if (!conns?.delete(connId)) return;
  if (!conns.size) hub.rooms.delete(roomId);
  publish(roomId, "presence", presence(roomId));
  countsChanged();
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
