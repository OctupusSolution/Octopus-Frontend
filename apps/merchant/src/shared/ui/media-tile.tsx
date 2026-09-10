// A picture slot that is the same size whether or not it has a picture in it.
//
// Before this, an empty slot drew a small centred badge inside a much larger
// box, so a menu with some photos and some without looked like a grid of
// mismatched cards — the frames have every tile the same size because every
// tile is filled. The placeholder now fills the slot exactly as the photo will,
// so nothing moves or resizes when the merchant picks one.
import clsx from "clsx";

export function MediaTile({
  src,
  alt = "",
  className,
  label,
  rounded = "rounded-[10px]",
}: {
  src: string | null;
  alt?: string;
  /** Sizing comes from the caller — this decides only what fills it. */
  className?: string;
  /** Two short lines for the empty state, e.g. ME / NU. */
  label?: [string, string];
  rounded?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={clsx("h-full w-full object-cover", rounded, className)}
      />
    );
  }

  const [top, bottom] = label ?? ["ME", "NU"];
  return (
    <span
      aria-hidden
      className={clsx(
        // Fills, like the photo it stands in for. The lettering scales with the
        // box via container-relative sizing rather than a fixed font size, so
        // one component serves a 40px card thumb and a 190px hero slot.
        "grid h-full w-full place-items-center bg-[#0d2b21] text-center font-serif leading-tight text-white/70",
        "text-[max(9px,min(22px,1.2vw))]",
        rounded,
        className
      )}
    >
      <span>
        {top}
        <br />
        {bottom}
      </span>
    </span>
  );
}
