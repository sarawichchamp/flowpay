"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Home, Languages, Moon, Plus, ReceiptText, Repeat, Scale, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";
import { type DictionaryKey, t } from "@/i18n/dictionary";
import { cn } from "@/utils/cn";

const navItems = [
  { href: "/", label: "dashboard", icon: Home },
  { href: "/transactions", label: "transactions", icon: ReceiptText },
  { href: "/settlement", label: "settlement", icon: Scale },
  { href: "/installments", label: "installments", icon: Repeat },
  { href: "/scan", label: "scan", icon: Camera }
] satisfies Array<{ href: string; label: DictionaryKey; icon: typeof Home }>;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const isPlainRoute = pathname.startsWith("/auth") || pathname.startsWith("/unlock");

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      {!isPlainRoute ? (
        <div
          className="fixed inset-x-0 top-0 z-20 border-b border-[var(--header-border)] bg-[var(--header-bg)] backdrop-blur-xl"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)"
          }}
        >
          <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-4">
            <Link href="/" className="flex items-center gap-3 font-bold">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)] shadow-[var(--secondary-shadow)]">FP</span>
              <span className="hidden min-[390px]:inline">FlowPay</span>
            </Link>
            <div className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition",
                      "text-[var(--app-fg)] shadow-[var(--secondary-shadow)] hover:bg-[var(--ghost-hover)]",
                      active && "bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)] shadow-[var(--pressed-shadow)]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t(locale, item.label)}
                  </Link>
                );
              })}
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Button
                aria-label={t(locale, "toggleLanguage")}
                size="sm"
                variant="secondary"
                onClick={() => setLocale(locale === "th" ? "en" : "th")}
                title={t(locale, "toggleLanguage")}
              >
                <Languages className="h-4 w-4" />
                {locale === "th" ? "TH" : "EN"}
              </Button>
              <Link
                aria-label={t(locale, "settings")}
                href="/settings"
                title={t(locale, "settings")}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--app-fg)] ring-1 ring-[var(--control-border)] shadow-[var(--secondary-shadow)] transition hover:bg-[var(--control-hover)]"
              >
                <Settings className="h-5 w-5" />
              </Link>
              <Button
                aria-label={t(locale, "toggleTheme")}
                size="icon"
                variant="secondary"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title={t(locale, "toggleTheme")}
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition dark:rotate-0 dark:scale-100" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <main
        className={cn(isPlainRoute ? "min-h-screen" : "mx-auto max-w-6xl px-4 pb-28 md:pb-10")}
        style={isPlainRoute ? undefined : { paddingTop: "calc(env(safe-area-inset-top) + 6rem)" }}
      >
        {children}
      </main>

      {!isPlainRoute ? (
        <Link
          aria-label={t(locale, "addTransaction")}
          href="/transactions?new=true"
          className="fixed bottom-8 right-8 z-30 hidden h-14 w-14 place-items-center rounded-2xl bg-teal-500 text-slate-950 shadow-2xl shadow-teal-500/30 md:grid"
        >
          <Plus className="h-6 w-6" />
        </Link>
      ) : null}

      {!isPlainRoute ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--header-border)] bg-[var(--header-bg)] px-2 pt-2 backdrop-blur-xl md:hidden"
          style={{
            paddingBottom: "env(safe-area-inset-bottom)",
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)"
          }}
        >
          <div className="grid grid-cols-6 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold",
                    "text-[var(--app-fg)] shadow-[var(--secondary-shadow)]",
                    active && "bg-[var(--accent-soft)] text-[var(--accent-fg)] shadow-[var(--pressed-shadow)]"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {t(locale, item.label)}
                </Link>
              );
            })}
            <Link
              aria-label={t(locale, "addTransaction")}
              href="/transactions?new=true"
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-[var(--primary-bg)] text-[11px] font-semibold text-[var(--primary-fg)] shadow-lg shadow-[var(--primary-shadow)]"
            >
              <Plus className="h-5 w-5" />
              {t(locale, "addTransaction")}
            </Link>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
