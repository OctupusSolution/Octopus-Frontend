"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getDirection, type Locale } from "@i18n/index";
import { createTranslator, type Translate } from "@/shared/i18n/translate";

interface I18nContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: Translate;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** Unlike the merchant provider, locale arrives as a prop rather than from
 *  localStorage: the storefront resolves it from a cookie on the server, so the
 *  first paint is already in the right language and direction. Reading storage
 *  on the client would flash the wrong one. */
export function StoreI18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18nContextValue>(
    () => ({ locale, dir: getDirection(locale), t: createTranslator(locale) }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within StoreI18nProvider");
  return ctx;
}
