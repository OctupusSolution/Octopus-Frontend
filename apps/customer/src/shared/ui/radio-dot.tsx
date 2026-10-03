export interface RadioDotProps {
  checked: boolean;
  /** 24px on the branch and tip rows, 32px on the scheduling cards. */
  size?: 24 | 32;
}

/** The radio the fulfillment screens draw beside every choice. Purely visual —
 *  the real `input` sits next to it, visually hidden. */
export function RadioDot({ checked, size = 24 }: RadioDotProps) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full border-[1.5px] ${
        size === 32 ? "size-8" : "size-6"
      } ${checked ? "border-[var(--color-ocean-blue)]" : "border-[var(--color-gray-300)]"}`}
    >
      {checked && (
        <span
          className={`rounded-full bg-[var(--color-ocean-blue)] ${size === 32 ? "size-4" : "size-3"}`}
        />
      )}
    </span>
  );
}
