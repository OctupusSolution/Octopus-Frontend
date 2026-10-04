// A real role="switch" button — announces its state and takes the keyboard.
// The frames draw one switch everywhere: a 32×18 track with a 14px knob, so
// `size` only changes the label beside it.
import clsx from "clsx";
import { TEXT_PRIMARY } from "../../_shared/theme";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0d6efd]/40 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-[#0d6efd]" : "bg-[#cbd5e1] [[data-theme=dark]_&]:bg-[var(--octo-switch-off)]"
      )}
    >
      <span
        className={clsx(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] transition-transform",
          checked ? "translate-x-[15px] rtl:-translate-x-[15px]" : "translate-x-[2px] rtl:-translate-x-[2px]"
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
  weight = "medium",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  size?: "sm" | "md";
  disabled?: boolean;
  hint?: string;
  /** The Add Tables form sets its option labels semibold; inspectors use medium. */
  weight?: "medium" | "semibold";
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onChange={onChange} label={label} size={size} disabled={disabled} />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        title={hint}
        className={clsx(
          "text-start disabled:opacity-50",
          TEXT_PRIMARY,
          weight === "semibold" ? "font-semibold" : "font-medium",
          size === "sm" ? "text-[13px] leading-[14px]" : "text-[14px] leading-[14px]"
        )}
      >
        {label}
      </button>
    </div>
  );
}
