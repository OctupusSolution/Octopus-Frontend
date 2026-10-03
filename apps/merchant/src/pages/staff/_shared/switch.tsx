import clsx from "clsx";

// The frames' toggle ("Component 38"): a 32x16 track with a 12px knob. `lg` is
// the permission matrix's larger toggle.
const SIZES = {
  sm: { track: "h-4 w-8", knob: "h-3 w-3", off: "translate-x-[2px] rtl:-translate-x-[2px]", on: "translate-x-[18px] rtl:-translate-x-[18px]" },
  md: { track: "h-4 w-8", knob: "h-3 w-3", off: "translate-x-[2px] rtl:-translate-x-[2px]", on: "translate-x-[18px] rtl:-translate-x-[18px]" },
  lg: { track: "h-6 w-12", knob: "h-4 w-4", off: "translate-x-[4px] rtl:-translate-x-[4px]", on: "translate-x-[28px] rtl:-translate-x-[28px]" },
} as const;

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  size = "md",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={clsx(
        "relative inline-flex shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 disabled:cursor-not-allowed disabled:opacity-60",
        s.track,
        checked ? "bg-[#0D6EFD]" : "bg-[#cbd5e1] [[data-theme=dark]_&]:bg-[var(--octo-switch-off)]"
      )}
    >
      <span className={clsx("inline-block transform rounded-full bg-white transition-transform", s.knob, checked ? s.on : s.off)} />
    </button>
  );
}
