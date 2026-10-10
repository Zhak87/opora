"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, type Locale, type Messages } from "./config";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);

// Тексты раздела на текущем языке: const m = useMsg(chatMessages).
export function useMsg<T>(messages: Messages<T>): T {
  return messages[useLocale()];
}
