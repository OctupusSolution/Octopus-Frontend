// The Waitlist frames' own glyphs (apps/assets/Waitlist/icons), exported from
// Figma. Same mechanism as shared/ui/shell-icon.tsx.

export function waitlistAssetUrl(file: string): string {
  return new URL(`../../../../../../assets/Waitlist/icons/${file}`, import.meta.url).href;
}

/** Drawn as a mask: the shape is the frame's, the colour is the surrounding
 *  text colour. `glyph` is the drawing's own size when it is smaller than the
 *  box the frame gives it. */
export function WaitlistIcon({ name, size = 24, glyph, className }: { name: string; size?: number; glyph?: string; className?: string }) {
  const mask = `url("${waitlistAssetUrl(name)}") center / ${glyph ?? "contain"} no-repeat`;
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-current${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size, WebkitMask: mask, mask }}
    />
  );
}

/** For glyphs whose colours are the frame's own and must not follow the text
 *  colour (the WhatsApp mark, a white tick on the blue button). */
export function WaitlistImg({ name, size = 24, className }: { name: string; size?: number; className?: string }) {
  return <img src={waitlistAssetUrl(name)} alt="" aria-hidden width={size} height={size} className={`block shrink-0${className ? ` ${className}` : ""}`} style={{ width: size, height: size }} />;
}
