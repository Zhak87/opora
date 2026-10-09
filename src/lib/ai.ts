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
