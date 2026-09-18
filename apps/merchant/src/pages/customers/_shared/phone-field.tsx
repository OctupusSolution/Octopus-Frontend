// apps/merchant/src/pages/customers/_shared/phone-field.tsx
export function SaudiFlag({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#006C35" />
      <path d="M6 9.2h12M6.8 11h10.4" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" strokeDasharray="1.6 1" />
      <path d="M7 14.6h9.6l1.2-.8" stroke="#fff" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function phoneDigitsFrom(phone: string): string {
  return phone.startsWith("+966") ? phone.slice(4) : phone;
}

export function combinePhone(digits: string): string {
  return `+966${digits}`;
}

export function PhoneField({ digits, onChange }: { digits: string; onChange: (digits: string) => void }) {
  return (
    <div className="flex h-10 items-stretch rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] transition-colors focus-within:border-[#0D6EFD] focus-within:ring-2 focus-within:ring-[#0D6EFD]/30">
      <span dir="ltr" className="flex items-center gap-1.5 border-e border-[var(--octo-border-input)] px-3 text-[14px] text-[var(--octo-text-primary)]">
        <SaudiFlag />
        +966
      </span>
      <input
        dir="ltr"
        inputMode="tel"
        value={digits}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        placeholder="000 000 000"
        className="w-full flex-1 rounded-e-[8px] bg-transparent px-3 text-[14px] text-[var(--octo-text-primary)] outline-none placeholder:text-[var(--octo-text-muted)] rtl:text-end"
      />
    </div>
  );
}
