// Form controls drawn to the Staff frames. The frames have two looks:
//   "dialog" — the Add Member / Assign Shift / Time Off dialogs: 16px labels
//              inset 8px, 12px above a 40px field with a 12px radius.
//   "page"   — the member profile's sections: 14px labels 8px above a 40px
//              field with a 4px radius.
// Controls read the look from context so a whole form switches at once.
import {
  createContext,
  forwardRef,
  useContext,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { StaffIcon } from "./icon";
import { INK } from "./theme";

export type FormLook = "dialog" | "page";

const FormLookContext = createContext<FormLook>("dialog");

export function FormLookProvider({ look, children }: { look: FormLook; children: ReactNode }) {
  return <FormLookContext.Provider value={look}>{children}</FormLookContext.Provider>;
}

export function useFormLook(): FormLook {
  return useContext(FormLookContext);
}

const RADIUS: Record<FormLook, string> = { dialog: "rounded-[12px]", page: "rounded-[4px]" };

// The frames' field outline (#cbd5e1) has no token, so dark mode falls back to
// the input-border token. The dark rule outranks a plain `focus:` utility,
// hence the explicit dark focus variants.
const BORDER = "border border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-input)]";
const BORDER_INVALID = "border border-[#d30202]";
const FOCUS =
  "transition-colors focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25 [[data-theme=dark]_&]:focus:border-[#0D6EFD]";
const FOCUS_WITHIN =
  "transition-colors focus-within:border-[#0D6EFD] focus-within:ring-2 focus-within:ring-[#0D6EFD]/25 [[data-theme=dark]_&]:focus-within:border-[#0D6EFD]";

const CONTROL = `h-10 w-full bg-[var(--octo-card)] px-2 text-[14px] ${INK} placeholder:text-[#687280] [[data-theme=dark]_&]:placeholder:text-[var(--octo-text-secondary)] disabled:cursor-not-allowed disabled:opacity-60`;

function controlClass(look: FormLook, invalid?: boolean): string {
  return clsx(CONTROL, RADIUS[look], invalid ? BORDER_INVALID : BORDER, FOCUS);
}

export function Field({
  label,
  error,
  hint,
  children,
  className,
  htmlFor,
  required,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  required?: boolean;
}) {
  const look = useContext(FormLookContext);
  const dialog = look === "dialog";
  return (
    <div className={clsx("flex min-w-0 flex-col", dialog ? "gap-3" : "gap-2", className)}>
      <label
        htmlFor={htmlFor}
        className={clsx("font-medium", INK, dialog ? "px-2 text-[16px] leading-4" : "text-[14px] leading-[14px]")}
      >
        {label}
        {required && (
          <span aria-hidden className="text-[#d30202]">
            {" "}*
          </span>
        )}
      </label>
      {children}
      {error ? (
        <span role="alert" className={clsx("-mt-1 text-[12px] leading-3 text-[#d30202]", dialog && "px-2")}>{error}</span>
      ) : hint ? (
        <span className={clsx("-mt-1 text-[12px] leading-[1.4] text-[#687280] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]", dialog && "px-2")}>{hint}</span>
      ) : null}
    </div>
  );
}

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; leading?: ReactNode; trailing?: ReactNode }
>(function TextInput({ className, invalid, leading, trailing, ...props }, ref) {
  const look = useContext(FormLookContext);
  return (
    <span className="relative flex items-center">
      {leading && (
        <span aria-hidden className="pointer-events-none absolute start-2 flex items-center text-[#687280] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]">
          {leading}
        </span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={clsx(controlClass(look, invalid), leading && "ps-10", trailing && "pe-10", className)}
        {...props}
      />
      {trailing && <span className="absolute end-2 flex items-center">{trailing}</span>}
    </span>
  );
});

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function SelectInput({ className, invalid, children, ...props }, ref) {
    const look = useContext(FormLookContext);
    return (
      <span className="relative flex items-center">
        <select ref={ref} aria-invalid={invalid || undefined} className={clsx(controlClass(look, invalid), "appearance-none pe-10", className)} {...props}>
          {children}
        </select>
        <StaffIcon name="form-arrow-down.svg" size={24} className={clsx("pointer-events-none absolute end-2", INK)} />
      </span>
    );
  }
);

/**
 * A date field shown the way the frames draw it — "31 July 1999" (or a
 * placeholder) with a calendar glyph at the end — backed by a real
 * `<input type="date">` that covers the field invisibly and opens the
 * browser's picker on click.
 */
export function DateInput({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  min,
  max,
  disabled,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  invalid?: boolean;
  min?: string;
  max?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const look = useContext(FormLookContext);
  const { locale } = useI18n();
  const display = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "";
  return (
    <span
      className={clsx(
        "relative flex h-10 w-full items-center gap-2 bg-[var(--octo-card)] px-2 text-[14px]",
        RADIUS[look],
        invalid ? BORDER_INVALID : BORDER,
        FOCUS_WITHIN,
        disabled && "opacity-60"
      )}
    >
      <span className={clsx("min-w-0 flex-1 truncate", display ? INK : "text-[#687280] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]")}>
        {display || placeholder}
      </span>
      <StaffIcon name="form-calendar.svg" size={24} className={INK} />
      <input
        id={id}
        type="date"
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => {
          try {
            event.currentTarget.showPicker?.();
          } catch {
            /* showPicker throws outside a user gesture in some browsers; the native control still works */
          }
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
    </span>
  );
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  { className, ...props },
  ref
) {
  const look = useContext(FormLookContext);
  return <textarea ref={ref} className={clsx(controlClass(look), "h-auto min-h-[88px] resize-y py-3", className)} {...props} />;
});
