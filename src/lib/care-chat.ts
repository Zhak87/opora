import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/config";
import { careChatMessages as chatMessages } from "@/i18n/care-chat";
import { whenLabel } from "./time";

// Переписка клиента и психолога и уведомления о событиях работы.
// Писать и отмечать прочитанное можно только через функции базы (supabase/migrations/0008_care_chat.sql).

export type CareMessage = {
  id: string;
  psychologist_id: string;
  client_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export async function listMessages(supabase: SupabaseClient, pair: { psychologist: string; client: string }, limit = 300) {
  const { data } = await supabase
    .from("care_messages")
    .select("id, psychologist_id, client_id, sender_id, body, created_at, read_at")
    .eq("psychologist_id", pair.psychologist)
    .eq("client_id", pair.client)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as CareMessage[]).reverse();
}

// Последнее сообщение в каждой переписке, где я участвую.
export async function lastMessages(supabase: SupabaseClient, me: string) {
  const { data } = await supabase
    .from("care_messages")
    .select("id, psychologist_id, client_id, sender_id, body, created_at, read_at")
    .or(`psychologist_id.eq.${me},client_id.eq.${me}`)
    .order("created_at", { ascending: false })
    .limit(500);
  const map = new Map<string, CareMessage>();
  for (const m of (data ?? []) as CareMessage[]) {
    const peer = m.psychologist_id === me ? m.client_id : m.psychologist_id;
    if (!map.has(peer)) map.set(peer, m);
  }
  return map;
}

export async function unreadByPeer(supabase: SupabaseClient) {
  const { data } = await supabase.rpc("care_unread");
  return new Map(((data ?? []) as { peer: string; unread: number }[]).map((r) => [r.peer, r.unread]));
}

export async function unreadTotal(supabase: SupabaseClient) {
  let n = 0;
  for (const v of (await unreadByPeer(supabase)).values()) n += v;
  return n;
}

export type CareNotification = {
  id: string;
  kind: string;
  actor_id: string | null;
  client_id: string | null;
  psychologist_id: string | null;
  details: { at?: string; session?: string } & Record<string, unknown>;
  created_at: string;
  read_at: string | null;
};

export type CareNotice = { id: string; text: string; href: string; at: string; fresh: boolean };

// Уведомления в виде готовых строк. role — с чьей стороны смотрим: клиент или психолог.
export async function careNotices(
  supabase: SupabaseClient,
  { me, role, locale, tz, days = 14, limit = 20 }: { me: string; role: "client" | "pro"; locale: Locale; tz: string; days?: number; limit?: number },
): Promise<CareNotice[]> {
  const m = chatMessages[locale];
  const templates = m.events[role];
  const { data } = await supabase
    .from("care_notifications")
    .select("id, kind, actor_id, client_id, psychologist_id, details, created_at, read_at")
    .eq("user_id", me)
    .gte("created_at", new Date(Date.now() - days * 86_400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = ((data ?? []) as CareNotification[]).filter((r) => templates[r.kind]);
  if (!rows.length) return [];
  const peers = [...new Set(rows.map((r) => (role === "pro" ? r.client_id : r.psychologist_id)).filter(Boolean))] as string[];
  const names = await peerNames(supabase, role, peers);
  return rows.map((r) => {
    const peer = (role === "pro" ? r.client_id : r.psychologist_id) ?? "";
    const at = typeof r.details?.at === "string" ? r.details.at : "";
    const session = typeof r.details?.session === "string" ? r.details.session : "";
    const href =
      role === "pro"
        ? session && r.kind !== "session.cancelled"
          ? `/pro/sessions/${session}`
          : r.kind === "link.requested"
            ? "/pro/schedule"
            : r.kind === "psychologist.reviewed"
              ? "/pro/profile"
              : peer && r.kind !== "link.ended"
                ? `/pro/clients/${peer}`
                : "/pro"
        : "/care";
    return {
      id: r.id,
      text: templates[r.kind]({
        name: names.get(peer) ?? String(r.details?.[role === "pro" ? "client_name" : "psychologist_name"] ?? (role === "pro" ? "—" : m.someone)), when: at ? whenLabel(at, tz, locale) : "",
      }),
      href,
      at: r.created_at,
      fresh: !r.read_at,
    };
  });
}

// Имена собеседников: клиентов психолог видит через profiles, психологов клиент — через анкеты.
export async function peerNames(supabase: SupabaseClient, role: "client" | "pro", ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  if (role === "pro") {
    const { data } = await supabase.from("profiles").select("id, name").in("id", ids);
    return new Map((data ?? []).filter((p) => p.name).map((p) => [p.id as string, p.name as string]));
  }
  const { data } = await supabase.from("psychologists").select("user_id, full_name").in("user_id", ids);
  return new Map((data ?? []).map((p) => [p.user_id as string, p.full_name as string]));
}

export async function markNotificationsRead(supabase: SupabaseClient, ids?: string[]) {
  await supabase.rpc("mark_notifications_read", { p_ids: ids ?? null });
}
