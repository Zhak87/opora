import type { RoomEvent } from "./hub";

// Поток событий для браузера (Server-Sent Events). Пинг раз в 20 секунд не даёт прокси закрыть соединение.
export function eventStream(
  req: Request,
  setup: (send: (e: RoomEvent) => void, close: () => void) => () => void,
) {
  const enc = new TextEncoder();
  let cleanup = () => {};
  let ping: ReturnType<typeof setInterval> | undefined;
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        cleanup();
        try {
          controller.close();
        } catch {}
      };
      const send = (e: RoomEvent) => {
        if (closed) return;
        controller.enqueue(enc.encode(`event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`));
      };
      controller.enqueue(enc.encode("retry: 3000\n\n"));
      cleanup = setup(send, close);
      ping = setInterval(() => {
        try {
          if (!closed) controller.enqueue(enc.encode(": ping\n\n"));
        } catch {
          close();
        }
      }, 20_000);
      req.signal.addEventListener("abort", close);
    },
    cancel() {
      closed = true;
      clearInterval(ping);
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-transform: сжатие в Next.js и Caddy не должно копить события
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
