// The toggle every step of the builder uses — the frames' 32×18 switch with a
// 14px knob. A real button with role="switch",
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
        "relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 focus-visible:ring-offset-1",
        checked ? "bg-[var(--pl-primary)]" : "bg-[var(--pl-g300)]"
      )}
    >
      <span
        className={clsx(
          "inline-block h-[14px] w-[14px] transform rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform",
          checked ? "translate-x-[16px] rtl:-translate-x-[16px]" : "translate-x-[2px] rtl:-translate-x-[2px]"
        )}
      />
    </button>
  );
}
