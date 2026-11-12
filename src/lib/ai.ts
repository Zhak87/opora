// Провайдер-независимый адаптер для ИИ.
// AI_PROVIDER=gemini (по умолчанию) — Google Gemini, бесплатный ключ на aistudio.google.com
// AI_PROVIDER=openai — любой OpenAI-совместимый API (OpenRouter, Groq и т.п.)

// Адрес API Gemini. Меняется только для проверок с подставным сервером или через свой прокси.
const geminiBase = () => (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com").replace(/\/$/, "");

export type ChatMessage = { role: "user" | "assistant"; content: string };

type Options = { system: string; messages: ChatMessage[]; maxTokens?: number; temperature?: number };
type StreamOptions = Options & { signal?: AbortSignal };

export function aiConfigured() {
  const provider = process.env.AI_PROVIDER ?? "gemini";
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY);
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function streamReply(opts: StreamOptions): Promise<ReadableStream<string>> {
  const provider = process.env.AI_PROVIDER ?? "gemini";
  return provider === "openai" ? streamOpenAI(opts) : streamGemini(opts);
}

// Бесплатные модели Gemini иногда отвечают «перегружено» (503) или «слишком много запросов» (429).
// Поэтому пробуем ещё раз и при необходимости переходим на запасную модель.
const GEMINI_MODELS = (process.env.GEMINI_MODEL || "gemini-flash-latest,gemini-flash-lite-latest")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
// Flash-Lite рассчитана на низкую задержку. Для остальных задач и явной настройки сохраняем порядок моделей.
const CHAT_MODELS = process.env.GEMINI_MODEL ? GEMINI_MODELS : [...GEMINI_MODELS].reverse();
// Через столько ждём первых слов, прежде чем параллельно спросить запасную модель.
const FIRST_WORDS_TIMEOUT = 4_000;
// Сколько всего ждём начала ответа, прежде чем показать «не удалось ответить».
const CHAT_START_TIMEOUT = 25_000;
const CHAT_RESPONSE_TIMEOUT = 50_000;
const MODEL_RETRY_DELAY = 60_000;
const modelRetryAt = new Map<string, number>();

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

// Новые модели Flash перед ответом «размышляют», и первые слова приходят с задержкой в несколько секунд.
// Собеседнику долгие размышления не нужны, поэтому просим минимум. Разные поколения моделей понимают
// разные настройки, а некоторые не принимают никаких: пробуем по очереди и запоминаем, что подошло.
const MINIMAL_THINKING = { thinkingLevel: "minimal" };
const LOW_THINKING = { thinkingLevel: "low" };
const ZERO_THINKING = { thinkingBudget: 0 };
const THINKING_VARIANTS = [MINIMAL_THINKING, LOW_THINKING, ZERO_THINKING, null];
const thinkingChoice = new Map<string, (typeof THINKING_VARIANTS)[number]>();

function thinkingOptions(model: string) {
  if (process.env.AI_FAST_THINKING === "off") return [null];
  const cached = thinkingChoice.get(model);
  let preferred = MINIMAL_THINKING;
  if (/^gemini-(?:flash-latest|3\.[78]-flash)/.test(model)) preferred = LOW_THINKING;
  const first = cached !== undefined ? cached : /^gemini-2\.5-/.test(model) ? ZERO_THINKING : preferred;
  return [first, ...THINKING_VARIANTS.filter((option) => option !== first)];
}

async function streamGemini({ system, messages, signal }: StreamOptions) {
  const started = Date.now();
  const makeBody = (thinking: Record<string, unknown> | null) =>
    JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      safetySettings: SAFETY,
      generationConfig: { temperature: 0.8, maxOutputTokens: 4096, ...(thinking ? { thinkingConfig: thinking } : {}) },
    });

  // Если модель только что подвела, начинаем со здоровой, но позже проверяем исходный порядок снова.
  const ready = CHAT_MODELS.filter((model) => (modelRetryAt.get(model) ?? 0) <= started);
  const cooling = CHAT_MODELS.filter((model) => (modelRetryAt.get(model) ?? 0) > started);
  const order = [...ready, ...cooling];
  // Три круга по всем моделям: при перегрузке (503) Gemini часто отвечает со второй-третьей попытки.
  const maxAttempts = order.length * 3;

  // Медленный запрос не обрываем: когда Gemini перегружен, первые слова могут прийти через 5–9 секунд,
  // и новый запрос с нуля только отодвигает ответ. Вместо этого через FIRST_WORDS_TIMEOUT параллельно
  // спрашиваем запасную модель и берём того, кто ответит первым. Остальные запросы отменяем.
  type Outcome = { run: Run; stream?: ReadableStream<string>; error?: unknown };
  type Run = { model: string; controller: AbortController; done: Promise<Outcome> };
  const running = new Set<Run>();
  let launched = 0;
  const launch = () => {
    const model = order[launched % order.length];
    launched++;
    const controller = new AbortController();
    const run = { model, controller } as Run;
    run.done = attemptGemini(model, makeBody, replySignal(controller, signal)).then(
      (stream) => ({ run, stream }),
      (error) => ({ run, error }),
    );
    running.add(run);
  };
  const stopAll = () => {
    for (const run of running) run.controller.abort();
    running.clear();
  };

  let last: AIError | null = null;
  try {
    launch();
    while (running.size > 0) {
      signal?.throwIfAborted();
      const remaining = CHAT_START_TIMEOUT - (Date.now() - started);
      if (remaining <= 0) break;
      const canHedge = running.size < 2 && launched < maxAttempts;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const tick = new Promise<"tick">((resolve) => {
        timer = setTimeout(() => resolve("tick"), canHedge ? Math.min(FIRST_WORDS_TIMEOUT, remaining) : remaining);
      });
      const next = await Promise.race([...[...running].map((run) => run.done), tick]);
      clearTimeout(timer);
      if (next === "tick") {
        if (canHedge) launch();
        continue;
      }
      running.delete(next.run);
      if (next.stream) {
        modelRetryAt.delete(next.run.model);
        console.log(`[ai] ${next.run.model} response started in ${Date.now() - started} ms`);
        return next.stream;
      }
      if (signal?.aborted) throw next.error;
      const e = next.error;
      last = e instanceof AIError ? e : new AIError(504, `Gemini ${next.run.model}: ${(e as Error)?.message}`);
      if (!(e instanceof AIError)) console.error(last.message);
      if (last.status === 401) throw last;
      modelRetryAt.set(next.run.model, Date.now() + MODEL_RETRY_DELAY);
      if (launched < maxAttempts && running.size === 0) {
        // Все модели уже ответили ошибкой: пауза перед следующим кругом.
        if (launched % order.length === 0) await new Promise((resolve) => setTimeout(resolve, 1_000));
        launch();
      }
    }
  } finally {
    stopAll();
  }
  throw last ?? new AIError(504, "Gemini: no answer in time");
}

// Одна попытка у одной модели: перебираем настройки размышлений, пока модель их принимает.
async function attemptGemini(
  model: string,
  makeBody: (thinking: Record<string, unknown> | null) => string,
  attemptSignal: AbortSignal,
): Promise<ReadableStream<string>> {
  let last: AIError | null = null;
  for (const thinking of thinkingOptions(model)) {
    const res = await fetch(`${geminiBase()}/v1beta/models/${model}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: makeBody(thinking),
      signal: attemptSignal,
    });
    if (res.ok && res.body) {
      const stream = await startTextStream(
        sseToText(res.body, (data) => {
          const parts = JSON.parse(data)?.candidates?.[0]?.content?.parts ?? [];
          return parts.map((p: { text?: string; thought?: boolean }) => (p.thought ? "" : p.text ?? "")).join("");
        }),
      );
      if (process.env.AI_FAST_THINKING !== "off") thinkingChoice.set(model, thinking);
      return stream;
    }
    const text = await res.text();
    last = new AIError(res.status, `Gemini ${model} ${res.status}: ${text.slice(0, 300)}`);
    console.error(last.message);
    if (res.status === 401 || res.status === 403 || (res.status === 400 && /API_KEY|API key/i.test(text))) {
      throw new AIError(401, last.message);
    }
    if (!(res.status === 400 && thinking && /think/i.test(text))) break;
  }
  throw last ?? new AIError(500, `Gemini ${model}: no thinking option accepted`);
}

function replySignal(firstWords: AbortController, request?: AbortSignal) {
  const signals = [firstWords.signal, AbortSignal.timeout(CHAT_RESPONSE_TIMEOUT)];
  if (request) signals.push(request);
  return AbortSignal.any(signals);
}

async function startTextStream(stream: ReadableStream<string>) {
  const reader = stream.getReader();
  const read = async () => {
    try {
      const result = await reader.read();
      if (result.done) reader.releaseLock();
      return result;
    } catch (e) {
      reader.releaseLock();
      throw e;
    }
  };
  let first = await read();
  while (!first.done && !first.value.trim()) first = await read();
  if (first.done) throw new AIError(502, "AI returned no visible answer");
  const firstText = first.value;
  return new ReadableStream<string>({
    start(controller) {
      controller.enqueue(firstText);
    },
    async pull(controller) {
      const { done, value } = await read();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason);
      } finally {
        reader.releaseLock();
      }
    },
  });
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

async function completeGemini({ system, messages, maxTokens = 8192, temperature = 0.9 }: Options) {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    safetySettings: SAFETY,
    generationConfig: { temperature, maxOutputTokens: maxTokens, responseMimeType: "application/json" },
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
      const res = await fetch(`${geminiBase()}/v1beta/models/${model}:generateContent`, {
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

async function completeOpenAI({ system, messages, temperature = 0.9 }: Options) {
  const base = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
  const model = process.env.OPENAI_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model,
      temperature,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) throw new AIError(res.status, `AI ${res.status}: ${await res.text()}`);
  return (await res.json())?.choices?.[0]?.message?.content ?? "";
}

async function streamOpenAI({ system, messages, signal }: StreamOptions) {
  const base = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
  const model = process.env.OPENAI_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_START_TIMEOUT);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: replySignal(controller, signal),
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
    return await startTextStream(sseToText(res.body, (data) => {
      if (data === "[DONE]") return "";
      return JSON.parse(data)?.choices?.[0]?.delta?.content ?? "";
    }));
  } finally {
    clearTimeout(timer);
  }
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

const TTS_MODELS = (process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-lite-tts,gemini-3.8-flash-tts,gemini-3.1-flash-tts-preview,gemini-2.5-flash-preview-tts")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export function ttsConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// Возвращает WAV. Некоторые модели отдают «сырой» PCM 16 бит — тогда добавляем заголовок сами.
// Отправляем только сам текст: любые указания вроде «прочитай спокойно» модель может произнести вслух.
export async function synthesize(text: string, voice: string, signal: AbortSignal): Promise<Uint8Array> {
  const body = JSON.stringify({
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  });
  // На весь отрывок один бюджет ожидания, включая запасные модели.
  const short = text.length <= 180;
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(short ? 8_000 : 14_000)]);
  let last: AIError | null = null;
  for (const model of TTS_MODELS) {
    if (deadline.aborted) break;
    const attempt = AbortSignal.any([deadline, AbortSignal.timeout(short ? 5_000 : 9_000)]);
    try {
      const res = await fetch(`${geminiBase()}/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
        body,
        signal: attempt,
      });
      if (!res.ok) {
        last = new AIError(res.status, `TTS ${model}: HTTP ${res.status}`);
        console.error(last.message);
        await res.body?.cancel();
        if (res.status === 401) break;
        continue;
      }
      const json = await res.json();
      const part = (json?.candidates?.[0]?.content?.parts ?? []).find((p: { inlineData?: { data?: unknown } }) => p.inlineData?.data);
      if (!part) {
        last = new AIError(502, `TTS ${model}: no audio`);
        continue;
      }
      const bytes = Buffer.from(part.inlineData.data as string, "base64");
      const mime = String(part.inlineData.mimeType || "");
      if (!bytes.length) {
        last = new AIError(502, `TTS ${model}: empty audio`);
        continue;
      }
      if (/wav/i.test(mime)) return bytes;
      const rate = Number(/rate=(\d+)/.exec(mime)?.[1] || 24000);
      return wav(bytes, rate);
    } catch (e) {
      if (signal.aborted) throw signal.reason;
      last = new AIError(504, `TTS ${model}: ${(e as Error).message}`);
      console.error(last.message);
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

/* ---------- Распознавание речи ---------- */

const STT_MODELS = (process.env.GEMINI_STT_MODEL || "gemini-flash-lite-latest,gemini-flash-latest")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export async function transcribe(audio: Uint8Array, mime: string, signal?: AbortSignal): Promise<string> {
  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { inlineData: { mimeType: mime, data: Buffer.from(audio).toString("base64") } },
          {
            text: "Дословно запиши, что говорит человек в этой записи, на том языке, на котором он говорит (обычно русский, казахский или английский; казахский пиши кириллицей). Ничего не переводи. Верни только сам текст, с пунктуацией, без пояснений и кавычек. Если речи нет или ничего не разобрать, верни пустую строку.",
          },
        ],
      },
    ],
    safetySettings: SAFETY,
    generationConfig: { temperature: 0, maxOutputTokens: 2048 },
  });
  let last: AIError | null = null;
  for (const model of [...STT_MODELS, ...STT_MODELS]) {
    if (signal?.aborted) throw new AIError(499, "STT: cancelled");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      const res = await fetch(`${geminiBase()}/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
        body,
        signal: controller.signal,
      });
      const raw = await res.text();
      if (!res.ok) {
        last = new AIError(res.status, `STT ${model} ${res.status}: ${raw.slice(0, 200)}`);
        console.error(last.message);
        continue;
      }
      const parts = JSON.parse(raw)?.candidates?.[0]?.content?.parts ?? [];
      return parts
        .map((p: { text?: string; thought?: boolean }) => (p.thought ? "" : p.text ?? ""))
        .join("")
        .trim()
        .replace(/^["«]|["»]$/g, "");
    } catch (e) {
      if (signal?.aborted) throw new AIError(499, "STT: cancelled");
      last = new AIError(504, `STT ${model}: ${(e as Error).message}`);
      console.error(last.message);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }
  throw last ?? new AIError(500, "STT: no models");
}
