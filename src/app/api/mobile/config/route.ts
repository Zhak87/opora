import { NextResponse } from "next/server";

// Открытые настройки для мобильного приложения: адрес базы и публичный ключ (тот же, что видит браузер на сайте).
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null,
      minVersion: process.env.MOBILE_MIN_VERSION ?? "1.0.0",
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
