// apps/merchant/src/pages/customers/_shared/avatar-photos.ts
// Stock portraits (randomuser.me, free to use) bundled under
// apps/assets/customer-avatars so the mock customers render with real photos
// offline. 14 of each are available; numbering wraps past that.
const PHOTOS_PER_GENDER = 14;

export function avatarPhoto(gender: "Male" | "Female", n: number): string {
  const folder = gender === "Female" ? "women" : "men";
  const index = ((n - 1) % PHOTOS_PER_GENDER) + 1;
  return new URL(`../../../../../assets/customer-avatars/${folder}-${index}.jpg`, import.meta.url).href;
}
