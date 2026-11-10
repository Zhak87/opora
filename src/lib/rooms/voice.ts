import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";

// Голос в комнатах идёт через собственный медиасервер LiveKit (служба livekit в deploy/docker-compose.yml).
// Сервер только пересылает звук: спикеры отправляют свой голос один раз, слушатели получают его копии.
// Ничего не записывается: запись (egress) в LiveKit не настроена и не запускается.
//   LIVEKIT_URL         — адрес для браузера, например wss://myopora.kz
//   LIVEKIT_API_URL     — адрес для сервера сайта, например http://livekit:7880 (по умолчанию = LIVEKIT_URL)
//   LIVEKIT_API_KEY / LIVEKIT_API_SECRET — ключи, создаются на сервере (deploy/supabase/gen-keys.sh)

export function voiceConfigured() {
  return Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
}

export function voiceUrl() {
  return process.env.LIVEKIT_URL ?? "";
}

function apiUrl() {
  return (process.env.LIVEKIT_API_URL || process.env.LIVEKIT_URL || "").replace(/^ws/, "http");
}

function service() {
  return new RoomServiceClient(apiUrl(), process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
}

const permission = (speak: boolean) => ({
  canSubscribe: true,
  canPublish: speak,
  canPublishData: false,
  canPublishSources: speak ? [TrackSource.MICROPHONE] : [],
});

// Пропуск в голосовую часть комнаты. Говорить (публиковать микрофон) может только спикер без запрета от создателя.
export async function voiceToken({ room, user, name, speak }: { room: string; user: string; name: string; speak: boolean }) {
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: user,
    name,
    ttl: 4 * 60 * 60,
  });
  at.addGrant({ roomJoin: true, room, ...permission(speak), canUpdateOwnMetadata: false });
  return at.toJwt();
}

// Изменить право говорить у того, кто уже в голосе. Если человек сейчас не подключён, это не ошибка.
export async function setVoicePermission(room: string, user: string, speak: boolean) {
  if (!voiceConfigured()) return;
  try {
    await service().updateParticipant(room, user, { permission: permission(speak) });
  } catch {}
}

export async function removeFromVoice(room: string, user: string) {
  if (!voiceConfigured()) return;
  try {
    await service().removeParticipant(room, user);
  } catch {}
}

export async function closeVoice(room: string) {
  if (!voiceConfigured()) return;
  try {
    await service().deleteRoom(room);
  } catch {}
}
