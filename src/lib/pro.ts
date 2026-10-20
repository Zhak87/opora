import type { SupabaseClient } from "@supabase/supabase-js";

// Психологи и связи с клиентами: типы и чтение из базы. Права проверяет сама база (RLS и функции
// в supabase/migrations/0006_psychologists.sql), здесь только удобные запросы.

export const SCOPES = ["wellbeing", "goals", "journal", "ai_chats", "analytics"] as const;
export type Scope = (typeof SCOPES)[number];
export const isScope = (v: unknown): v is Scope => typeof v === "string" && (SCOPES as readonly string[]).includes(v);

// Версия текста согласия на передачу данных специалисту. Меняется вместе с текстом в src/i18n/care.ts.
export const CARE_CONSENT_VERSION = "2026-10-20";

export type PsyStatus = "draft" | "pending" | "approved" | "rejected" | "suspended";
export type Education = { institution: string; degree?: string; year?: number | null };

export type Psychologist = {
  user_id: string;
  slug: string;
  full_name: string;
  photo_url: string | null;
  headline: string;
  about: string;
  approach: string;
  specializations: string[];
  education: Education[];
  experience_years: number | null;
  languages: string[];
  formats: string[];
  city: string | null;
  price: number | null;
  currency: string;
  session_minutes: number;
  timezone: string;
  accepting_clients: boolean;
  status: PsyStatus;
  terms_accepted_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export const PUBLIC_COLUMNS =
  "user_id, slug, full_name, photo_url, headline, about, approach, specializations, education, experience_years, languages, formats, city, price, currency, session_minutes, accepting_clients, status, reviewed_at";

export async function myPsychologist(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("psychologists").select("*").eq("user_id", userId).maybeSingle();
  return (data as Psychologist | null) ?? null;
}

export async function isAdmin(supabase: SupabaseClient) {
  const { data } = await supabase.rpc("is_admin");
  return data === true;
}

export type Link = {
  id: string;
  psychologist_id: string;
  client_id: string;
  status: "pending" | "active" | "ended";
  source: "invite" | "catalog";
  invite_id: string | null;
  created_at: string;
  activated_at: string | null;
  ended_at: string | null;
};

export type Grant = { link_id: string; scope: Scope; granted_at: string };

// Связи клиента с психологами (без завершённых) и действующие согласия.
export async function myCare(supabase: SupabaseClient, userId: string) {
  const { data: links } = await supabase
    .from("client_links")
    .select("id, psychologist_id, client_id, status, source, invite_id, created_at, activated_at, ended_at")
    .eq("client_id", userId)
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: false });
  const list = (links ?? []) as Link[];
  if (!list.length) return [];
  const ids = list.map((l) => l.psychologist_id);
  const [{ data: people }, { data: grants }] = await Promise.all([
    supabase.from("psychologists").select(PUBLIC_COLUMNS).in("user_id", ids),
    supabase
      .from("consent_grants")
      .select("link_id, scope, granted_at")
      .in("link_id", list.map((l) => l.id))
      .is("revoked_at", null),
  ]);
  return list.map((link) => ({
    link,
    psychologist: ((people ?? []) as unknown as Psychologist[]).find((p) => p.user_id === link.psychologist_id) ?? null,
    scopes: ((grants ?? []) as Grant[]).filter((g) => g.link_id === link.id).map((g) => g.scope),
  }));
}

// Есть ли у человека активный психолог: для пункта меню.
export async function hasCare(supabase: SupabaseClient, userId: string) {
  const { count } = await supabase
    .from("client_links")
    .select("id", { count: "exact", head: true })
    .eq("client_id", userId)
    .in("status", ["pending", "active"]);
  return (count ?? 0) > 0;
}

export type ClientRow = { link: Link; name: string | null; scopes: Scope[] };

// Клиенты психолога. Имя видно только при активной связи (правило в базе).
export async function myClients(supabase: SupabaseClient, psychologistId: string, withEnded = false) {
  let q = supabase
    .from("client_links")
    .select("id, psychologist_id, client_id, status, source, invite_id, created_at, activated_at, ended_at")
    .eq("psychologist_id", psychologistId)
    .order("created_at", { ascending: false });
  if (!withEnded) q = q.in("status", ["pending", "active"]);
  const { data: links } = await q;
  const list = (links ?? []) as Link[];
  if (!list.length) return [] as ClientRow[];
  const [{ data: profiles }, { data: grants }] = await Promise.all([
    supabase.from("profiles").select("id, name").in("id", list.map((l) => l.client_id)),
    supabase
      .from("consent_grants")
      .select("link_id, scope, granted_at")
      .in("link_id", list.map((l) => l.id))
      .is("revoked_at", null),
  ]);
  return list.map((link) => ({
    link,
    name: (profiles ?? []).find((p) => p.id === link.client_id)?.name ?? null,
    scopes: ((grants ?? []) as Grant[]).filter((g) => g.link_id === link.id).map((g) => g.scope),
  }));
}

export type AuditRow = {
  id: number;
  at: string;
  actor_id: string | null;
  client_id: string | null;
  psychologist_id: string | null;
  action: string;
  details: Record<string, string>;
};

export async function auditFor(supabase: SupabaseClient, filter: { client?: string; psychologist?: string }, limit = 30) {
  let q = supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(limit);
  if (filter.client) q = q.eq("client_id", filter.client);
  if (filter.psychologist) q = q.eq("psychologist_id", filter.psychologist);
  const { data } = await q;
  return (data ?? []) as AuditRow[];
}

// Адрес профиля из имени: «Анна Петрова» → «anna-petrova».
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", ә: "a", ғ: "g", қ: "k", ң: "n", ө: "o", ұ: "u", ү: "u", һ: "h", і: "i",
};

export function slugify(text: string) {
  return text
    .toLowerCase()
    .split("")
    .map((c) => TRANSLIT[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,39}$/;

export function formatPrice(price: number | null, currency: string, locale: string) {
  if (price == null) return "";
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

export function siteOrigin(headers: Headers) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  const proto = headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
