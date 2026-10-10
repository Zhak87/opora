// Демо без регистрации: разговор хранится только в браузере, пока человек не создаст аккаунт.
export const DEMO_KEY = "opora-demo";
// После стольких сообщений мягко предлагаем сохранить разговор.
export const DEMO_INVITE_AFTER = 2;
// Дальше без аккаунта продолжить нельзя.
export const DEMO_LIMIT = 6;
export const DEMO_MAX_INPUT = 2000;

export type DemoMessage = { role: "user" | "assistant"; content: string };

export function readDemo(): DemoMessage[] {
  try {
    const raw = JSON.parse(localStorage.getItem(DEMO_KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
      : [];
  } catch {
    return [];
  }
}

export function writeDemo(messages: DemoMessage[]) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(messages));
  } catch {}
}

export function clearDemo() {
  try {
    localStorage.removeItem(DEMO_KEY);
  } catch {}
}
