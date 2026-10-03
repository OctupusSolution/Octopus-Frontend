// The tall, marketing-scale input the auth frames use — 56px, rounded, with a
// leading glyph and an optional visibility toggle. Deliberately NOT the shared
// `Input` primitive: that one is sized for dense console tables (12.5px type,
// 34px tall) and stretching it to fit here would distort every other screen.
import { useId, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";

export function AuthField({
  label,
  icon,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
  autoFocus,
}: {
  label: string;
  icon: ReactNode;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  const { t } = useI18n();
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[15px] font-medium text-[var(--octo-text-primary)]">
        {label}
      </label>
      <div className="relative flex items-center">
        <span className="pointer-events-none absolute start-4 flex text-[#9AA4B2]" aria-hidden="true">
          {icon}
        </span>
        <input
          id={id}
          type={isPassword && !revealed ? "password" : type === "password" ? "text" : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          className={clsx(
            "h-[54px] w-full rounded-xl border bg-[var(--octo-card)] ps-12 text-[15px] text-[var(--octo-text-primary)] transition-colors",
            "placeholder:text-[#9AA4B2] focus:outline-none focus:ring-4 focus:ring-ocean-blue/15",
            isPassword ? "pe-12" : "pe-4",
            error ? "border-[#EF4444] focus:border-[#EF4444]" : "border-[var(--octo-border-input)] focus:border-ocean-blue"
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={t(revealed ? "common.hidePassword" : "common.showPassword")}
            className="absolute end-4 flex text-[#9AA4B2] transition-colors hover:text-[var(--octo-text-secondary)]"
          >
            {revealed ? <Eye size={19} /> : <EyeOff size={19} />}
          </button>
        )}
      </div>
      {error && <p className="text-[12.5px] text-[#EF4444]">{error}</p>}
    </div>
  );
}

/** The full-width blue action button both auth forms and every dialog end on. */
export function AuthButton({
  children,
  type = "submit",
  onClick,
  disabled,
}: {
  children: ReactNode;
  type?: "submit" | "button";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="h-[54px] w-full rounded-xl bg-ocean-blue text-[16px] font-semibold text-white transition-colors hover:bg-[#0B5ED7] focus:outline-none focus:ring-4 focus:ring-ocean-blue/25 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}
