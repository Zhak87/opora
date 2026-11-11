import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CLIENT_EVENTS, track, type EventName } from "@/lib/track";
import { VISITOR_COOKIE } from "@/lib/visitor";
import { isStep } from "@/lib/steps";
import { isAudience, isNeed } from "@/lib/needs";
import { HOUR, clientIp, tooMany } from "@/lib/rate-limit";

export const runtime = "nodejs";

const GAME = /^[a-z0-9-]{1,24}$/;

// Приём событий со страниц (открыл сайт, начал практику и т. п.). Принимаем только названия из списка
// и короткую пометку: какая практика, какой шаг, какая потребность или аудитория. Больше ничего страница передать не может.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { name?: string; game?: string; step?: string; need?: string; aud?: string; before?: unknown; after?: unknown; useful?: unknown; sec?: unknown }
    | null;
  const name = body?.name as EventName | undefined;
  if (!name || !CLIENT_EVENTS.includes(name)) return NextResponse.json({ ok: false }, { status: 400 });
  const who = (await cookies()).get(VISITOR_COOKIE)?.value ?? clientIp(req);
  if (tooMany(`track:${who}`, 200, HOUR)) return NextResponse.json({ ok: false }, { status: 429 });
  const props: Record<string, string | number> = {};
  if (body?.game && GAME.test(body.game)) props.game = body.game;
  if (isStep(body?.step)) props.step = body.step;
  if (isNeed(body?.need)) props.need = body.need;
  if (isAudience(body?.aud)) props.aud = body.aud;
  // «Как вы сейчас» до и после практики (1–5), полезность (1–3) и сколько секунд длилась.
  if (name === "practice_feel") {
    const num = (v: unknown, max: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max ? (v as number) : null);
    const before = num(body?.before, 5), after = num(body?.after, 5), useful = num(body?.useful, 3), sec = num(body?.sec, 7200);
    if (before) props.before = before;
    if (after) props.after = after;
    if (useful) props.useful = useful;
    if (sec !== null) props.sec = sec;
  }
  await track(name, props);
  return NextResponse.json({ ok: true });
}
