// Общие типы комнат: их используют и сервер, и браузер.

export type RoomFormat = "chat" | "voice";
export type RoomAccess = "open" | "request";
export type RequestStatus = "pending" | "approved" | "declined";
export type AccessState =
  | "ok"
  | "not_found"
  | "ended"
  | "banned"
  | "not_started"
  | "request_none"
  | "request_pending"
  | "request_declined";

export type RoomCard = {
  id: string;
  title: string;
  description: string;
  format: RoomFormat;
  access: RoomAccess;
  scheduled: boolean;
  starts_at: string;
  creator_id: string;
  request: RequestStatus | null;
};

export type RoomInfo = {
  id: string;
  title: string;
  description: string;
  format: RoomFormat;
  access: RoomAccess;
  scheduled: boolean;
  starts_at: string;
  ended_at: string | null;
  max_speakers: number;
  creator_id: string;
  creator_name: string | null;
  is_creator: boolean;
  my_role: "listener" | "speaker" | null;
  my_hand: boolean;
  my_muted: boolean;
  request_status: RequestStatus | null;
  pending_requests: number;
};

export type RoomMessage = {
  id: string;
  sender_id: string | null;
  sender_name: string | null;
  kind: "user" | "moderator";
  body: string;
  flag: string | null;
  reply_to: string | null;
  hidden: boolean;
  created_at: string;
};

export type RoomPerson = {
  user_id: string;
  name: string | null;
  role: "listener" | "speaker";
  hand: boolean;
  muted: boolean;
  banned: boolean;
};

export type RoomRequest = { user_id: string; name: string | null; status: RequestStatus; created_at: string };

export type RoomReport = {
  id: string;
  source: "ai" | "user";
  reporter_name: string | null;
  target_id: string;
  target_name: string | null;
  message_id: string | null;
  message_body: string | null;
  reason: string;
  created_at: string;
};

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
