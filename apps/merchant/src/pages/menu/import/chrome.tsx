// The pieces all three import screens share: breadcrumb, title row, the save /
// next pair, confidence pills, stat tiles, legends.
//
// Kept together because they are one visual system — the frames reuse the same
// pill, the same stat tile and the same indigo CTA on every screen — and a
// change to one should be seen next to the others.
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { ArrowRight, ChevronRight, Save, Sparkles } from "lucide-react";
import { bandFor, type Band } from "@/entities/menu/ai-import";
import { useI18n } from "@/app/providers/i18n-provider";
import { AI, BAND_TONE, outlineButton } from "./ai-style";

export function Breadcrumb({ current, trail = [] }: { current: string; trail?: { label: string; to: string }[] }) {
  const { t } = useI18n();
  const links = [
    { label: t("menuAi.crumb.menu"), to: "/menu" },
    { label: t("menuAi.crumb.new"), to: "/menu/new" },
    ...trail,
  ];
  return (
    <nav aria-label={t("menuAi.crumb.label")} className="flex flex-wrap items-center gap-1.5 text-[13px]">
      {links.map((link) => (
        <span key={link.to} className="inline-flex items-center gap-1.5">
          <Link to={link.to} className={clsx("font-medium hover:underline", AI.text)}>
            {link.label}
          </Link>
          <ChevronRight size={14} className="text-[var(--octo-text-faint)] rtl:rotate-180" aria-hidden />
        </span>
      ))}
      <span aria-current="page" className="font-medium text-[var(--octo-text-primary)]">
        {current}
      </span>
    </nav>
  );
}

export function PageTitle({
  title,
  subtitle,
  variant,
  actions,
}: {
  title: string;
  subtitle: string;
  /** "sparkles" leads with the icon (upload); "badge" trails an AI chip. */
  variant: "sparkles" | "badge";
  actions?: ReactNode;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-start justify-between gap-3 lg:flex-nowrap">
      <div className="min-w-0">
        <h1 className="flex flex-wrap items-center gap-3 text-[26px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[30px]">
          {variant === "sparkles" && <Sparkles size={30} className="text-[var(--octo-text-primary)]" aria-hidden />}
          {title}
          {variant === "badge" && (
            <span className={clsx("rounded-[8px] px-2 py-0.5 text-[16px] font-bold", AI.soft, AI.text)}>AI</span>
          )}
        </h1>
        <p className="mt-1.5 text-[14px] text-[var(--octo-text-secondary)]">{subtitle}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function SaveDraftButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  const { t } = useI18n();
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={clsx(outlineButton, "h-11 px-4 text-[14px]")}>
      <Save size={17} aria-hidden />
      {t("menuAi.saveDraft")}
    </button>
  );
}

export function NextButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex h-11 items-center justify-center gap-3 rounded-[8px] px-5 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        AI.solid
      )}
    >
      {label}
      <ArrowRight size={18} className="rtl:rotate-180" aria-hidden />
    </button>
  );
}

export function ConfidencePill({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex min-w-[46px] items-center justify-center rounded-[6px] px-2 py-1 text-[12px] font-semibold tabular-nums",
        BAND_TONE[bandFor(value)].pill,
        className
      )}
    >
      {value}%
    </span>
  );
}

export function BandPill({ band, reviewed }: { band: Band; reviewed?: boolean }) {
  const { t } = useI18n();
  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center rounded-[6px] px-2 py-1 text-[12px] font-semibold",
        reviewed ? clsx(AI.soft, AI.text) : BAND_TONE[band].pill
      )}
    >
      {reviewed ? t("menuAi.status.reviewed") : t(`menuAi.band.${band}`)}
    </span>
  );
}

export type StatTone = "violet" | "success" | "warning";

const STAT_TONE: Record<StatTone, string> = {
  violet: clsx(AI.soft, AI.text),
  success: "bg-[var(--octo-tone-success-bg)] text-[var(--octo-tone-success-text)]",
  warning: "bg-[var(--octo-tone-warning-bg)] text-[var(--octo-tone-warning-text)]",
};

export function StatIcon({ tone, children, size = 40 }: { tone: StatTone; children: ReactNode; size?: number }) {
  return (
    <span
      className={clsx("inline-flex shrink-0 items-center justify-center rounded-full", STAT_TONE[tone])}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {children}
    </span>
  );
}

/** Dashed swatch + label, the legend under every paper preview. */
export function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-[var(--octo-text-secondary)]">
      <span className={clsx("h-4 w-7 rounded-[4px] border-2 border-dashed", className)} aria-hidden />
      {label}
    </span>
  );
}

export function SectionCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={clsx("rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]", className)}>
      {children}
    </section>
  );
}
