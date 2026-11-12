import { NextResponse } from "next/server";
import { adminConfigured, createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Раз в час удаляет просроченные расшифровки, подсказки и черновики консультаций (срок — CONSULT_KEEP_DAYS).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 503 });
  const { data, error } = await createAdminClient().rpc("purge_consult_data");
  if (error) return NextResponse.json({ error: "purge failed" }, { status: 500 });
  return NextResponse.json(data);
}
