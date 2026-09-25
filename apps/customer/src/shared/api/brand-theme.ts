// Turns a published site's theme into what the storefront renders with: CSS
// custom properties for colour and the font stacks. Every token is optional, so
// each one falls back to the storefront's own default.
import type { CSSProperties } from "react";
import type { PublishedShell } from "./public-api";

/** API font code -> the CSS variable next/font registers for it in layout.tsx. */
const FONT_VAR: Record<string, string> = {
  inter: "var(--font-inter-loaded)",
  cairo: "var(--font-cairo-loaded)",
  tajawal: "var(--font-tajawal-loaded)",
  poppins: "var(--font-poppins-loaded)",
  "playfair-display": "var(--font-playfair-loaded)",
};

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

/** Theme colour token -> the storefront CSS variables it drives. */
const COLOR_VARS: Record<string, string[]> = {
  "core.primary": ["--octo-brand", "--octo-store-price"],
  "background.surface": ["--octo-store-page"],
  "text.heading": ["--octo-text-primary"],
  "text.body": ["--octo-text-secondary"],
  "text.muted": ["--octo-text-muted"],
  "borders.default": ["--octo-border-card"],
};

export function themeStyle(site: PublishedShell | null): CSSProperties {
  if (!site) return {};
  const style: Record<string, string> = {};
  for (const [token, vars] of Object.entries(COLOR_VARS)) {
    const v = site.theme.colors[token];
    if (v && HEX.test(v)) for (const name of vars) style[name] = v;
  }
  const fonts = site.theme.typography[site.language] ?? site.theme.typography[site.defaultLanguage];
  const body = fonts?.body ? FONT_VAR[fonts.body] : undefined;
  if (body) {
    // Both stacks: the storefront picks one by script, the site picks one face per language.
    style["--font-latin"] = `${body}, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    style["--font-arabic"] = `${body}, var(--font-latin-loaded), -apple-system, "Segoe UI", sans-serif`;
  }
  return style as CSSProperties;
}

/** A theme colour for inline use (header/footer backgrounds), when it is a valid hex. */
export function themeColor(site: PublishedShell | null, token: string): string | undefined {
  const v = site?.theme.colors[token];
  return v && HEX.test(v) ? v : undefined;
}
