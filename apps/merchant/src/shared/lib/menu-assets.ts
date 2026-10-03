// Image URLs for the Menu module. Same mechanism and same reasoning as
// storefront-assets.ts: the artwork stays in apps/assets/ and is reached by
// URL rather than copied into a second location that can drift.
//
// Paths are relative to THIS file: four levels up lands on `apps/`.

export function menuAsset(file: string): string {
  return new URL(`../../../../assets/Menu/${file}`, import.meta.url).href;
}

export const CREATE_FROM_SCRATCH_ART = menuAsset("Create Menu.png");
export const UPLOAD_WITH_AI_ART = menuAsset("Upload Menu.png");
