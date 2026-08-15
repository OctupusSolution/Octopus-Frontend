import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { locales, defaultLocale, en, ar, applyDocumentLocale, getDirection, type Locale } from "@i18n/index";

const STORAGE_KEY = "octopus.locale";

const dictionaries: Record<Locale, Record<string, string>> = { en, ar };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return (locales as readonly string[]).includes(stored ?? "") ? (stored as Locale) : defaultLocale;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  useEffect(() => {
    applyDocumentLocale(locale);
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const dict = dictionaries[locale];
    return {
      locale,
      setLocale: setLocaleState,
      t: (key: string) => dict[key] ?? key,
      dir: getDirection(locale),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
