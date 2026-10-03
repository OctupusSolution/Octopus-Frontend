// The builder's own building blocks, drawn to the Figma "Public Link" frames
// (Octopus-UI-Design): the slate palette (`--pl-*`, see index.css), 14px/14px
// Inter labels, 40px fields with a 12px radius, and the frames' buttons.
//
// Every step composes these instead of the shared `@ui/primitives`, whose
// sizes belong to the rest of the console and do not match these frames.
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import clsx from "clsx";
import type { PreviewDevice } from "@/widgets/storefront-preview";

function iconUrl(file: string): string {
  return new URL(`../../../../../assets/PublicLink/icons/${file}`, import.meta.url).href;
}

/** A Figma-exported icon (apps/assets/PublicLink/icons) drawn as a mask, so
 *  the shape is the frame's and the colour is the surrounding text colour. */
export function PlIcon({
  name,
  size = 24,
  width,
  height,
  className,
}: {
  name: string;
  size?: number;
  width?: number;
  height?: number;
  className?: string;
}) {
  const mask = `url("${iconUrl(`${name}.svg`)}") center / contain no-repeat`;
  return (
    <span
      aria-hidden
      className={clsx("inline-block shrink-0 bg-current", className)}
      style={{ width: width ?? size, height: height ?? size, WebkitMask: mask, mask }}
    />
  );
}

// ---- Text styles (Figma: h2..h6, body) -------------------------------------

export const plText = {
  /** h3/bold — a step's own title. */
  h3Bold: "text-[20px] font-bold leading-[20px] text-[var(--pl-text)]",
  /** h3/med — a card's section heading ("Business Logo", "Colors"). */
  h3: "text-[20px] font-medium leading-[20px] text-[var(--pl-text)]",
  /** h5/med — a panel title ("Live Preview", "Selected Section"). */
  h5: "text-[16px] font-medium leading-[16px] text-[var(--pl-text)]",
  /** h6/med — field labels and list rows. */
  h6: "text-[14px] font-medium leading-[14px] text-[var(--pl-text)]",
  /** Muted copy under a title. */
  sub: "text-[14px] font-medium leading-[14px] text-[var(--pl-text-2)]",
  /** 12px helper copy under a field or heading. */
  hint: "text-[12px] font-normal leading-[1.4] text-[var(--pl-text-3)]",
} as const;

// ---- Surfaces --------------------------------------------------------------

/** The frames' white panel: 28px radius, soft 8px shadow, 16/24 padding. */
export const plCard =
  "rounded-[28px] bg-[var(--pl-surface)] px-4 py-6 shadow-[shadow:var(--pl-shadow-card)]";

/** The smaller panel the Customize / Preview / Publish columns use. */
export const plPanel = "rounded-[12px] bg-[var(--pl-surface)] shadow-[shadow:var(--pl-shadow-card)]";

// ---- Buttons ---------------------------------------------------------------

type PlButtonVariant = "primary" | "outline" | "soft" | "neutral" | "dangerSoft" | "plain";
type PlButtonSize = "lg" | "md" | "sm" | "xs";

const BUTTON_VARIANT: Record<PlButtonVariant, string> = {
  primary: "bg-[var(--pl-primary)] text-white hover:brightness-95",
  outline: "border border-[var(--pl-primary)] text-[var(--pl-primary)] hover:bg-[var(--pl-primary-soft)]",
  soft: "bg-[var(--pl-primary-soft)] text-[var(--pl-text)] hover:brightness-[0.98]",
  neutral: "bg-[var(--pl-g100)] text-[var(--pl-text-3)] hover:brightness-[0.98]",
  dangerSoft: "bg-[var(--pl-error-soft)] text-[var(--pl-error)] hover:brightness-[0.98]",
  plain: "border border-[var(--pl-g300)] text-[var(--pl-text)] hover:bg-[var(--pl-g50)]",
};

const BUTTON_SIZE: Record<PlButtonSize, string> = {
  lg: "h-12 rounded-[8px] px-3 text-[18px] leading-[18px]",
  md: "h-10 rounded-[8px] px-3 text-[16px] leading-[16px]",
  sm: "h-9 rounded-[8px] px-3 text-[16px] leading-[16px]",
  xs: "h-8 rounded-[4px] px-3 text-[12px] leading-[12px]",
};

export interface PlButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PlButtonVariant;
  size?: PlButtonSize;
}

/** The frames' "Smalll Button": bold Inter, centred, 8px gap to an icon. */
export function PlButton({ variant = "primary", size = "lg", className, children, ...props }: PlButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-[filter,background-color] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 disabled:cursor-not-allowed disabled:opacity-50",
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ---- Fields ----------------------------------------------------------------

/** Red 12px line under an invalid field. `id` lets the field point at it. */
export function PlFieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-[12px] font-normal leading-[1.4] text-[var(--pl-error)]">
      {children}
    </p>
  );
}

/** A label above its control, with the frames' 12px gap; then an optional
 *  hint, replaced by the error message while the field is invalid. */
export function PlField({
  label,
  optional,
  required,
  hint,
  error,
  action,
  children,
  className,
}: {
  label: ReactNode;
  /** Small "(Optional)"-style suffix, drawn in the frames at 10px. */
  optional?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  /** Trailing link on the label row (the frames' "Edit"). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className={plText.h6}>
          {label}
          {required && <span className="text-[var(--pl-error)]"> *</span>}
          {optional && <span className="ms-1 text-[10px] font-normal text-[var(--pl-text)]">{optional}</span>}
        </span>
        {action}
      </div>
      <div className="flex flex-col gap-2">
        {children}
        {error ? <PlFieldError>{error}</PlFieldError> : hint ? <p className={plText.hint}>{hint}</p> : null}
      </div>
    </div>
  );
}

const FIELD_BASE =
  "h-10 w-full min-w-0 rounded-[12px] border bg-transparent px-3 text-[14px] leading-[14px] text-[var(--pl-text)] placeholder:font-normal placeholder:text-[var(--pl-text-3)] transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50";
const FIELD_OK = "border-[var(--pl-g300)] focus:border-[var(--pl-primary)] focus:ring-[#0D6EFD]/20";
const FIELD_BAD = "border-[var(--pl-error)] focus:border-[var(--pl-error)] focus:ring-[#D30202]/20";

export function plFieldClass(invalid?: boolean, className?: string) {
  return clsx(FIELD_BASE, invalid ? FIELD_BAD : FIELD_OK, className);
}

export interface PlInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Drawn inside the field on the start side (the frames' mail icon). */
  leading?: ReactNode;
}

export const PlInput = forwardRef<HTMLInputElement, PlInputProps>(function PlInput(
  { invalid, leading, className, ...props },
  ref
) {
  if (!leading) {
    return <input ref={ref} aria-invalid={invalid || undefined} className={plFieldClass(invalid, className)} {...props} />;
  }
  // `dir` goes on the wrapper too, so the icon and the room kept for it stay on the same side.
  return (
    <span className="relative flex items-center" dir={props.dir}>
      <span className="pointer-events-none absolute start-3 flex items-center text-[var(--pl-text-3)]">{leading}</span>
      <input ref={ref} aria-invalid={invalid || undefined} className={plFieldClass(invalid, clsx("ps-10", className))} {...props} />
    </span>
  );
});

export interface PlTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const PlTextarea = forwardRef<HTMLTextAreaElement, PlTextareaProps>(function PlTextarea(
  { invalid, className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={plFieldClass(invalid, clsx("h-auto resize-none py-3 leading-[1.4]", className))}
      {...props}
    />
  );
});

export interface PlSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/** A native select dressed as the frames' dropdown field: 40px, 12px radius,
 *  the 24px arrow-down on the end side. */
export const PlSelect = forwardRef<HTMLSelectElement, PlSelectProps>(function PlSelect(
  { invalid, className, children, ...props },
  ref
) {
  return (
    <span className="relative flex min-w-0 items-center">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={plFieldClass(invalid, clsx("pl-select cursor-pointer appearance-none pe-11 font-medium", className))}
        {...props}
      >
        {children}
      </select>
      <PlIcon name="chevron-24" className="pointer-events-none absolute end-3 text-[var(--pl-text-3)]" />
    </span>
  );
});

// ---- Notes -----------------------------------------------------------------

/** The blue tip strip under a step's body ("You can change your theme…"). */
export function PlInfoBanner({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("flex items-center gap-1 rounded-[8px] bg-[var(--pl-info-bg)] px-3 py-1 text-[var(--pl-primary-deep)]", className)}>
      <PlIcon name="info-circle" />
      <p className="min-w-0 flex-1 text-[14px] font-medium leading-[1.3]">{children}</p>
    </div>
  );
}

// ---- Device switch ---------------------------------------------------------

const DEVICE_ICON: Readonly<Record<PreviewDevice, { name: string; width: number; height: number }>> = {
  desktop: { name: "monitor", width: 24, height: 24 },
  tablet: { name: "tablet", width: 24, height: 24 },
  mobile: { name: "mobile", width: 16, height: 20 },
};

/** The joined desktop / tablet / mobile buttons. `size="md"` is the Live
 *  Preview header's (50×40, 24px icons); `"sm"` is a theme card's (32×32). */
export function PlDeviceSwitch({
  devices,
  value,
  onChange,
  label,
  size = "md",
}: {
  devices: readonly PreviewDevice[];
  /** null: none of them is the active one (a card that is not selected). */
  value: PreviewDevice | null;
  onChange: (device: PreviewDevice) => void;
  label: (device: PreviewDevice) => string;
  size?: "md" | "sm";
}) {
  const md = size === "md";
  return (
    <div className="flex shrink-0 items-stretch">
      {devices.map((id, index) => {
        const on = value === id;
        const icon = DEVICE_ICON[id];
        const scale = md ? 1 : 2 / 3;
        return (
          <button
            key={id}
            type="button"
            aria-label={label(id)}
            aria-pressed={on}
            onClick={() => onChange(id)}
            className={clsx(
              "relative grid place-items-center border bg-[var(--pl-primary-soft)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0D6EFD]/40",
              md ? "h-10 w-[50px]" : "h-8 w-8",
              // Neighbours share one 1px line, as the frame draws them.
              index > 0 && "-ms-px",
              index === 0 && (md ? "rounded-s-[12px]" : "rounded-s-[4px]"),
              index === devices.length - 1 && (md ? "rounded-e-[12px]" : "rounded-e-[4px]"),
              on ? "z-[1] border-[var(--pl-primary)] text-[var(--pl-primary)]" : "border-[var(--pl-g300)] text-[var(--pl-text)]"
            )}
          >
            <PlIcon name={icon.name} width={icon.width * scale} height={icon.height * scale} />
          </button>
        );
      })}
    </div>
  );
}
