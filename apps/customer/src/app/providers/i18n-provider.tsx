"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ar, en, getDirection, type Locale } from "@i18n/index";

const dictionaries: Record<Locale, Record<string, string>> = { en, ar };

interface I18nContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** Unlike the merchant provider, locale arrives as a prop rather than from
 *  localStorage: the storefront resolves it from a cookie on the server, so the
 *  first paint is already in the right language and direction. Reading storage
 *  on the client would flash the wrong one. */
export function StoreI18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18nContextValue>(() => {
    const dict = dictionaries[locale];
    return {
      locale,
      dir: getDirection(locale),
      t: (key, vars) => {
        const template = dict[key] ?? key;
        if (!vars) return template;
        return Object.entries(vars).reduce(
          (out, [name, v]) => out.split(`{${name}}`).join(String(v)),
          template,
        );
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within StoreI18nProvider");
  return ctx;
}
