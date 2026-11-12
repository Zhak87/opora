import { joinConsult } from "@/lib/consult/actions";

export const runtime = "nodejs";

// Пропуск в видеокомнату встречи. Проверки — в joinConsult: участник этой записи, онлайн-формат,
// запланирована, в разрешённое время. Посторонний и другой психолог получают 403.
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await joinConsult((await params).id);
  if (res.ok) return Response.json(res, { headers: { "Cache-Control": "no-store" } });
  return Response.json(res, { status: res.error === "forbidden" ? 403 : 409, headers: { "Cache-Control": "no-store" } });
}
