import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CLIENT_EVENTS, track, type EventName } from "@/lib/track";
import { VISITOR_COOKIE } from "@/lib/visitor";
import { isStep } from "@/lib/steps";
import { HOUR, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

const GAME = /^[a-z0-9-]{1,24}$/;

// Приём событий со страниц (открыл сайт, начал практику и т. п.). Принимаем только названия из списка
// и короткую пометку: какая практика или какой шаг. Больше ничего страница передать не может.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { name?: string; game?: string; step?: string } | null;
  const name = body?.name as EventName | undefined;
  if (!name || !CLIENT_EVENTS.includes(name)) return NextResponse.json({ ok: false }, { status: 400 });
  const who = (await cookies()).get(VISITOR_COOKIE)?.value ?? clientIp(req);
  if (tooMany(`track:${who}`, 200, HOUR)) return NextResponse.json({ ok: false }, { status: 429 });
  const props: Record<string, string> = {};
  if (body?.game && GAME.test(body.game)) props.game = body.game;
  if (isStep(body?.step)) props.step = body.step;
  await track(name, props);
  return NextResponse.json({ ok: true });
}
