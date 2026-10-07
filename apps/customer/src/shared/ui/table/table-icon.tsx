export interface TableIconProps {
  /** File name under /images/table, without the extension. */
  name: string;
  /** The icon's own drawn size. Most are 24px squares; a few are not square. */
  size?: number | readonly [number, number];
  className?: string;
}

/** One of the dine-in flow's exported icons, drawn at its own size. Decorative:
 *  the control around it carries the label. */
export function TableIcon({ name, size = 24, className }: TableIconProps) {
  const [width, height] = typeof size === "number" ? [size, size] : size;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/images/table/${name}.svg`}
      alt=""
      width={width}
      height={height}
      style={{ width, height }}
      className={`max-w-none shrink-0 ${className ?? ""}`}
    />
  );
}
