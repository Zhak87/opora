// Языки приложения. Русский — основной, на нём написаны все тексты; казахский и английский — переводы.
export const LOCALES = ["ru", "kk", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALE_COOKIE = "opora-lang";

export const LOCALE_NAMES: Record<Locale, string> = { ru: "Русский", kk: "Қазақша", en: "English" };
export const LOCALE_SHORT: Record<Locale, string> = { ru: "РУС", kk: "ҚАЗ", en: "ENG" };
// Для дат, чисел и голоса браузера.
export const INTL: Record<Locale, string> = { ru: "ru-RU", kk: "kk-KZ", en: "en-US" };
// Название языка для подсказки ИИ.
export const AI_LANGUAGE: Record<Locale, string> = { ru: "русском", kk: "казахском", en: "английском" };

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

// Первый подходящий язык из заголовка Accept-Language браузера.
export function fromAcceptLanguage(header: string | null | undefined): Locale {
  for (const part of (header ?? "").split(",")) {
    const code = part.split(";")[0].trim().toLowerCase().slice(0, 2);
    if (code === "kk" || code === "kz") return "kk";
    if (code === "ru") return "ru";
    if (code === "en") return "en";
  }
  return DEFAULT_LOCALE;
}

// Набор текстов одного раздела на трёх языках. Казахский и английский обязаны повторять форму русского.
export type Messages<T> = { ru: T; kk: NoInfer<T>; en: NoInfer<T> };
export function defineMessages<T>(m: Messages<T>): Messages<T> {
  return m;
}

// Выбор формы слова по числу: plural("ru", 5, { one: "минута", few: "минуты", many: "минут" }).
export function plural(locale: Locale, n: number, forms: { one: string; few?: string; many?: string; other?: string }) {
  const rule = new Intl.PluralRules(INTL[locale]).select(n);
  if (rule === "one") return forms.one;
  if (rule === "few") return forms.few ?? forms.other ?? forms.many ?? forms.one;
  if (rule === "many") return forms.many ?? forms.other ?? forms.few ?? forms.one;
  return forms.other ?? forms.many ?? forms.few ?? forms.one;
}
