// Screen 1 — "AI Menu Upload & Processing".
//
// One page, three numbered cards and a live preview, because the frame shows
// them all at once: the merchant watches the file arrive, the reader work, and
// the menu assemble itself, without being moved between pages. Every moving
// part reads the same `detectionProgress` value, so the bar, the checklist, the
// counts and the boxes on the paper can never disagree.
import { useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  FileText,
  Info,
  LayoutGrid,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { summarize } from "@/entities/menu/ai-import";
import { DETECTION_STEPS, detectionProgress, type StepState } from "@/entities/menu/ai-import-mock";
import { useDocumentPicker } from "@/shared/ui/use-document-picker";
import { useI18n } from "@/app/providers/i18n-provider";
import { AI, OCTOPUS_ART, card, fill, formatBytes, outlineButton, tintedButton } from "./ai-style";
import { Breadcrumb, LegendSwatch, NextButton, PageTitle, SaveDraftButton, StatIcon, type StatTone } from "./chrome";
import { PaperMenu } from "./paper-menu";
import { resetImport, startImport, useImportSession } from "./session-store";
import { useCommitImport } from "./use-commit";

function StepHeading({ n, title, suffix }: { n: number; title: string; suffix?: string }) {
  return (
    <h2 className="flex items-center gap-2.5 text-[16px] font-semibold text-[var(--octo-text-primary)]">
      <span className={clsx("inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold", AI.solid)}>
        {n}
      </span>
      {title}
      {suffix && <span className="text-[14px] font-medium text-[var(--octo-text-secondary)]">{suffix}</span>}
    </h2>
  );
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--octo-tone-success-text)] text-white">
        <Check size={12} strokeWidth={3} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={clsx(
        "inline-block h-[18px] w-[18px] rounded-full border-2 border-dashed",
        state === "active"
          ? clsx(AI.border, "animate-spin [animation-duration:2.4s] motion-reduce:animate-none")
          : "border-[var(--octo-crumb)]"
      )}
      aria-hidden
    />
  );
}

export function UploadScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const session = useImportSession();
  const { ready, commit } = useCommitImport();
  const picker = useDocumentPicker(startImport);

  const { file, phase, result } = session;
  const processing = phase === "processing" || phase === "done";
  const progress = result && processing ? detectionProgress(session.processingMs, result) : null;
  // Once done, counts follow the merchant's edits rather than the replay.
  const summary = phase === "done" && result ? summarize(result) : progress?.summary ?? null;
  const steps: StepState[] = progress?.steps ?? DETECTION_STEPS.map(() => "pending");
  const percent = progress?.percent ?? 0;

  const tiles: { tone: StatTone; icon: JSX.Element; value: number; label: string; sub?: string }[] = [
    { tone: "violet", icon: <LayoutGrid size={18} />, value: summary?.sections ?? 0, label: t("menuAi.stat.sectionsDetected") },
    { tone: "violet", icon: <ListChecks size={18} />, value: summary?.items ?? 0, label: t("menuAi.stat.itemsDetected") },
    { tone: "success", icon: <ShieldCheck size={18} />, value: summary?.high ?? 0, label: t("menuAi.stat.high"), sub: `(${summary?.highPct ?? 0}%)` },
    { tone: "warning", icon: <AlertTriangle size={18} />, value: summary?.needReview ?? 0, label: t("menuAi.stat.needReview"), sub: `(${summary?.reviewPct ?? 0}%)` },
  ];

  const typeLabel = file ? (file.type === "application/pdf" ? "PDF" : file.type === "image/png" ? "PNG" : "JPG") : "";
  const errorText = picker.error ? t(`menuAi.docError.${picker.error}`) : null;

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
        <Breadcrumb current={t("menuAi.crumb.upload")} />
        <PageTitle
          variant="sparkles"
          title={t("menuAi.upload.title")}
          subtitle={t("menuAi.upload.subtitle")}
          actions={
            <button
              type="button"
              onClick={() => {
                resetImport();
                navigate("/menu");
              }}
              className={clsx(outlineButton, "h-11 px-4 text-[14px]")}
            >
              <ArrowLeft size={17} className="rtl:rotate-180" aria-hidden />
              {t("menuAi.cancelToLibrary")}
            </button>
          }
        />

        {picker.input}

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            {/* 1 — Upload */}
            <section className={clsx(card, "p-5")}>
              <StepHeading n={1} title={t("menuAi.upload.step1")} />
              {!file ? (
                <div
                  {...picker.dropProps}
                  className={clsx(
                    "mt-4 flex flex-col items-center justify-center rounded-[12px] border-2 border-dashed px-4 py-8 text-center transition-colors",
                    picker.dragging ? clsx(AI.border, AI.soft) : "border-[var(--octo-ai-border)] bg-[var(--octo-soft-bg)]"
                  )}
                >
                  <StatIcon tone="violet" size={52}>
                    <Upload size={24} />
                  </StatIcon>
                  <p className="mt-3 text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("menuAi.upload.drop")}</p>
                  <p className="mt-1 text-[13px] text-[var(--octo-text-secondary)]">{t("menuAi.upload.or")}</p>
                  <button type="button" onClick={picker.open} className={clsx(AI.solid, "mt-2 inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-[13px] font-semibold")}>
                    <FileText size={16} aria-hidden />
                    {t("menuAi.upload.browse")}
                  </button>
                  <p className="mt-3 text-[12px] text-[var(--octo-text-muted)]">{t("menuAi.upload.accepts")}</p>
                  {errorText && (
                    <p role="alert" className="mt-2 text-[12.5px] font-medium text-[var(--octo-tone-danger-text)]">
                      {errorText}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div
                    {...picker.dropProps}
                    className={clsx(
                      "flex h-[132px] w-full shrink-0 items-center justify-center overflow-hidden rounded-[10px] border-2 border-dashed sm:w-[190px]",
                      AI.softBorder,
                      AI.soft,
                      picker.dragging && AI.border
                    )}
                  >
                    {file.previewUrl ? (
                      <img src={file.previewUrl} alt={file.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className={clsx("relative flex h-[84px] w-[66px] flex-col items-center justify-end rounded-[6px] pb-2", AI.solid)}>
                        <span className="absolute end-0 top-0 h-4 w-4 rounded-bl-[6px] bg-white/35" aria-hidden />
                        <FileText size={26} className="mb-1.5 opacity-90" aria-hidden />
                        <span className="text-[9px] font-bold tracking-wide">{typeLabel === "PDF" ? "MENU.PDF" : typeLabel}</span>
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-[var(--octo-text-primary)]" title={file.name}>
                      {file.name}
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--octo-text-secondary)]">
                      {typeLabel} • {formatBytes(file.size)}
                    </p>
                    {phase === "uploading" ? (
                      <div className="mt-2">
                        <p className={clsx("text-[13px] font-medium", AI.text)}>
                          {fill(t("menuAi.upload.uploading"), { pct: session.uploadPercent })}
                        </p>
                        <div className="mt-1.5 h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-[var(--octo-track)]">
                          <div className={clsx("h-full rounded-full transition-[width]", AI.fill)} style={{ width: `${session.uploadPercent}%` }} />
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--octo-tone-success-text)]">
                        <Check size={15} aria-hidden />
                        {t("menuAi.upload.complete")}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button type="button" onClick={picker.open} className={clsx(tintedButton, "h-9")}>
                        <RefreshCw size={15} aria-hidden />
                        {t("menuAi.upload.change")}
                      </button>
                      <button
                        type="button"
                        onClick={resetImport}
                        className="inline-flex h-9 items-center gap-2 rounded-[8px] px-3 text-[13px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
                      >
                        <Trash2 size={15} aria-hidden />
                        {t("menuAi.upload.remove")}
                      </button>
                    </div>
                    {errorText && (
                      <p role="alert" className="mt-2 text-[12.5px] font-medium text-[var(--octo-tone-danger-text)]">
                        {errorText}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* 2 — Processing */}
            <section className={clsx(card, "p-5")}>
              <StepHeading n={2} title={t("menuAi.upload.step2")} />
              <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <div className="min-w-0">
                  <p className="text-[13px] text-[var(--octo-text-secondary)]">
                    {phase === "done"
                      ? t("menuAi.proc.done")
                      : phase === "processing"
                        ? t("menuAi.proc.analyzing")
                        : phase === "uploading"
                          ? t("menuAi.proc.waitUpload")
                          : t("menuAi.proc.waitFile")}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent}
                      aria-label={t("menuAi.upload.step2")}
                      className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--octo-track)]"
                    >
                      <div className={clsx("h-full rounded-full transition-[width] duration-100", AI.fill)} style={{ width: `${percent}%` }} />
                    </div>
                    <span className="w-10 text-end text-[13px] font-medium tabular-nums text-[var(--octo-text-primary)]">{percent}%</span>
                  </div>
                  <ul className="mt-4 space-y-2.5">
                    {DETECTION_STEPS.map((step, i) => (
                      <li key={step} className="flex items-center gap-2.5 text-[13px] text-[var(--octo-text-primary)]">
                        <StepIcon state={steps[i]} />
                        <span className={clsx(steps[i] === "pending" && "text-[var(--octo-text-secondary)]")}>
                          {t(`menuAi.step.${step}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="relative flex h-[140px] w-full max-w-[260px] items-center justify-center">
                    <span className={clsx("absolute h-[120px] w-[120px] rounded-full blur-2xl", AI.soft)} aria-hidden />
                    <span className="absolute start-2 top-6 h-8 w-14 rounded-[6px] border border-[var(--octo-ai-border)] bg-[var(--octo-card)] shadow-sm" aria-hidden />
                    <span className="absolute end-3 top-2 h-9 w-16 rounded-[6px] border border-[var(--octo-ai-border)] bg-[var(--octo-card)] shadow-sm" aria-hidden />
                    <span className="absolute bottom-5 end-0 h-8 w-14 rounded-[6px] border border-[var(--octo-ai-border)] bg-[var(--octo-card)] shadow-sm" aria-hidden />
                    <img
                      src={OCTOPUS_ART}
                      alt=""
                      className={clsx(
                        "relative h-[118px] w-auto object-contain",
                        phase === "processing" && "animate-pulse [animation-duration:2.2s] motion-reduce:animate-none"
                      )}
                    />
                  </div>
                  <p className="mt-2 max-w-[260px] text-[12px] leading-relaxed text-[var(--octo-text-secondary)]">
                    {t("menuAi.proc.caption")}
                  </p>
                </div>
              </div>
            </section>

            {/* 3 — Summary */}
            <section className={clsx(card, "p-5")}>
              <StepHeading n={3} title={t("menuAi.upload.step3")} suffix={t("menuAi.upload.live")} />
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {tiles.map((tile) => (
                  <div key={tile.label} className="flex flex-col items-start gap-2 rounded-[10px] border border-[var(--octo-border-card)] p-3 2xl:flex-row 2xl:gap-3">
                    <StatIcon tone={tile.tone}>{tile.icon}</StatIcon>
                    <div className="min-w-0">
                      <p className="text-[20px] font-bold leading-tight tabular-nums text-[var(--octo-text-primary)]">{tile.value}</p>
                      <p className="text-[12.5px] leading-snug text-[var(--octo-text-secondary)]">
                        {tile.label}
                        {tile.sub && <span className="block">{tile.sub}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className={clsx("mt-4 flex items-start gap-2.5 rounded-[10px] px-4 py-3 text-[13px]", AI.soft, AI.text)}>
                <Info size={17} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  {t("menuAi.upload.reassure1")}
                  <br />
                  {t("menuAi.upload.reassure2")}
                </span>
              </p>
            </section>
          </div>

          {/* Preview */}
          <section className={clsx(card, "min-w-0 p-5")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">{t("menuAi.preview.title")}</h2>
                <p className="mt-1 text-[12.5px] text-[var(--octo-text-secondary)]">{t("menuAi.preview.subtitle")}</p>
              </div>
              <span className="shrink-0 rounded-[6px] bg-[var(--octo-tone-success-bg)] px-2 py-1 text-[11.5px] font-medium text-[var(--octo-tone-success-text)]">
                {t("menuAi.preview.live")}
              </span>
            </div>

            {result && processing ? (
              <PaperMenu
                className="mt-4"
                result={result}
                columns={2}
                maxItems={3}
                outlineSections
                revealed={phase === "done" ? undefined : progress?.revealed}
                revealedSections={phase === "done" ? undefined : progress?.revealedSections}
                onSelect={
                  phase === "done"
                    ? (id) => setSearchParams({ step: "review", item: id })
                    : undefined
                }
              />
            ) : (
              <div className="mt-4 flex min-h-[420px] flex-col items-center justify-center rounded-[10px] border-2 border-dashed border-[var(--octo-border-card)] bg-[var(--octo-soft-bg)] px-6 text-center">
                <FileText size={34} className="text-[var(--octo-text-faint)]" aria-hidden />
                <p className="mt-3 text-[14px] font-medium text-[var(--octo-text-primary)]">
                  {phase === "uploading" ? t("menuAi.preview.uploading") : t("menuAi.preview.emptyTitle")}
                </p>
                <p className="mt-1 max-w-[300px] text-[12.5px] text-[var(--octo-text-secondary)]">{t("menuAi.preview.emptyBody")}</p>
              </div>
            )}

            <div className="mt-4 inline-flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[10px] border border-[var(--octo-border-card)] px-4 py-2.5">
              <LegendSwatch className="border-[var(--octo-tone-success-border)]" label={t("menuAi.legend.high")} />
              <LegendSwatch className="border-[var(--octo-tone-warning-border)]" label={t("menuAi.legend.needsReview")} />
              <LegendSwatch className="border-[rgb(124_58_237/0.35)]" label={t("menuAi.legend.section")} />
            </div>
            <p className="mt-3 text-[12px] text-[var(--octo-text-secondary)]">
              {phase === "done" ? t("menuAi.preview.tipDone") : t("menuAi.preview.tip")}
            </p>
          </section>
        </div>
      </div>

      <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--octo-border-card)] bg-[var(--octo-app-bg)] px-4 py-3 sm:px-[26px]">
        <button type="button" onClick={() => navigate("/menu/new")} className={clsx(outlineButton, "h-11 min-w-[120px] px-4 text-[14px]")}>
          <ArrowLeft size={17} className="rtl:rotate-180" aria-hidden />
          {t("menuAi.back")}
        </button>
        <SaveDraftButton onClick={() => commit("draft")} disabled={!ready} />
        <div className="flex items-center gap-3">
          {phase === "done" && (
            <span className="hidden items-center gap-1.5 text-[12.5px] text-[var(--octo-tone-success-text)] md:inline-flex">
              <CheckCircle2 size={15} aria-hidden />
              {t("menuAi.proc.readyHint")}
            </span>
          )}
          <NextButton
            label={t("menuAi.upload.next")}
            disabled={!ready}
            onClick={() => setSearchParams({ step: "review" })}
          />
        </div>
      </footer>
    </div>
  );
}
