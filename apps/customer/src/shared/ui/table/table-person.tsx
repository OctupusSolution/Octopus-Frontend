import type { ReactNode } from "react";
import { initials } from "@/shared/lib/table-split";
import { TableIcon } from "./table-icon";

/** A person's initials in a 32px disc — their avatar in every split list. */
export function TableAvatar({ name }: { name: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-[24px] bg-gray-100 text-[10px] font-bold leading-[10px] text-[var(--octo-store-select-label)]">
      {initials(name)}
    </span>
  );
}

const BADGES = {
  paid: "bg-[var(--octo-store-success-soft)] font-medium text-[var(--octo-store-success)]",
  pending: "bg-[var(--octo-store-pending)] text-[var(--octo-store-pending-text)]",
  info: "bg-[var(--octo-store-info-soft)] font-medium text-[var(--octo-store-select-text)]",
} as const;

/** The pill that states where something stands: paid, link shared, being prepared. */
export function TableBadge({
  tone, compact, children,
}: { tone: keyof typeof BADGES; compact?: boolean; children: ReactNode }) {
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full text-[12px] leading-[12px] ${
        compact ? "px-2 py-1" : "px-3 py-2"
      } ${BADGES[tone]}`}
    >
      {children}
    </span>
  );
}

/** "Add a person" as the split screens draw it: a dashed outline, never a filled action. */
export function TableAddButton({
  label, size = "md", onClick,
}: { label: string; size?: "md" | "sm"; onClick: () => void }) {
  const small = size === "sm";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-1 rounded-[24px] border border-dashed border-ocean-blue font-bold leading-none text-[var(--octo-store-select-text)] ${
        small ? "h-9 text-[12px]" : "h-12 text-[16px]"
      }`}
    >
      <TableIcon name={small ? "plus-blue-16" : "plus-blue"} size={small ? 16 : 24} />
      {label}
    </button>
  );
}

export interface TableFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputMode?: "text" | "decimal";
  /** Drawn at the inline end of the box — the currency word on an amount. */
  suffix?: string;
  autoFocus?: boolean;
}

export function TableField({ label, value, onChange, placeholder, inputMode = "text", suffix, autoFocus }: TableFieldProps) {
  return (
    <label className="flex w-full flex-col gap-3">
      <span className="px-2 text-[14px] font-medium leading-none text-black">{label}</span>
      <span className="flex h-12 items-center gap-2 rounded-[24px] border border-gray-300 p-3 focus-within:border-ocean-blue">
        <input
          type="text"
          inputMode={inputMode}
          value={value}
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-[12px] leading-none text-gray-900 outline-none placeholder:text-[var(--octo-store-select-label)]"
        />
        {suffix && <span className="text-[12px] font-medium leading-none text-gray-900">{suffix}</span>}
      </span>
    </label>
  );
}
