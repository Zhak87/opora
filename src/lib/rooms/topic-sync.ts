import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";
import { PERSONAS, TOPICS } from "./topics";

// Переносит тематические комнаты из topics.ts в базу. Повторяемо: строки ищутся по slug и обновляются,
// дубликатов не бывает (уникальные ключи rooms.slug и room_personas(room_id, slug)).
// Вызывается один раз на запуск сервера, при первом открытии каталога или комнаты.

const g = globalThis as unknown as { __oporaTopicSync?: Promise<boolean> };

export function ensureTopicRooms(): Promise<boolean> {
  g.__oporaTopicSync ??= syncTopicRooms().catch((e) => {
    console.error("rooms topic sync:", (e as Error).message);
    g.__oporaTopicSync = undefined;
    return false;
  });
  return g.__oporaTopicSync;
}

export async function syncTopicRooms(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const db = createAdminClient();
  const slugs = TOPICS.map((t) => t.slug);

  const { data: rooms, error } = await db
    .from("rooms")
    .upsert(
      TOPICS.map((t) => ({
        slug: t.slug,
        kind: "topic",
        creator_id: null,
        title: t.text.ru.title,
        description: t.text.ru.description.slice(0, 300),
        content: t.text,
        format: "chat",
        access: "open",
        scheduled: false,
        sort: t.sort,
        ended_at: null,
      })),
      { onConflict: "slug" },
    )
    .select("id, slug");
  if (error) throw error;
  const idOf = new Map((rooms ?? []).map((r) => [r.slug as string, r.id as string]));

  // Тема убрана из списка — комната закрывается, история остаётся.
  await db.from("rooms").update({ ended_at: new Date().toISOString() }).eq("kind", "topic").is("ended_at", null).not("slug", "in", `(${slugs.join(",")})`);

  const personas = TOPICS.flatMap((t) =>
    t.personas.map((p, i) => {
      const base = PERSONAS[p.slug];
      return {
        room_id: idOf.get(t.slug)!,
        slug: base.slug,
        sort: i,
        voice: base.voice,
        content: base.text,
        manner: `${base.manner} ${p.extra}`.trim(),
        active: true,
      };
    }),
  );
  const { error: pe } = await db.from("room_personas").upsert(personas, { onConflict: "room_id,slug" });
  if (pe) throw pe;
  // Персонаж убран из темы — он больше не отвечает (старые сообщения сохраняют подпись).
  for (const t of TOPICS) {
    const keep = t.personas.map((p) => p.slug);
    await db.from("room_personas").update({ active: false }).eq("room_id", idOf.get(t.slug)!).not("slug", "in", `(${keep.join(",")})`);
  }

  const samples = TOPICS.flatMap((t) =>
    (Object.keys(t.sample) as (keyof typeof t.sample)[]).map((locale) => ({ room_id: idOf.get(t.slug)!, locale, lines: t.sample[locale] })),
  );
  const { error: se } = await db.from("room_samples").upsert(samples, { onConflict: "room_id,locale" });
  if (se) throw se;
  return true;
}
