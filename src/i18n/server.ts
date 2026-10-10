import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, fromAcceptLanguage, isLocale, type Locale, type Messages } from "./config";

// Язык текущего запроса: выбор человека (cookie), иначе язык браузера, иначе русский.
export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return fromAcceptLanguage((await headers()).get("accept-language"));
}

// Тексты раздела на языке запроса: const m = await getMsg(homeMessages).
export async function getMsg<T>(messages: Messages<T>): Promise<T> {
  return messages[await getLocale()];
}
