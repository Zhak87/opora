import type { SupabaseClient } from "@supabase/supabase-js";

// Панель администратора: роли сотрудников и типы ответов базы (supabase/migrations/0015_admin_panel.sql).
// Права проверяет сама база; здесь только чтение роли, чтобы показать или спрятать кнопки.

export const STAFF_ROLES = ["viewer", "admin", "developer"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
// Роль в списке пользователей: сотрудник или обычный аккаунт.
export const ROLES = ["user", ...STAFF_ROLES] as const;
export type Role = (typeof ROLES)[number];
export const isRole = (v: unknown): v is Role => typeof v === "string" && (ROLES as readonly string[]).includes(v);

export async function staffRole(supabase: SupabaseClient): Promise<StaffRole | null> {
  const { data } = await supabase.rpc("staff_role");
  return (STAFF_ROLES as readonly string[]).includes(data) ? (data as StaffRole) : null;
}

// Может менять (проверять анкеты, блокировать) и может назначать роли.
export const canManage = (role: StaffRole | null) => role === "admin" || role === "developer";
export const canGrant = (role: StaffRole | null) => role === "developer";

export const USER_FILTERS = ["all", "staff", "psychologists", "guests", "blocked"] as const;
export type UserFilter = (typeof USER_FILTERS)[number];

export type AdminUser = {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  last_seen: string | null;
  guest: boolean;
  role: Role;
  psy_status: string | null;
  psy_slug: string | null;
  blocked: boolean;
  conversations: number;
};

export type Overview = {
  at: string;
  online: number;
  online_hour: number;
  today: { visitors: number; landing: number; trials: number; signups: number; chats: number; replies: number; practices: number };
  totals: {
    users: number; guests: number; users_7d: number; active_7d: number; staff: number; psychologists: number; psy_pending: number;
    conversations: number; messages: number; journal: number; rooms: number; sessions: number; blocked: number;
  };
  signups_daily: { day: string; n: number }[];
  feed: { name: string; at: string; user: boolean; note: string | null }[];
};

export type AdminAction = { at: string; action: string; details: Record<string, string>; actor: string | null; target: string | null };

export type Insights = { summary: string; good: string[]; problems: string[]; actions: string[] };
