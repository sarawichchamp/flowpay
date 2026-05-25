"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode, useEffect, useMemo, useState } from "react";
import type { FlowPayBootstrap } from "@/types/flowpay-store";
import { LocaleContext } from "@/hooks/use-locale";
import { usePwa } from "@/hooks/use-pwa";
import { FlowPayStoreProvider } from "@/hooks/use-flowpay-store";
import type { Locale } from "@/types/domain";

export function Providers({ children, initialData }: { children: ReactNode; initialData?: FlowPayBootstrap }) {
  usePwa();
  const [locale, setLocaleState] = useState<Locale>("th");

  useEffect(() => {
    const storedLocale = window.localStorage.getItem("flowpay-locale");
    if (storedLocale === "th" || storedLocale === "en") {
      setLocaleState(storedLocale);
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

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LocaleContext.Provider value={localeValue}>
        <FlowPayStoreProvider initialData={initialData}>{children}</FlowPayStoreProvider>
      </LocaleContext.Provider>
    </ThemeProvider>
  );
}
