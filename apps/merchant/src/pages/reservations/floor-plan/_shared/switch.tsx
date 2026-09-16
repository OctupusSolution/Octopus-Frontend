// A real role="switch" button — announces its state and takes the keyboard.
import clsx from "clsx";

export function Switch({
  checked,
  onChange,
  label,
  size = "md",
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const small = size === "sm";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 disabled:cursor-not-allowed disabled:opacity-50",
        small ? "h-[18px] w-8" : "h-6 w-11",
        checked ? "bg-[#0D6EFD]" : "bg-[var(--octo-switch-off)]"
      )}
    >
      <span
        className={clsx(
          "inline-block transform rounded-full bg-white shadow transition-transform",
          small ? "h-3.5 w-3.5" : "h-[18px] w-[18px]",
          checked
            ? small
              ? "translate-x-[16px] rtl:-translate-x-[16px]"
              : "translate-x-[23px] rtl:-translate-x-[23px]"
            : "translate-x-[3px] rtl:-translate-x-[3px]"
        )}
      />
    </button>
  );
}

/** A switch with its visible label, clickable as one control. */
export function SwitchField({
  checked,
  onChange,
  label,
  size,
  disabled,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  size?: "sm" | "md";
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Switch checked={checked} onChange={onChange} label={label} size={size} disabled={disabled} />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        title={hint}
        className={clsx("text-start font-medium text-[var(--octo-text-primary)] disabled:opacity-50", size === "sm" ? "text-[13px]" : "text-[14.5px]")}
      >
        {label}
      </button>
    </div>
  );
}
