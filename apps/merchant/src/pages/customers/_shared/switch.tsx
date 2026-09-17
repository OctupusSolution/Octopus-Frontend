import clsx from "clsx";

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
  size?: "sm" | "md";
}) {
  const md = size === "md";
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
        md ? "h-[22px] w-[40px]" : "h-[18px] w-[32px]",
        checked ? "bg-[#0D6EFD]" : "bg-[var(--octo-switch-off)]"
      )}
    >
      <span
        className={clsx(
          "inline-block transform rounded-full bg-white shadow-sm transition-transform",
          md ? "h-[18px] w-[18px]" : "h-[14px] w-[14px]",
          checked
            ? md ? "translate-x-[20px] rtl:-translate-x-[20px]" : "translate-x-[16px] rtl:-translate-x-[16px]"
            : "translate-x-[2px] rtl:-translate-x-[2px]"
        )}
      />
    </button>
  );
}
