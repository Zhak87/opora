// Номер сборки сайта. Открытая давно страница сверяется с ним: после выкладки старые серверные действия
// уже не существуют, и страницу нужно тихо перезагрузить (см. src/lib/fresh.ts).
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ build: process.env.NEXT_PUBLIC_BUILD_ID ?? "" }, { headers: { "Cache-Control": "no-store" } });
}
