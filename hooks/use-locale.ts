"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/types/domain";

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: "th",
  setLocale: () => undefined
});

export function useLocale() {
  return useContext(LocaleContext);
}
