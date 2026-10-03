// Pieces the Menu & Order, Reservations and Waitlist inspectors share that the
// common `controls.tsx` vocabulary does not carry: the frames' two-line select
// card, the "module is active" status line, the enable card, the inline radio
// pills, the 12px sub-field and the full-width soft button. Presentational
// only — no draft, no dispatch.
import type { ReactNode } from "react";
import clsx from "clsx";
import { PlFieldError, PlIcon, PlSelect, plText } from "../../ui/kit";
import { Switch } from "../../ui/switch";

/** 12px/medium caption the frames put over a field inside a group ("Label",
 *  "MIN", "Update interval"), 8px above the control. */
export function SubField({
  label,
  note,
  error,
  children,
  className,
}: {
  label: ReactNode;
  /** Muted line between the caption and the control ("Remove if not confirmed in"). */
  note?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex min-w-0 flex-col gap-2", className)}>
      <span className="text-[12px] font-medium leading-[12px] text-[var(--pl-text)]">{label}</span>
      {note && <span className="text-[12px] font-medium leading-[16px] text-[var(--pl-text-2)]">{note}</span>}
      {children}
      <PlFieldError>{error}</PlFieldError>
    </div>
  );
}

/** A 14px group caption with its fields 12px below ("Show Next Available Time"). */
export function FieldGroup({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span className={plText.h6}>{label}</span>
      {children}
    </div>
  );
}

/** 12px muted helper line under a field. */
export function FieldNote({ children }: { children: ReactNode }) {
  return <p className="text-[12px] font-medium leading-[12px] text-[var(--pl-text-2)]">{children}</p>;
}

/** The green check + 12px line: "Successfully Connected", "module is active". */
export function StatusLine({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1 text-[12px] font-medium leading-[12px] text-[var(--pl-success)]">
      <PlIcon name="completed" size={16} />
      {children}
    </span>
  );
}

/** The frames' 40px soft-blue button spanning the panel ("Manage Menus"). */
export function SoftButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-full items-center justify-center rounded-[8px] bg-[var(--pl-primary-soft)] px-3 text-[16px] font-bold leading-[16px] text-[var(--pl-primary-deep)] transition-[filter] hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
    >
      {children}
    </button>
  );
}

/** The bordered card that switches a module on: title, note, and the active
 *  status line while it is on. */
export function EnableCard({
  title,
  note,
  status,
  checked,
  onChange,
}: {
  title: string;
  note: string;
  status: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[12px] border border-[var(--pl-g300)] p-2">
      <div className="flex min-w-0 flex-col gap-2">
        <span className={plText.h6}>{title}</span>
        <span className="text-[12px] font-medium leading-[12px] text-[var(--pl-text-2)]">{note}</span>
        {checked && <StatusLine>{status}</StatusLine>}
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

/** A 12px label with a switch on the end — the notification channel rows. */
export function MiniToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] font-medium leading-[16px] text-[var(--pl-text)]">{label}</span>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

/** Inline radio pills ("Ordering / Reservation / View"): one of a few short,
 *  mutually exclusive choices on a single row. */
export function RadioPills<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-2">
      {options.map((option) => {
        const on = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.id)}
            className={clsx(
              "flex items-center gap-3 rounded-[12px] border p-2 text-[14px] font-medium leading-[14px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
              on
                ? "border-[var(--pl-primary)] bg-[var(--pl-primary-soft)] text-[var(--pl-primary-text)]"
                : "border-[var(--pl-g300)] text-[var(--pl-text-3)]"
            )}
          >
            {option.label}
            <PlIcon
              name={on ? "customize-insp-radio-on" : "customize-insp-radio-off"}
              className={on ? "text-[var(--pl-primary)]" : "text-[#64748B]"}
            />
          </button>
        );
      })}
    </div>
  );
}

export interface SelectCardOption {
  id: string;
  title: string;
  note?: string;
  /** 40px thumbnail on the start side (a saved menu's photo). */
  image?: string;
}

/** The frames' two-line dropdown: the chosen option's title over its note,
 *  the 24px arrow on the end. A native select lies over the card, so the
 *  keyboard, the screen reader and the phone's picker all behave as a select. */
export function SelectCard({
  label,
  value,
  options,
  placeholder,
  invalid,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  options: readonly SelectCardOption[];
  placeholder: string;
  invalid?: boolean;
  onChange: (id: string) => void;
  onBlur?: () => void;
}) {
  const current = options.find((option) => option.id === value);
  return (
    <div
      className={clsx(
        "relative flex min-h-[58px] items-center justify-between gap-2 rounded-[12px] border p-2 transition-colors focus-within:ring-2",
        invalid
          ? "border-[var(--pl-error)] focus-within:ring-[#D30202]/20"
          : "border-[var(--pl-g300)] focus-within:border-[var(--pl-primary)] focus-within:ring-[#0D6EFD]/20"
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {current?.image && <img src={current.image} alt="" className="h-10 w-10 shrink-0 rounded-[4px] bg-[var(--pl-g100)] object-cover" />}
        <div className="flex min-w-0 flex-col text-[14px] leading-[1.4]">
          <span className={clsx("truncate font-medium", current ? "text-[var(--pl-text)]" : "text-[var(--pl-text-3)]")}>
            {current ? current.title : placeholder}
          </span>
          {current?.note && <span className="truncate font-normal text-[var(--pl-text-2)]">{current.note}</span>}
        </div>
      </div>
      <PlIcon name="chevron-24" className="text-[var(--pl-text-3)]" />
      <select
        aria-label={label}
        aria-invalid={invalid || undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-[12px] opacity-0"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.title}
          </option>
        ))}
      </select>
    </div>
  );
}

/** The frames' 40px dropdown over a list of option ids, opening on a real
 *  placeholder rather than a blank row. */
export function OptionSelect<T extends string>({
  label,
  value,
  options,
  labelFor,
  placeholder,
  invalid,
  onChange,
  onBlur,
}: {
  /** Accessible name, for a select whose caption is not a `<label>`. */
  label: string;
  value: string;
  options: readonly T[];
  labelFor: (id: T) => string;
  placeholder: string;
  invalid?: boolean;
  onChange: (id: T) => void;
  onBlur?: () => void;
}) {
  return (
    <PlSelect aria-label={label} value={value} invalid={invalid} onChange={(e) => onChange(e.target.value as T)} onBlur={onBlur}>
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((id) => (
        <option key={id} value={id}>
          {labelFor(id)}
        </option>
      ))}
    </PlSelect>
  );
}

/** Keeps only digits — the party-size fields take whole numbers. */
export function digitsOnly(value: string): string {
  return value.replace(/\D+/g, "");
}

/** Keeps digits and one decimal point — the amount fields (SAR). */
export function amountOnly(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  return dot === -1 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}
