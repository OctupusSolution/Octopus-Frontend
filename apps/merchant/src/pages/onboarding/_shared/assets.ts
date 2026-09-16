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

/** The mascot the Get Started screen leads with, ringed by the four module
 *  tiles. A different picture from HERO_URL, which is the abstract cube. */
export const SETUP_HERO_URL = url("Setup/octopus.png");

/** The spinner and the stamp the payment step's two dialogs are built around.
 *  Both are flat artwork rather than CSS: the frames draw a specific spinner
 *  and a specific rubber stamp, neither of which a border-spin reproduces. */
export const PAYMENT_SPINNER_URL = url("Setup/loading (3) 1.png");
export const PAYMENT_STAMP_URL = url("login/stamp.gif");

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

// Moved to shared/lib/storefront-assets.ts — see the note there.
export * from "@/shared/lib/storefront-assets";

