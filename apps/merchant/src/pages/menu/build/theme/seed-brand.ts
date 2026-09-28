import type { MenuBrand } from "@/entities/menu";
import type { SiteDraft } from "@/entities/site-draft";
import type { MenuPreset } from "./presets";

/** A menu's first brand: the Public Link site's (logo, hero, colours), with a chosen preset's palette taking
 *  precedence. The hero text is recorded as being in `language` — the builder's language when it was seeded.
 *  No media references: the site's images are URLs, so a save uploads/sends them as such. */
export function seedBrand(site: SiteDraft, preset: MenuPreset | null, language: string): MenuBrand {
  const hero = site.sectionSettings.hero;
  return {
    colors: preset ? { ...preset.colors } : { ...site.brand.colors },
    logoUrl: site.brand.logoDataUrl,
    heroUrl: hero.imageDataUrl,
    heroText: hero.heading,
    heroSubtext: hero.subheading,
    textLanguage: language,
    logoRef: null,
    heroRef: null,
  };
}
