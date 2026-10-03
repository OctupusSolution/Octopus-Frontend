// Public Link typography: the draft stores the API's font catalogue codes
// (`GET /public-link/fonts`). Drafts saved before the catalogue was wired — and
// the menu Theme step, which still offers shared/lib/brand-tokens FONTS ids —
// hold the older ids (inter, readex, georgia, tahoma); they are read as the
// nearest catalogue face.
import type { FontResponse } from "@octopus/api-client";

/** Mirrors the backend's default catalogue (PublicLinkOptions.Fonts); used until
 *  the real catalogue loads, or when there is no business session. */
export const FALLBACK_SITE_FONTS: readonly FontResponse[] = [
  { code: "inter", displayName: "Inter" },
  { code: "cairo", displayName: "Cairo" },
  { code: "tajawal", displayName: "Tajawal" },
  { code: "poppins", displayName: "Poppins" },
  { code: "playfair-display", displayName: "Playfair Display" },
];

const LEGACY_TO_CODE: Record<string, string> = {
  inter: "inter",
  readex: "cairo",
  georgia: "playfair-display",
  tahoma: "tajawal",
};

/** Catalogue code -> the closest brand-tokens FONTS id, for previews that still
 *  resolve faces through `fontStack`. */
const CODE_TO_LEGACY: Record<string, string> = {
  inter: "inter",
  cairo: "readex",
  tajawal: "tahoma",
  "playfair-display": "georgia",
  poppins: "inter",
};

/** A stored draft font value (catalogue code or legacy id) -> catalogue code. */
export function toFontCode(value: string | null | undefined): string {
  if (!value) return "inter";
  return LEGACY_TO_CODE[value] ?? value;
}

/** A stored draft font value -> brand-tokens FONTS id (for `fontStack`). */
export function toLegacyFontId(value: string | null | undefined): string {
  if (!value) return "inter";
  if (value in LEGACY_TO_CODE) return value;
  return CODE_TO_LEGACY[value] ?? "inter";
}

const loadedFamilies = new Set<string>();

/** Loads a catalogue family from Google Fonts for on-screen samples. Inter is the
 *  app's own face and is already available. Safe to call repeatedly. */
export function ensureFontLoaded(displayName: string): void {
  if (typeof document === "undefined" || !displayName || displayName === "Inter") return;
  if (loadedFamilies.has(displayName)) return;
  loadedFamilies.add(displayName);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(displayName).replace(/%20/g, "+")}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

/** CSS font-family for a catalogue face, falling back to the app face per locale
 *  so glyphs the family lacks (e.g. Arabic in Playfair) still render. */
export function siteFontFamily(displayName: string | undefined, locale: "en" | "ar"): string {
  const fallback = locale === "ar" ? "var(--font-arabic)" : "var(--font-latin)";
  return displayName ? `'${displayName.replace(/'/g, "")}', ${fallback}` : fallback;
}
