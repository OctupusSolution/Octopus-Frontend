// The Menu frames' own glyphs (apps/assets/Menu/icons), exported from Figma.
// Same mechanism as shared/ui/shell-icon.tsx: drawn as a mask so the shape is
// the frame's and the colour is the surrounding text colour, which is what
// lets one file serve the light theme, the dark theme and a disabled control.

function menuIconUrl(file: string): string {
  return new URL(`../../../../../assets/Menu/icons/${file}`, import.meta.url).href;
}

export function MenuIcon({ name, size = 24, className }: { name: string; size?: number; className?: string }) {
  const mask = `url("${menuIconUrl(name)}") center / contain no-repeat`;
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-current${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size, WebkitMask: mask, mask }}
    />
  );
}
