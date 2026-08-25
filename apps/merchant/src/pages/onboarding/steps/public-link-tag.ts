// Tag normalisation for the public link. Shared between the step (which builds
// the preview URL) and its aside (which owns the input), so both agree on what
// a tag is allowed to contain.

/** What the merchant sees while typing: strips disallowed characters and caps
 *  the length, nothing more. It deliberately does NOT trim or collapse
 *  hyphens — the field is a controlled input, so trimming here runs on every
 *  keystroke, and a hyphen the merchant just typed is always "trailing" at
 *  that instant. Do that and `-` becomes untypeable inside a tag. Storage
 *  stays permissive; DNS-legality is enforced only where the URL is built. */
export function sanitizeTag(value: string): string {
  return value.replace(/[^a-z0-9-]/gi, "").toLowerCase().slice(0, 63);
}

/** What the public URL is built from: collapses repeated hyphens and trims
 *  them from both ends so the result is a legal DNS label. Applied once, on
 *  the already-stored (not-yet-trimmed) tag, not on every keystroke. */
export function dnsLabel(tag: string): string {
  return tag.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}
