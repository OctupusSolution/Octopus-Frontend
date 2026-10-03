// apps/merchant/src/pages/orders-list/_shared/form-bits.tsx
import type { ReactNode } from "react";

/** The action modals label their fields in plain sentence case at body size —
 *  not the tiny uppercase treatment `@ui/primitives` puts on its own `label`
 *  prop — so the fields here take this instead of that prop. */
export function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={`mb-2 text-[13.5px] font-medium text-[var(--octo-text-primary)] ${className ?? ""}`}>{children}</p>
  );
}

/** The tinted "Refund Amount: SAR 186.00" strip the refund frames use, above
 *  the amount field for cash and below the note for everything else. */
export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] bg-[#0D6EFD]/[0.05] px-4 py-3 text-[13px]">
      <span className="text-[var(--octo-text-secondary)]">{label}</span>
      <span className="text-[15px] font-bold text-[#0D6EFD]">{value}</span>
    </div>
  );
}

/** Every action modal's primary CTA is the same full-width blue button in
 *  every frame, whatever colour that action carries elsewhere. */
export function PrimaryButton({
  label,
  disabled,
  onClick,
  className,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-[10px] bg-[#0D6EFD] py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
    >
      {label}
    </button>
  );
}
