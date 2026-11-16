import { NextResponse } from "next/server";
import { imageProvider } from "@/lib/dream-image";
import { notificationEmailConfigured } from "@/lib/email";
import { voiceConfigured } from "@/lib/rooms/voice";
import { adminConfigured } from "@/lib/supabase/admin";
import { consultAiEnabled } from "@/lib/consult/server";
import { inviteEmailEnabled } from "@/lib/invite-email";

// Открытые настройки для мобильного приложения: адрес базы и публичный ключ (тот же, что видит браузер на сайте).
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null,
      minVersion: process.env.MOBILE_MIN_VERSION ?? "1.0.0",
      // Что включено на сервере: приложение прячет недоступное, как сайт.
      features: {
        dreamImages: imageProvider() !== null,
        // Голос «Комнат» и видеоконсультации идут через один сервер LiveKit.
        voice: voiceConfigured(),
        notificationEmail: adminConfigured() && notificationEmailConfigured(),
        // Кабинет психолога: ИИ-помощник встречи и отправка приглашений письмом.
        consultAi: consultAiEnabled(),
        inviteEmail: inviteEmailEnabled(),
      },
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
