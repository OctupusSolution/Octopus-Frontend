// apps/merchant/src/pages/customers/_shared/phone-field.tsx
import { FIELD_BORDER } from "./form-controls";

// Multi-colour artwork from the frame, so it is an <img> rather than a mask.
const FLAG_URL = new URL("../../../../../assets/Dashboard/icons/form-flag-sa.png", import.meta.url).href;

export function SaudiFlag({ size = 20 }: { size?: number }) {
  return <img src={FLAG_URL} alt="" aria-hidden="true" width={size} height={size} className="shrink-0 object-cover" style={{ width: size, height: size }} />;
}

export function phoneDigitsFrom(phone: string): string {
  return phone.startsWith("+966") ? phone.slice(4) : phone;
}

export function combinePhone(digits: string): string {
  return `+966${digits}`;
}

export function PhoneField({ digits, onChange }: { digits: string; onChange: (digits: string) => void }) {
  return (
    <div
      className={`flex h-10 items-center rounded-[12px] ${FIELD_BORDER} bg-[var(--octo-card)] px-3 transition-colors focus-within:border-[#0D6EFD] focus-within:ring-2 focus-within:ring-[#0D6EFD]/25 [[data-theme=dark]_&]:focus-within:border-[#0D6EFD]`}
    >
      <span dir="ltr" className="flex shrink-0 items-center gap-2 text-[14px] leading-none text-[var(--octo-text-primary)]">
        <SaudiFlag size={24} />
        +966
      </span>
      <input
        dir="ltr"
        inputMode="tel"
        value={digits}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        placeholder="000 000 000"
        className="ms-1 h-[30px] w-full min-w-0 flex-1 border-s border-[#cbd5e1] bg-transparent px-2 text-[14px] leading-none text-[var(--octo-text-primary)] outline-none placeholder:text-[var(--octo-text-secondary)] rtl:text-end [[data-theme=dark]_&]:border-[var(--octo-border-input)]"
      />
    </div>
  );
}
