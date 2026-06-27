"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode, useEffect, useMemo, useState } from "react";
import type { FlowPayBootstrap } from "@/types/flowpay-store";
import { LocaleContext } from "@/hooks/use-locale";
import { UIThemeContext, type UITheme, uiThemeStorageKey } from "@/hooks/use-ui-theme";
import { usePwa } from "@/hooks/use-pwa";
import { FlowPayStoreProvider } from "@/hooks/use-flowpay-store";
import type { Locale } from "@/types/domain";

export function Providers({ children, initialData }: { children: ReactNode; initialData?: FlowPayBootstrap }) {
  usePwa();
  const [locale, setLocaleState] = useState<Locale>("th");
  const [uiTheme, setUIThemeState] = useState<UITheme>("standard");

  useEffect(() => {
    const storedLocale = window.localStorage.getItem("flowpay-locale");
    if (storedLocale === "th" || storedLocale === "en") {
      setLocaleState(storedLocale);
    }

    const storedUITheme = window.localStorage.getItem(uiThemeStorageKey);
    if (storedUITheme === "standard" || storedUITheme === "neumorphism" || storedUITheme === "flat" || storedUITheme === "glass" || storedUITheme === "colourful") {
      setUIThemeState(storedUITheme);
      document.documentElement.dataset.uiTheme = storedUITheme;
    } else {
      document.documentElement.dataset.uiTheme = "standard";
    }
  }, []);

  const localeValue = useMemo(
    () => ({
      locale,
      setLocale: (nextLocale: Locale) => {
        setLocaleState(nextLocale);
        window.localStorage.setItem("flowpay-locale", nextLocale);
        document.documentElement.lang = nextLocale;
      }
    }),
    [locale]
  );

  const uiThemeValue = useMemo(
    () => ({
      uiTheme,
      setUITheme: (nextTheme: UITheme) => {
        setUIThemeState(nextTheme);
        window.localStorage.setItem(uiThemeStorageKey, nextTheme);
        document.documentElement.dataset.uiTheme = nextTheme;
      }
    }),
    [uiTheme]
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <UIThemeContext.Provider value={uiThemeValue}>
        <LocaleContext.Provider value={localeValue}>
          <FlowPayStoreProvider initialData={initialData}>{children}</FlowPayStoreProvider>
        </LocaleContext.Provider>
      </UIThemeContext.Provider>
    </ThemeProvider>
  );
}
