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

async function streamGemini({ system, messages }: Options) {
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
      }),
    },
  );
  if (!res.ok || !res.body) throw new Error(`Gemini ${res.status}: ${await res.text()}`);

  return sseToText(res.body, (data) => {
    const json = JSON.parse(data);
    const parts = json?.candidates?.[0]?.content?.parts ?? [];
    return parts.map((p: { text?: string; thought?: boolean }) => (p.thought ? "" : p.text ?? "")).join("");
  });
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
  if (!res.ok || !res.body) throw new Error(`AI ${res.status}: ${await res.text()}`);

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
