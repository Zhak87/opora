import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Цифры «прямо сейчас» для панели. База сама откажет тому, кто не сотрудник.
export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase.rpc("admin_overview");
  if (error || !data) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
