import { AIError } from "@/lib/ai";

// Рисование кадров комикса. Два провайдера на выбор (переменная DREAM_IMAGES):
//   cloudflare — FLUX.1 schnell в Cloudflare Workers AI. Бесплатно 10 000 «нейронов» в сутки
//                (около 170 картинок 1024 px), без логотипа, запросы не хранятся. Героя держит
//                одно и то же описание и стиль во всех кадрах. Выбирается сам, если заданы ключи.
//   gemini     — картинки Gemini на уже подключённом ключе. Платно (несколько центов за кадр),
//                зато умеет рисовать по образцу: первый кадр передаётся как эталон героя и стиля.
//   off        — без картинок: комикс собирается из подписей на фоне палитры.
// Наружу уходит только обезличенное английское описание сцены: без имён, текста сна и номера человека.

export type ImageProvider = "cloudflare" | "gemini";
export type Picture = { bytes: Uint8Array; mime: string; provider: ImageProvider };
type Reference = { bytes: Uint8Array; mime: string };

export function imageProvider(): ImageProvider | null {
  const choice = (process.env.DREAM_IMAGES || "").trim().toLowerCase();
  if (choice === "off") return null;
  const cloudflare = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
  if (choice === "gemini") return process.env.GEMINI_API_KEY ? "gemini" : null;
  return cloudflare ? "cloudflare" : null;
}

// Умеет ли провайдер рисовать по образцу (эталон героя из первого кадра).
export const usesReference = (provider: ImageProvider) => provider === "gemini";

export async function drawPanel(prompt: string, reference?: Reference | null): Promise<Picture> {
  const provider = imageProvider();
  if (!provider) throw new AIError(503, "Dream images: not configured");
  return provider === "gemini" ? drawGemini(prompt, reference) : drawCloudflare(prompt);
}

const TIMEOUT = 45_000;

async function drawCloudflare(prompt: string): Promise<Picture> {
  const base = (process.env.CLOUDFLARE_API_BASE || "https://api.cloudflare.com").replace(/\/$/, "");
  const model = process.env.DREAM_CF_MODEL || "@cf/black-forest-labs/flux-1-schnell";
  let last: AIError | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${base}/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
        // Больше шагов — чище линии. Максимум у модели 8; шаги почти не влияют на расход.
        // Параметр seed эта модель в Cloudflare не принимает (ошибка 400), поэтому один и тот же
        // герой держится только одинаковым описанием и стилем во всех кадрах.
        body: JSON.stringify({ prompt: prompt.slice(0, 2040), steps: 8 }),
        signal: AbortSignal.timeout(TIMEOUT),
      });
      if (!res.ok) {
        const text = await res.text();
        last = new AIError(res.status, `Cloudflare image ${res.status}: ${text.slice(0, 300)}`);
        console.error(last.message);
        // Суточный запас исчерпан, ключ неверный или запрос не принят: повторять бессмысленно.
        if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 429) break;
        continue;
      }
      const type = res.headers.get("content-type") || "";
      if (type.startsWith("image/")) return { bytes: new Uint8Array(await res.arrayBuffer()), mime: type.split(";")[0], provider: "cloudflare" };
      const json = (await res.json()) as { result?: { image?: string } };
      const data = json?.result?.image;
      if (!data) {
        last = new AIError(502, "Cloudflare image: empty");
        continue;
      }
      const bytes = new Uint8Array(Buffer.from(data, "base64"));
      return { bytes, mime: sniff(bytes), provider: "cloudflare" };
    } catch (e) {
      last = new AIError(504, `Cloudflare image: ${(e as Error).message}`);
      console.error(last.message);
    }
  }
  throw last ?? new AIError(500, "Cloudflare image: failed");
}

async function drawGemini(prompt: string, reference?: Reference | null): Promise<Picture> {
  const base = (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
  const models = (process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const parts: unknown[] = [];
  if (reference) {
    parts.push({ inlineData: { mimeType: reference.mime, data: Buffer.from(reference.bytes).toString("base64") } });
    parts.push({ text: "Reference image: keep exactly the same character (face, hair, clothes) and the same illustration style and palette. Draw a NEW scene:" });
  }
  parts.push({ text: prompt });
  const body = JSON.stringify({
    contents: [{ role: "user", parts }],
    generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "4:5" } },
  });
  let last: AIError | null = null;
  for (const model of models) {
    try {
      const res = await fetch(`${base}/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
        body,
        signal: AbortSignal.timeout(TIMEOUT),
      });
      const raw = await res.text();
      if (!res.ok) {
        last = new AIError(res.status, `Gemini image ${model} ${res.status}: ${raw.slice(0, 300)}`);
        console.error(last.message);
        if (res.status === 401 || res.status === 403) break;
        continue;
      }
      const found = (JSON.parse(raw)?.candidates?.[0]?.content?.parts ?? []).find(
        (p: { inlineData?: { data?: string } }) => p.inlineData?.data,
      );
      if (!found) {
        // Модель отказалась рисовать (фильтр содержания) или вернула только текст.
        last = new AIError(422, `Gemini image ${model}: no image`);
        continue;
      }
      const bytes = new Uint8Array(Buffer.from(found.inlineData.data as string, "base64"));
      return { bytes, mime: String(found.inlineData.mimeType || sniff(bytes)), provider: "gemini" };
    } catch (e) {
      last = new AIError(504, `Gemini image ${model}: ${(e as Error).message}`);
      console.error(last.message);
    }
  }
  throw last ?? new AIError(500, "Gemini image: failed");
}

function sniff(bytes: Uint8Array) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return "image/webp";
  return "image/jpeg";
}

export const extension = (mime: string) => (mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg");
