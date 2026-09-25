// Turns a business's public-site brand into what the storefront renders with:
// CSS custom properties for colour, the font stacks, the logo and the hero copy.
// Every field is optional in the API, so each one falls back to the storefront's
// own default and an unbranded business still looks finished.
import type { CSSProperties } from "react";
import type { PublicSite } from "./public-api";

/** API font code -> the CSS variable next/font registers for it in layout.tsx. */
const FONT_VAR: Record<string, string> = {
  inter: "var(--font-inter-loaded)",
  cairo: "var(--font-cairo-loaded)",
  tajawal: "var(--font-tajawal-loaded)",
  poppins: "var(--font-poppins-loaded)",
  "playfair-display": "var(--font-playfair-loaded)",
};

const HEX = /^#[0-9a-f]{6}$/i;
const color = (site: PublicSite | null, token: string): string | undefined => {
  const v = site?.brand.colors[token];
  return v && HEX.test(v) ? v : undefined;
};

export function themeStyle(site: PublicSite | null): CSSProperties {
  const brand = color(site, "core.primary");
  const surface = color(site, "background.surface");
  const heading = color(site, "text.heading");
  const t = site?.brand.typography;
  const latin = t?.bodyEnglish ? FONT_VAR[t.bodyEnglish] : undefined;
  const arabic = t?.bodyArabic ? FONT_VAR[t.bodyArabic] : undefined;
  const style: Record<string, string> = {};
  if (brand) {
    style["--octo-brand"] = brand;
    style["--octo-store-price"] = brand;
  }
  if (surface) style["--octo-store-page"] = surface;
  if (heading) style["--octo-text-primary"] = heading;
  if (latin) style["--font-latin"] = `${latin}, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  if (arabic) style["--font-arabic"] = `${arabic}, var(--font-latin-loaded), -apple-system, "Segoe UI", sans-serif`;
  return style as CSSProperties;
}

export interface HeroCopy {
  heading: string;
  subheading: string;
  primaryCta: string;
  secondaryCta: string;
  imageUrl: string | null;
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function heroOf(site: PublicSite | null): HeroCopy {
  const content = (site?.sections.find((s) => s.type === "hero")?.content ?? {}) as Record<string, unknown>;
  return {
    heading: text(content.heading),
    subheading: text(content.subheading),
    primaryCta: text(content.primaryCta),
    secondaryCta: text(content.secondaryCta),
    imageUrl: site?.brand.heroBackground?.url ?? null,
  };
}
