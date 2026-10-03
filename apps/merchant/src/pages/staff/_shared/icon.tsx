// Icons exported from the Staff frames (apps/assets/Dashboard/icons/staff-*.svg
// and the shared form-*/crm-* glyphs). Drawn as a mask, like ShellIcon, so the
// frame's shape takes the surrounding text colour; unlike ShellIcon the glyph
// can keep its own drawn size inside the box, for the few the frames inset.
function iconUrl(file: string): string {
  return new URL(`../../../../../assets/Dashboard/icons/${file}`, import.meta.url).href;
}

export function StaffIcon({
  name,
  size = 24,
  glyph,
  className,
}: {
  name: string;
  /** The square box the icon occupies. */
  size?: number;
  /** The glyph's own width/height when it is drawn smaller than its box. */
  glyph?: [number, number];
  className?: string;
}) {
  const mask = `url("${iconUrl(name)}") center / ${glyph ? `${glyph[0]}px ${glyph[1]}px` : "contain"} no-repeat`;
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-current${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size, WebkitMask: mask, mask }}
    />
  );
}
