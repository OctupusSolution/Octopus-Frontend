// Every image the onboarding wizard reaches for, in one place. Components never
// build an asset path themselves — swapping a placeholder for a real photo is a
// file drop plus a line here, never a component edit.
//
// Paths are relative to this file: five levels up lands on `apps/`.

function url(path: string): string {
  return new URL(`../../../../../assets/${path}`, import.meta.url).href;
}

export const LOGO_URL = url("Logo/OCTOPUS LOGO.svg");
export const HERO_URL = url("Get Started/section image.webp");
export const DASHBOARD_MOCKUP_URL = url("Review.webp");

/** `apps/assets/onboarding-Business/<file>` — vertical cards, step 2. */
export function verticalIcon(file: string): string {
  return url(`onboarding-Business/${file}`);
}

/** `apps/assets/onboarding-Type/<file>` — service cards, step 3. */
export function typeIcon(file: string): string {
  return url(`onboarding-Type/${file}`);
}

/** `apps/assets/onboarding-Integrations/<file>` — vendor logos, step 6. */
export function integrationLogo(file: string): string {
  return url(`onboarding-Integrations/${file}`);
}

/** `apps/assets/payment/<file>` — payment method marks, step 10. */
export function paymentLogo(file: string): string {
  return url(`payment/${file}`);
}

/** `apps/assets/Get Started/<file>` — the three entry cards, step 1. */
export function getStartedAsset(file: string): string {
  return url(`Get Started/${file}`);
}

/** `apps/assets/public-link/<file>` — storefront preview imagery, step 8. */
export function publicLinkAsset(file: string): string {
  return url(`public-link/${file}`);
}

// Only one real theme thumbnail exists. `elegant` uses it; `modern` and `warm`
// fall back to a gradient built from the merchant's own palette (see
// ThemeTemplate.thumb in brand-catalog.ts). Returning null is how a component
// learns to render the gradient instead of an <img>.
export function themeThumb(id: string): string | null {
  return id === "elegant" ? url("onboarding-Themes/Brand Theme.png") : null;
}
