import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";
import { aiConfigured } from "@/lib/ai";
import { voiceConfigured, voiceUrl } from "@/lib/rooms/voice";
import { ROOM_PREFIX, TOKEN_TTL_SEC, roomName } from "./config";

// Видеокомнаты консультаций на том же сервере LiveKit, что и голос «Комнат».
// Каждая встреча — отдельная закрытая комната consult-<встреча>-<номер>. Пропуск выдаёт только сервер сайта
// и только назначенным психологу и клиенту (проверки — в access.ts). Запись (egress) не включается.

export const videoConfigured = voiceConfigured;
export const videoUrl = voiceUrl;

// ИИ-помощник психолога (вопросы, подготовка, черновик итогов): CONSULT_AI=on.
// Обработка речи во время звонка — отдельная настройка CONSULT_SPEECH=on, поверх CONSULT_AI.
// Включать только с поставщиком ИИ, который не использует данные для обучения (платный тариф), и после
// проверки условий хранения и передачи данных (см. docs/consultations.md).
export function consultAiEnabled() {
  return aiConfigured() && process.env.CONSULT_AI === "on";
}
export function consultSpeechEnabled() {
  return consultAiEnabled() && process.env.CONSULT_SPEECH === "on";
}
// Сколько дней хранить расшифровку и подсказки после встречи; черновик — втрое дольше (до публикации итогов).
export function keepDays() {
  const n = Number(process.env.CONSULT_KEEP_DAYS);
  return Number.isFinite(n) && n >= 1 && n <= 365 ? Math.round(n) : 30;
}

function apiUrl() {
  return (process.env.LIVEKIT_API_URL || process.env.LIVEKIT_URL || "").replace(/^ws/, "http");
}
function service() {
  return new RoomServiceClient(apiUrl(), process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
}

export async function consultToken({ session, epoch, user, name }: { session: string; epoch: number; user: string; name: string }) {
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: user,
    name,
    ttl: TOKEN_TTL_SEC,
  });
  at.addGrant({
    roomJoin: true,
    room: roomName(session, epoch),
    canSubscribe: true,
    canPublish: true,
    canPublishData: false,
    canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE],
    canUpdateOwnMetadata: false,
  });
  return at.toJwt();
}

// Кто сейчас в комнате встречи (только идентификаторы, без содержимого).
export async function roomIdentities(session: string, epoch: number): Promise<string[] | null> {
  if (!videoConfigured()) return null;
  try {
    const list = await service().listParticipants(roomName(session, epoch));
    return list.map((p) => p.identity);
  } catch {
    return [];
  }
}

// Закрыть все комнаты встречи, кроме текущей (keepEpoch). Без keepEpoch — все.
// Вызывается после переноса, отмены и завершения: открытые подключения обрываются сразу.
export async function closeConsultRooms(session: string, keepEpoch?: number) {
  if (!videoConfigured()) return;
  try {
    const rooms = await service().listRooms();
    const prefix = `${ROOM_PREFIX}${session}-`;
    const keep = keepEpoch == null ? null : roomName(session, keepEpoch);
    await Promise.all(
      rooms
        .filter((r) => r.name.startsWith(prefix) && r.name !== keep)
        .map((r) => service().deleteRoom(r.name).catch(() => {})),
    );
  } catch (e) {
    console.error("consult: close rooms failed", (e as Error)?.name ?? "error");
  }
}
