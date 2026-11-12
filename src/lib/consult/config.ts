// Общие правила видеоконсультаций (без секретов: файл можно подключать и в браузере).

// Комната открывается за 15 минут до начала и остаётся доступной 30 минут после конца:
// участник, у которого оборвалась связь, может вернуться в ту же встречу.
export const OPEN_BEFORE_MIN = 15;
export const OPEN_AFTER_MIN = 30;

// Пропуск в видеокомнату живёт 10 минут: этого хватает, чтобы подключиться.
// Уже подключённых LiveKit продлевает сам; повторный вход — с новым пропуском.
export const TOKEN_TTL_SEC = 10 * 60;

export type ConsultRole = "psychologist" | "client";

export type JoinWindow = { opensAt: number; closesAt: number };

export function joinWindow(s: { starts_at: string; ends_at: string }): JoinWindow {
  return {
    opensAt: Date.parse(s.starts_at) - OPEN_BEFORE_MIN * 60_000,
    closesAt: Date.parse(s.ends_at) + OPEN_AFTER_MIN * 60_000,
  };
}

export type JoinState = "open" | "early" | "ended" | "cancelled" | "completed" | "offline";

export function joinState(s: { starts_at: string; ends_at: string; status: string; format: string }, now = Date.now()): JoinState {
  if (s.format !== "online") return "offline";
  if (s.status === "cancelled") return "cancelled";
  if (s.status === "completed") return "completed";
  const w = joinWindow(s);
  if (now < w.opensAt) return "early";
  if (now > w.closesAt) return "ended";
  return "open";
}

export const roomName = (sessionId: string, epoch: number) => `consult-${sessionId}-${epoch}`;
export const ROOM_PREFIX = "consult-";
