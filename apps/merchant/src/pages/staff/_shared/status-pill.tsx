import clsx from "clsx";

export type PillTone = "success" | "neutral" | "danger" | "warning" | "info";

// The frames' status chip ("Component 3"): a 5px dot and 12px medium text on
// a pastel pill. Only the green is drawn; the other tones follow its recipe
// with the pastels the frames use for the same meaning elsewhere.
const TONES: Record<PillTone, string> = {
  success: "bg-[#dcffef] text-[#009a39] [[data-theme=dark]_&]:bg-[#009a39]/20 [[data-theme=dark]_&]:text-[#4ade80]",
  neutral: "bg-[#f1f5f9] text-[#58606c] [[data-theme=dark]_&]:bg-[var(--octo-tone-slate-bg)] [[data-theme=dark]_&]:text-[var(--octo-tone-slate-text)]",
  danger: "bg-[#fef0f0] text-[#d30202] [[data-theme=dark]_&]:bg-[#d30202]/20 [[data-theme=dark]_&]:text-[#f87171]",
  warning: "bg-[#fff5e4] text-[#f59e0b] [[data-theme=dark]_&]:bg-[#f59e0b]/15",
  info: "bg-[#f5f9ff] text-[#0058da] [[data-theme=dark]_&]:bg-[#0d6efd]/15 [[data-theme=dark]_&]:text-[#5b9dff]",
};

export function StatusPill({ tone, label, className }: { tone: PillTone; label: string; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[12px] font-medium leading-3", TONES[tone], className)}>
      <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-current" />
      {label}
    </span>
  );
}
