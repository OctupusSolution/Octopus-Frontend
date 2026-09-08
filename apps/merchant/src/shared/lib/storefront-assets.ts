// Image URLs for anything that depicts the customer-facing storefront.
//
// Lives in shared/ rather than inside onboarding because two hosts now draw
// that page: onboarding step 8 and the Public Link Builder. A widget may not
// import from pages/, so the paths had to come down here.
//
// Paths are relative to THIS file: four levels up lands on `apps/`.

function url(path: string): string {
  return new URL(`../../../../assets/${path}`, import.meta.url).href;
}

/** `apps/customer/public/images/storefront/<file>` — the photography the
 *  customer storefront actually ships.
 *
 *  Step 8 depicts that exact page, so it shows those exact pictures rather
 *  than a second copy in `apps/assets`. Two copies would be seven megabytes
 *  of duplicated photographs that drift apart the first time one side is
 *  re-shot — which is precisely how step 8 ended up pointing at four category
 *  images that no longer existed. */
export function storefrontAsset(file: string): string {
  return new URL(`../../../../customer/public/images/storefront/${file}`, import.meta.url).href;
}

// Only one real theme thumbnail exists. `elegant` uses it; `modern` and `warm`
// fall back to a gradient built from the merchant's own palette. Returning
// null is how a component learns to render that gradient instead of an <img>.
export function themeThumb(id: string): string | null {
  return id === "elegant" ? url("onboarding-Themes/Brand Theme.png") : null;
}
