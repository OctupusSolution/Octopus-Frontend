// The toggle every step of the builder uses. A real button with role="switch",
// not a styled checkbox, so it announces its state and takes a keyboard.
// `packages/ui/src/primitives/index.ts` is a shared file this plan does not
// own, so this lives in the page rather than the shared primitives — the same
// pattern used across the console's settings rows.
import clsx from "clsx";

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={clsx(
        "relative inline-flex h-[20px] w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
        checked ? "bg-[#0D6EFD]" : "bg-[var(--octo-switch-off)]"
      )}
    >
      <span
        className={clsx(
          "inline-block h-4 w-4 transform rounded-full bg-[var(--octo-card)] shadow transition-transform",
          checked ? "translate-x-[17px] rtl:-translate-x-[17px]" : "translate-x-[2px] rtl:-translate-x-[2px]"
        )}
      />
    </button>
  );
}
