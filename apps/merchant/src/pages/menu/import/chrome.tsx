// The pieces all three import screens share, drawn from the "Create menu by
// AI" frames: the title row with its date and branch chips, the three-step
// rail (Menu Upload → Review& Edit Menu → Publish), the Cancel / Save Draft /
// Next Step footer, the stat tiles, the legend and the confidence pills.
//
// Kept together because they are one visual system — the frames reuse the same
// tile, pill and footer on every screen — and a change to one should be seen
// next to the others.
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { ArrowRight, ChevronRight, Save, Sparkles } from "lucide-react";
import { SEED_BRANCHES } from "@/entities/menu";
import { bandFor, type Band, type DetectionSummary } from "@/entities/menu/ai-import";
import { useI18n } from "@/app/providers/i18n-provider";
import { StatusPill } from "../_shared/controls";
import { MenuIcon } from "../_shared/menu-icon";
import {
  BIG_BUTTON,
  BIG_PRIMARY,
  LINE,
  PAGE_TITLE,
  PILL_TONE,
  SURFACE_BLUE,
  SURFACE_SUBTLE,
  TEXT,
  TEXT_GRAY,
  TEXT_SECONDARY,
  type PillTone,
} from "../_shared/theme";
import { AI, outlineButton } from "./ai-style";

/** The frames' rounded cards: 24px radius, the grey outline, 12px padding. */
export const IMPORT_CARD = `rounded-[24px] border ${LINE} p-3`;
/** The preview card floats on a soft shadow instead of an outline. */
export const IMPORT_FLOAT_CARD =
  "rounded-[24px] bg-[var(--octo-card)] p-4 shadow-[0px_0px_8px_0px_rgba(0,0,0,0.05)] [[data-theme=dark]_&]:border [[data-theme=dark]_&]:border-[var(--octo-border-card)]";

/* --------------------------------------------------------------------- shell */

const STEP_KEYS = ["menuAi.stepper.upload", "menuAi.stepper.review", "menuAi.stepper.publish"] as const;

/** The three-node rail. Steps behind the current one are filled (the first in
 *  the brand gradient), the current one is ringed, the ones ahead are grey. */
export function ImportStepper({ current, onStep }: { current: 1 | 2 | 3; onStep?: (step: number) => void }) {
  const { t } = useI18n();
  return (
    <ol aria-label={t("menuAi.stepper.label")} className="relative flex items-start justify-between">
      <li
        aria-hidden
        className={clsx("absolute end-[31px] start-[47px] top-[11px] h-[2px] overflow-hidden rounded-full", SURFACE_SUBTLE)}
      >
        <span className={clsx("absolute inset-y-0 start-0 bg-[#0D6EFD]", current === 3 ? "w-full" : "w-1/2")} />
      </li>
      {STEP_KEYS.map((key, index) => {
        const n = index + 1;
        const done = n < current;
        const here = n === current;
        const circle = clsx(
          "grid size-6 place-items-center rounded-full text-[12px] font-semibold leading-3",
          done
            ? index === 0
              ? "bg-[linear-gradient(135deg,#0d6efd_0%,#6c4dff_100%)] text-white"
              : "bg-[#0D6EFD] text-white"
            : here
              ? clsx("border border-[#0D6EFD] text-[#0D6EFD]", SURFACE_SUBTLE)
              : clsx(SURFACE_SUBTLE, TEXT_GRAY)
        );
        return (
          <li key={key} className="relative flex flex-col items-center gap-2">
            {done && onStep ? (
              <button type="button" onClick={() => onStep(n)} className={circle}>
                {n}
              </button>
            ) : (
              <span aria-current={here ? "step" : undefined} className={circle}>
                {n}
              </span>
            )}
            <span
              className={clsx(
                "whitespace-nowrap text-center text-[14px] font-medium leading-[14px]",
                done || here ? "text-[#0058da] [[data-theme=dark]_&]:text-[#8ab8ff]" : TEXT_GRAY
              )}
            >
              {t(key)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Title, subtitle and the two chips every frame carries on the end side:
 *  today's date, and the branch with a way to change it. */
function ImportHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 max-w-[636px] flex-col gap-3">
        <h1 className={PAGE_TITLE}>{title}</h1>
        <p className={clsx("text-[14px] font-medium leading-[1.4]", TEXT_SECONDARY)}>{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={clsx(
            "inline-flex items-center gap-2 rounded-[4px] p-2 text-[14px] font-medium leading-[14px] text-[#16161d] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]",
            SURFACE_SUBTLE
          )}
        >
          <MenuIcon name="menu-calendar.svg" size={24} />
          {today}
        </span>
        <span className={clsx("inline-flex h-10 items-center gap-6 rounded-[8px] p-2", SURFACE_SUBTLE)}>
          <span className={clsx("inline-flex items-center gap-1 text-[14px] font-medium leading-[14px]", TEXT)}>
            <MenuIcon name="menu-location.svg" size={24} />
            {SEED_BRANCHES[0].label}
          </span>
          <button
            type="button"
            onClick={() => navigate("/settings/branches")}
            className="text-[14px] font-bold leading-[14px] text-[#0D6EFD] underline"
          >
            {t("menuWiz.changeBranch")}
          </button>
        </span>
      </div>
    </header>
  );
}

export function ImportShell({
  step,
  title,
  subtitle,
  onStep,
  footer,
  children,
}: {
  step: 1 | 2 | 3;
  title: string;
  subtitle: string;
  onStep?: (step: number) => void;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col gap-6 px-4 pb-10 pt-6 sm:px-6 lg:ps-12 lg:pt-8">
      <div className="flex flex-1 flex-col gap-8">
        <ImportHeader title={title} subtitle={subtitle} />
        <ImportStepper current={step} onStep={onStep} />
        {children}
      </div>
      {footer}
    </div>
  );
}

/** Cancel / Save Draft / Next Step. All three stay enabled: a step that
 *  cannot continue says why when it is pressed. */
export function ImportFooter({
  onCancel,
  onSaveDraft,
  onNext,
}: {
  onCancel: () => void;
  onSaveDraft: () => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  return (
    <footer className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <button type="button" onClick={onCancel} className={clsx(BIG_BUTTON, "w-full sm:w-[171px]", SURFACE_SUBTLE, TEXT_GRAY, "hover:brightness-95")}>
        {t("menuAi.cancel")}
      </button>
      <button type="button" data-save-draft onClick={onSaveDraft} className={clsx(BIG_BUTTON, "w-full sm:w-auto sm:flex-1", SURFACE_BLUE, TEXT, "hover:brightness-95")}>
        {t("menuAi.saveDraft")}
      </button>
      <button type="button" data-next-step onClick={onNext} className={clsx(BIG_PRIMARY, "w-full gap-2 lg:w-[calc(50%-12px)]")}>
        {t("menuAi.nextStep")}
        <MenuIcon name="menu-arrow-right.svg" size={24} className="rtl:-scale-x-100" />
      </button>
    </footer>
  );
}

/* ------------------------------------------------------------------- pieces */

/** "① Upload your Menu" — the numbered heading of an upload-screen card. */
export function StepHeading({ n, title, suffix }: { n: number; title: string; suffix?: string }) {
  return (
    <h2 className={clsx("flex items-center gap-2 text-[16px] font-bold leading-4", TEXT)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#0D6EFD] text-[14px] font-semibold leading-[14px] text-white">
        {n}
      </span>
      <span>
        {title}
        {suffix && <span className="ms-1 text-[12px] font-normal leading-3">{suffix}</span>}
      </span>
    </h2>
  );
}

const TILES = [
  { key: "sections", icon: "menu-sections-detected.svg", tint: "bg-[#f5f9ff] text-[#0D6EFD]", label: "menuAi.stat.sectionsDetected" },
  { key: "items", icon: "menu-food-24.svg", tint: "bg-[#fcf5ff] text-[#7900ad]", label: "menuAi.stat.itemsDetected" },
  { key: "high", icon: "menu-check-done-outline.svg", tint: "bg-[#dcffef] text-[#009a39]", label: "menuAi.stat.high" },
  { key: "needReview", icon: "menu-error.svg", tint: "bg-[#fff2db] text-[#f59e0b]", label: "menuAi.stat.needReview" },
] as const;

const TILE_DARK: Record<(typeof TILES)[number]["key"], string> = {
  sections: "[[data-theme=dark]_&]:bg-[#0d6efd]/15",
  items: "[[data-theme=dark]_&]:bg-[#7900ad]/20 [[data-theme=dark]_&]:text-[#c98bff]",
  high: "[[data-theme=dark]_&]:bg-[#009a39]/15",
  needReview: "[[data-theme=dark]_&]:bg-[#f59e0b]/15",
};

/** The four detection counts. `stacked` puts the icon above the number (upload
 *  and review screens); `inline` puts it beside (edit screen); `roomy` is the
 *  review summary's wider padding. */
export function StatTiles({
  summary,
  layout,
  onNeedReview,
}: {
  summary: Pick<DetectionSummary, "sections" | "items" | "high" | "needReview"> | null;
  layout: "stacked" | "roomy" | "inline";
  /** Makes the "Need Review" tile a shortcut to the first such item. */
  onNeedReview?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-4">
      {TILES.map((tile) => {
        const body = (
          <>
            <span className={clsx("grid size-8 shrink-0 place-items-center rounded-full", tile.tint, TILE_DARK[tile.key])} aria-hidden>
              <MenuIcon name={tile.icon} size={24} />
            </span>
            <span className="flex flex-col items-start gap-1 whitespace-nowrap">
              <span className={clsx("text-[16px] font-semibold leading-4 tabular-nums", TEXT)}>{summary?.[tile.key] ?? 0}</span>
              <span className={clsx("text-[12px] font-medium leading-[1.4]", TEXT_GRAY)}>{t(tile.label)}</span>
            </span>
          </>
        );
        const className = clsx(
          "flex shrink-0 rounded-[8px] border text-start",
          LINE,
          layout === "inline" ? "items-center gap-1 p-1 pe-[5px]" : "flex-col items-start gap-1",
          layout === "stacked" && "p-1 pe-[5px]",
          layout === "roomy" && "px-3 py-1"
        );
        return tile.key === "needReview" && onNeedReview ? (
          <button key={tile.key} type="button" onClick={onNeedReview} className={clsx(className, "hover:bg-[var(--octo-hover)]")}>
            {body}
          </button>
        ) : (
          <div key={tile.key} className={className}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/** The grey strip with the circled "!" — "Nothing is live until you publish". */
export function InfoStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={clsx("flex items-center gap-1 rounded-[12px] p-2 text-[12px] font-medium leading-[1.4]", SURFACE_SUBTLE, TEXT, className)}>
      <MenuIcon name="menu-error.svg" size={24} />
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}

/** The three dashed swatches under every paper preview. */
export function PaperLegend() {
  const { t } = useI18n();
  const entries = [
    { border: "border-[#009a39]", label: t("menuAi.legend.high") },
    { border: "border-[#f59e0b]", label: t("menuAi.legend.needsReview") },
    { border: "border-[#64748b]", label: t("menuAi.legend.section") },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3">
      {entries.map((entry) => (
        <span key={entry.label} className={clsx("inline-flex items-center gap-2 text-[12px] font-medium leading-3", TEXT)}>
          <span className={clsx("h-[13px] w-[47px] shrink-0 border-2 border-dashed", entry.border)} aria-hidden />
          {entry.label}
        </span>
      ))}
    </div>
  );
}

const BAND_PILL: Record<Band, { tone: PillTone; className?: string }> = {
  high: { tone: "green" },
  // The frames' amber here is the darker #de9000, not the pill kit's #ffb020.
  medium: { tone: "amber", className: "!text-[#de9000]" },
  low: { tone: "red" },
};

/** "99%" — the table's dotless confidence pill. */
export function ConfidencePill({ value, className }: { value: number; className?: string }) {
  const band = BAND_PILL[bandFor(value)];
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center rounded-full px-2 py-1 text-[12px] font-medium leading-3 tabular-nums",
        PILL_TONE[band.tone],
        band.className,
        className
      )}
    >
      {value}%
    </span>
  );
}

/** "• High" — the table's status pill; a confirmed item reads "Reviewed". */
export function BandPill({ band, reviewed }: { band: Band; reviewed?: boolean }) {
  const { t } = useI18n();
  if (reviewed) return <StatusPill tone="blue">{t("menuAi.status.reviewed")}</StatusPill>;
  return (
    <StatusPill tone={BAND_PILL[band].tone} className={BAND_PILL[band].className}>
      {t(`menuAi.band.${band}`)}
    </StatusPill>
  );
}

/* ------------------------------------------------------------------- legacy */
// Drawn before the frames were finalised and no longer rendered by the three
// screens; kept (not deleted) so the entry points can come back without a
// rewrite. SummaryModal still uses StatIcon.

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

/** Dashed swatch + label, the legend's earlier drawing. */
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

