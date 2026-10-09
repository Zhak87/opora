// Провайдер-независимый адаптер для ИИ.
// AI_PROVIDER=gemini (по умолчанию) — Google Gemini, бесплатный ключ на aistudio.google.com
// AI_PROVIDER=openai — любой OpenAI-совместимый API (OpenRouter, Groq и т.п.)

export type ChatMessage = { role: "user" | "assistant"; content: string };

type Options = { system: string; messages: ChatMessage[] };

export function aiConfigured() {
  const provider = process.env.AI_PROVIDER ?? "gemini";
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY);
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function streamReply(opts: Options): Promise<ReadableStream<string>> {
  const provider = process.env.AI_PROVIDER ?? "gemini";
  return provider === "openai" ? streamOpenAI(opts) : streamGemini(opts);
}

// Бесплатные модели Gemini иногда отвечают «перегружено» (503) или «слишком много запросов» (429).
// Поэтому пробуем ещё раз и при необходимости переходим на запасную модель.
const GEMINI_MODELS = (process.env.GEMINI_MODEL || "gemini-flash-latest,gemini-flash-lite-latest")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

// Разговоры о здоровье, отношениях и трудных чувствах не должны блокироваться фильтрами.
const SAFETY = [
  "HARM_CATEGORY_HARASSMENT",
  "HARM_CATEGORY_HATE_SPEECH",
  "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  "HARM_CATEGORY_DANGEROUS_CONTENT",
].map((category) => ({ category, threshold: "BLOCK_ONLY_HIGH" }));

export class AIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function streamGemini({ system, messages }: Options) {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    safetySettings: SAFETY,
    generationConfig: { temperature: 0.8, maxOutputTokens: 4096 },
  });

  // Порядок попыток: основная модель, запасная, затем ещё по кругу.
  const queue = [...GEMINI_MODELS, ...GEMINI_MODELS];
  let last: AIError | null = null;
  for (const [i, model] of queue.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 700));
    let res: Response;
    // Ждём начала ответа не дольше 9 секунд; сам поток после этого не ограничиваем.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9_000);
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
          body,
          signal: controller.signal,
        },
      );
    } catch (e) {
      last = new AIError(504, `Gemini ${model}: ${(e as Error).message}`);
      console.error(last.message);
      continue;
    } finally {
      clearTimeout(timer);
    }
    if (res.ok && res.body) {
      return sseToText(res.body, (data) => {
        const json = JSON.parse(data);
        const parts = json?.candidates?.[0]?.content?.parts ?? [];
        return parts.map((p: { text?: string; thought?: boolean }) => (p.thought ? "" : p.text ?? "")).join("");
      });
    }
    const text = await res.text().catch(() => "");
    last = new AIError(res.status, `Gemini ${model} ${res.status}: ${text.slice(0, 300)}`);
    console.error(last.message);
    // Неверный ключ — повтор не поможет.
    if (res.status === 401 || res.status === 403 || (res.status === 400 && /API_KEY|API key/i.test(text))) {
      throw new AIError(401, last.message);
    }
  }
  throw last ?? new AIError(500, "Gemini: no models configured");
}

// Разовый ответ целиком в виде JSON (для личного плана). Укладываемся примерно в 50 секунд.
export async function generateJSON(opts: Options): Promise<unknown> {
  const provider = process.env.AI_PROVIDER ?? "gemini";
  const text = provider === "openai" ? await completeOpenAI(opts) : await completeGemini(opts);
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  return JSON.parse(start >= 0 ? clean.slice(start, end + 1) : clean);
}

async function completeGemini({ system, messages }: Options) {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    safetySettings: SAFETY,
    generationConfig: { temperature: 0.9, maxOutputTokens: 8192, responseMimeType: "application/json" },
  });
  const deadline = Date.now() + 50_000;
  const queue = [...GEMINI_MODELS, ...GEMINI_MODELS];
  let last: AIError | null = null;
  for (const [i, model] of queue.entries()) {
    const left = deadline - Date.now();
    if (left < 4_000) break;
    if (i > 0) await new Promise((r) => setTimeout(r, 500));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(left - 1_000, i === 0 ? 28_000 : 22_000));
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
        body,
        signal: controller.signal,
      });
      const raw = await res.text();
      if (res.ok) {
        const parts = JSON.parse(raw)?.candidates?.[0]?.content?.parts ?? [];
        const text = parts.map((p: { text?: string; thought?: boolean }) => (p.thought ? "" : p.text ?? "")).join("");
        if (text) return text;
        last = new AIError(502, `Gemini ${model}: empty`);
        continue;
      }
      last = new AIError(res.status, `Gemini ${model} ${res.status}: ${raw.slice(0, 300)}`);
      console.error(last.message);
      if (res.status === 401 || res.status === 403 || (res.status === 400 && /API_KEY|API key/i.test(raw))) {
        throw new AIError(401, last.message);
      }
    } catch (e) {
      if (e instanceof AIError) throw e;
      last = new AIError(504, `Gemini ${model}: ${(e as Error).message}`);
      console.error(last.message);
    } finally {
      clearTimeout(timer);
    }
  }
  throw last ?? new AIError(500, "Gemini: no models configured");
}

async function completeOpenAI({ system, messages }: Options) {
  const base = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
  const model = process.env.OPENAI_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) throw new AIError(res.status, `AI ${res.status}: ${await res.text()}`);
  return (await res.json())?.choices?.[0]?.message?.content ?? "";
}

async function streamOpenAI({ system, messages }: Options) {
  const base = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
  const model = process.env.OPENAI_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.8,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok || !res.body) throw new AIError(res.status, `AI ${res.status}: ${await res.text()}`);

  return sseToText(res.body, (data) => {
    if (data === "[DONE]") return "";
    return JSON.parse(data)?.choices?.[0]?.delta?.content ?? "";
  });
}

function sseToText(body: ReadableStream<Uint8Array>, extract: (data: string) => string) {
  const decoder = new TextDecoder();
  let buffer = "";
  return body.pipeThrough(
    new TransformStream<Uint8Array, string>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data) continue;
          try {
            const text = extract(data);
            if (text) controller.enqueue(text);
          } catch {
            // пропускаем служебные строки
          }
        }
      },
    }),
  );
}

/* ---------- Озвучка ---------- */

const TTS_MODELS = (process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts,gemini-2.5-flash-preview-tts,gemini-3.8-flash-lite-tts")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export function ttsConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// Возвращает WAV. Некоторые модели отдают «сырой» PCM 16 бит — тогда добавляем заголовок сами.
// Отправляем только сам текст: любые указания вроде «прочитай спокойно» модель может произнести вслух.
export async function synthesize(text: string, voice: string): Promise<Uint8Array> {
  const body = JSON.stringify({
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  });
  let last: AIError | null = null;
  for (const [i, model] of TTS_MODELS.entries()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), i === 0 ? 15_000 : 20_000);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
        body,
        signal: controller.signal,
      });
      if (!res.ok) {
        last = new AIError(res.status, `TTS ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);
        console.error(last.message);
        continue;
      }
      const json = await res.json();
      const part = (json?.candidates?.[0]?.content?.parts ?? []).find((p: { inlineData?: unknown }) => p.inlineData);
      if (!part) {
        last = new AIError(502, `TTS ${model}: no audio`);
        continue;
      }
      const bytes = Uint8Array.from(Buffer.from(part.inlineData.data as string, "base64"));
      const mime = String(part.inlineData.mimeType || "");
      if (/wav/i.test(mime)) return bytes;
      const rate = Number(/rate=(\d+)/.exec(mime)?.[1] || 24000);
      return wav(bytes, rate);
    } catch (e) {
      last = new AIError(504, `TTS ${model}: ${(e as Error).message}`);
      console.error(last.message);
    } finally {
      clearTimeout(timer);
    }
  }
  throw last ?? new AIError(500, "TTS: no models");
}

function wav(pcm: Uint8Array, rate: number) {
  const out = new Uint8Array(44 + pcm.length);
  const v = new DataView(out.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + pcm.length, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}
