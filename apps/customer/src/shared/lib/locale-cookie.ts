import { cookies } from "next/headers";
import { defaultLocale, locales, type Locale } from "@i18n/index";
import { LOCALE_COOKIE_NAME } from "./locale-cookie-name";

export { LOCALE_COOKIE_NAME };

export function readLocaleCookie(): Locale {
  const raw = cookies().get(LOCALE_COOKIE_NAME)?.value;
  return (locales as readonly string[]).includes(raw ?? "") ? (raw as Locale) : defaultLocale;
}
