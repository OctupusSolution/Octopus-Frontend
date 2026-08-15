// Split out from locale-cookie.ts: that file imports next/headers and can
// only be used in Server Components, but client components (e.g. the locale
// switcher) also need the cookie name to write it.
export const LOCALE_COOKIE_NAME = "octo_locale";
