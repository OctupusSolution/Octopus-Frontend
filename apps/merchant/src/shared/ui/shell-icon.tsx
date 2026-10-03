// The console frames' own line icons (apps/assets/Dashboard/icons), exported
// from Figma. They are drawn as a mask rather than an <img> so the shape is the
// frame's but the colour is the surrounding text colour — which is what lets
// one file serve the light theme, the dark theme and an active nav entry.

function shellIconUrl(file: string): string {
  return new URL(`../../../../assets/Dashboard/icons/${file}`, import.meta.url).href;
}

export function ShellIcon({ name, size = 24, className }: { name: string; size?: number; className?: string }) {
  const mask = `url("${shellIconUrl(name)}") center / contain no-repeat`;
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-current${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size, WebkitMask: mask, mask }}
    />
  );
}
