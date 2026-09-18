// apps/merchant/src/pages/staff/_shared/staff-photos.ts
// Stock portraits (randomuser.me, free to use) bundled under
// apps/assets/staff-avatars, keyed by employee name so every Avatar in the
// Staff module picks them up without each call site passing a photo. The
// mock employees carry no gender field, so it is read off the first name.
import { employees } from "@/shared/api/mock-staff";

const FEMALE_FIRST_NAMES = new Set([
  "Amal", "Reem", "Sara", "Hind", "Latifa", "Manal", "Yara", "Noura", "Dana", "Rania", "Layla", "Maha", "Ghada",
]);

function photoUrl(folder: "women" | "men", n: number): string {
  return new URL(`../../../../../assets/staff-avatars/${folder}-${n}.jpg`, import.meta.url).href;
}

const next = { women: 1, men: 1 };
const byName = new Map<string, string>();
for (const e of employees) {
  const folder = FEMALE_FIRST_NAMES.has(e.name.split(" ")[0]) ? "women" : "men";
  const url = photoUrl(folder, next[folder]++);
  byName.set(e.name, url);
  byName.set(e.nameAr, url);
}

export function staffPhoto(name: string): string | undefined {
  return byName.get(name);
}
