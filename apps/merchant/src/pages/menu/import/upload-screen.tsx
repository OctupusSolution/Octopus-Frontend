// Screen 1 — "AI Menu Upload & Processing".
//
// One page, three numbered cards and a live preview, because the frame shows
// them all at once: the merchant watches the file arrive, the reader work, and
// the menu assemble itself, without being moved between pages. Every moving
// part reads the same `detectionProgress` value, so the bar, the checklist, the
// counts and the boxes on the paper can never disagree.
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { summarize } from "@/entities/menu/ai-import";
import { DETECTION_STEPS, detectionProgress, type StepState } from "@/entities/menu/ai-import-mock";
import { useDocumentPicker } from "@/shared/ui/use-document-picker";
import { useI18n } from "@/app/providers/i18n-provider";
import { Field, StatusPill } from "../_shared/controls";
import { MenuIcon } from "../_shared/menu-icon";
import { LINE, SURFACE_BLUE, SURFACE_SUBTLE, TEXT, TEXT_GRAY } from "../_shared/theme";
import { fill, formatBytes } from "./ai-style";
import {
  IMPORT_CARD,
  IMPORT_FLOAT_CARD,
  ImportFooter,
  ImportShell,
  InfoStrip,
  PaperLegend,
  StatTiles,
  StepHeading,
} from "./chrome";
import { PaperMenu } from "./paper-menu";
import { resetImport, startImport, useImportSession } from "./session-store";
import { useCommitImport } from "./use-commit";

/** Parts of the earlier drawing that the frame does not show — the caption
 *  under the octopus and the tip under the legend. Hidden, not removed. */
const SHOW_UNFRAMED: boolean = false;

/** The frame's checklist has five lines; the reader's sixth step ("Detecting
 *  items & prices") still runs and still moves the bar, it is just not listed. */
const LISTED_STEPS = DETECTION_STEPS.map((step, index) => ({ step, index })).filter(
  ({ step }) => step !== "detectItems"
);

/** The blue AI octopus, cropped out of its wide artboard exactly as the frame
 *  crops it (the picture is 3× wider than the 201×203 window it shows through). */
const AI_OCTOPUS = new URL("../../../../../assets/Menu/menu-ai-octopus.png", import.meta.url).href;

function StepLine({ state, label }: { state: StepState; label: string }) {
  const done = state === "done";
  return (
    <li className={clsx("flex items-center gap-1 text-[14px] font-medium leading-[14px]", done ? TEXT : TEXT_GRAY)}>
      <MenuIcon
        name={done ? "menu-check-done-circle.svg" : "menu-loading.svg"}
        size={16}
        className={clsx(
          done ? "text-[#3b82f6]" : "text-[#64748b]",
          state === "active" && "animate-spin [animation-duration:1.6s] motion-reduce:animate-none"
        )}
      />
      {label}
    </li>
  );
}

export function UploadScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const session = useImportSession();
  const { ready, commit } = useCommitImport();
  const picker = useDocumentPicker(startImport);
  // Set by Next Step / Save Draft, so an untouched page never opens with an
  // error under the upload box.
  const [attempted, setAttempted] = useState(false);

  const { file, phase, result } = session;
  const processing = phase === "processing" || phase === "done";
  const progress = result && processing ? detectionProgress(session.processingMs, result) : null;
  // Once done, counts follow the merchant's edits rather than the replay.
  const summary = phase === "done" && result ? summarize(result) : progress?.summary ?? null;
  const steps: StepState[] = progress?.steps ?? DETECTION_STEPS.map(() => "pending");
  const percent = progress?.percent ?? 0;

  const typeLabel = file ? (file.type === "application/pdf" ? "PDF" : file.type === "image/png" ? "PNG" : "JPG") : "";
  const fieldError = picker.error
    ? t(`menuAi.docError.${picker.error}`)
    : attempted && !file
      ? t("menuAi.upload.required")
      : attempted && !ready
        ? t("menuAi.upload.wait")
        : null;

  /** Runs `then` only once there is a finished detection to carry forward. */
  function guarded(then: () => void) {
    if (!ready) {
      setAttempted(true);
      return;
    }
    then();
  }

  return (
    <ImportShell
      step={1}
      title={t("menuAi.upload.title")}
      subtitle={t("menuAi.upload.subtitle")}
      footer={
        <ImportFooter
          onCancel={() => {
            resetImport();
            navigate("/menu");
          }}
          onSaveDraft={() => guarded(() => void commit("draft"))}
          onNext={() => guarded(() => setSearchParams({ step: "review" }))}
        />
      }
    >
      {picker.input}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          {/* 1 — Upload */}
          <section className={clsx(IMPORT_CARD, "flex flex-col gap-4")}>
            <StepHeading n={1} title={t("menuAi.upload.step1")} />
            <Field label={t("menuAi.upload.field")} required error={fieldError}>
              <div
                {...picker.dropProps}
                className={clsx(
                  "flex min-h-[116px] flex-col justify-center rounded-[12px] border border-dashed p-2 transition-colors",
                  LINE,
                  picker.dragging && clsx("!border-[#0D6EFD]", SURFACE_BLUE),
                  fieldError && "!border-[#d30202]"
                )}
              >
                {!file ? (
                  <button
                    type="button"
                    data-upload-menu
                    onClick={picker.open}
                    className={clsx("flex w-full flex-1 flex-col items-center justify-center gap-3 rounded-[8px] text-[14px] leading-[14px]", TEXT_GRAY)}
                  >
                    <span className="grid size-6 place-items-center" aria-hidden>
                      <MenuIcon name="menu-upload.svg" size={21.5} />
                    </span>
                    {t("menuAi.upload.prompt")}
                  </button>
                ) : (
                  <div className="flex items-center gap-3 px-1">
                    <span className={clsx("grid size-12 shrink-0 place-items-center overflow-hidden rounded-[8px]", SURFACE_SUBTLE, TEXT_GRAY)}>
                      {file.previewUrl ? (
                        <img src={file.previewUrl} alt={file.name} className="size-full object-cover" />
                      ) : (
                        <span className="text-[12px] font-bold leading-3">{typeLabel}</span>
                      )}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <p className={clsx("truncate text-[14px] font-medium leading-[14px]", TEXT)} title={file.name}>
                        {file.name}
                      </p>
                      <p className={clsx("text-[12px] font-medium leading-3", TEXT_GRAY)}>
                        {typeLabel} • {formatBytes(file.size)} •{" "}
                        {phase === "uploading" ? (
                          <span className="text-[#0D6EFD]">{fill(t("menuAi.upload.uploading"), { pct: session.uploadPercent })}</span>
                        ) : (
                          <span className="text-[#009a39]">{t("menuAi.upload.complete")}</span>
                        )}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-[12px] font-bold leading-3">
                        <button type="button" onClick={picker.open} className="text-[#0D6EFD] underline">
                          {t("menuAi.upload.change")}
                        </button>
                        <button type="button" onClick={resetImport} className="text-[#d30202] underline">
                          {t("menuAi.upload.remove")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Field>
          </section>

          {/* 2 — Processing */}
          <section className={clsx(IMPORT_CARD, "flex flex-wrap items-center justify-between gap-4")}>
            <div className="flex min-w-0 flex-col gap-4">
              <StepHeading n={2} title={t("menuAi.upload.step2")} />
              <div className="flex w-full max-w-[279px] flex-col gap-3 sm:w-[279px]">
                <p className={clsx("text-[16px] font-medium leading-4", TEXT)}>
                  {phase === "done"
                    ? t("menuAi.proc.done")
                    : phase === "processing"
                      ? t("menuAi.proc.analyzing")
                      : phase === "uploading"
                        ? t("menuAi.proc.waitUpload")
                        : t("menuAi.proc.waitFile")}
                </p>
                <div className="flex items-center gap-2">
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    aria-label={t("menuAi.upload.step2")}
                    className={clsx("h-[6px] min-w-0 flex-1 overflow-hidden rounded-full", SURFACE_SUBTLE)}
                  >
                    <div className="h-full rounded-full bg-[#0D6EFD] transition-[width] duration-100" style={{ width: `${percent}%` }} />
                  </div>
                  <span className={clsx("text-[16px] font-medium leading-4 tabular-nums", TEXT)}>{percent}%</span>
                </div>
              </div>
              <ul className="flex flex-col gap-3">
                {LISTED_STEPS.map(({ step, index }) => (
                  <StepLine key={step} state={steps[index]} label={t(`menuAi.step.${step}`)} />
                ))}
              </ul>
            </div>
            <div className="mx-auto flex flex-col items-center sm:mx-0">
              <div className="relative h-[203px] w-[201px] shrink-0 overflow-hidden" aria-hidden>
                <img
                  src={AI_OCTOPUS}
                  alt=""
                  className={clsx(
                    "absolute left-[-99.7%] top-[-49.7%] h-[159.23%] w-[307.51%] max-w-none",
                    phase === "processing" && "animate-pulse [animation-duration:2.2s] motion-reduce:animate-none"
                  )}
                />
              </div>
              {SHOW_UNFRAMED && (
                <p className={clsx("mt-2 max-w-[260px] text-center text-[12px] leading-[1.4]", TEXT_GRAY)}>{t("menuAi.proc.caption")}</p>
              )}
            </div>
          </section>

          {/* 3 — Summary */}
          <section className={clsx(IMPORT_CARD, "flex flex-col gap-4")}>
            <StepHeading n={3} title={t("menuAi.upload.step3")} suffix={t("menuAi.upload.live")} />
            <StatTiles summary={summary} layout="stacked" />
          </section>

          <InfoStrip>{t("menuAi.upload.reassure")}</InfoStrip>
        </div>

        {/* Preview */}
        <section className={clsx(IMPORT_FLOAT_CARD, "flex min-w-0 flex-col gap-6")}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className={clsx("text-[16px] font-medium leading-4", TEXT)}>{t("menuAi.preview.title")}</h2>
              <p className={clsx("text-[12px] leading-[1.2]", TEXT_GRAY)}>{t("menuAi.preview.subtitle")}</p>
            </div>
            <StatusPill tone="green">{t("menuAi.preview.live")}</StatusPill>
          </div>

          {result && processing ? (
            <PaperMenu
              result={result}
              columns={2}
              maxItems={3}
              outlineSections
              revealed={phase === "done" ? undefined : progress?.revealed}
              revealedSections={phase === "done" ? undefined : progress?.revealedSections}
              onSelect={phase === "done" ? (id) => setSearchParams({ step: "review", item: id }) : undefined}
            />
          ) : (
            <div className={clsx("flex min-h-[420px] flex-col items-center justify-center gap-3 border border-dashed px-6 text-center", LINE)}>
              <MenuIcon name="menu-food-24.svg" size={24} className={TEXT_GRAY} />
              <p className={clsx("text-[14px] font-medium leading-[1.4]", TEXT)}>
                {phase === "uploading" ? t("menuAi.preview.uploading") : t("menuAi.preview.emptyTitle")}
              </p>
              <p className={clsx("max-w-[300px] text-[12px] leading-[1.4]", TEXT_GRAY)}>{t("menuAi.preview.emptyBody")}</p>
            </div>
          )}

          <PaperLegend />
          {SHOW_UNFRAMED && (
            <p className={clsx("text-[12px] leading-[1.4]", TEXT_GRAY)}>
              {phase === "done" ? t("menuAi.preview.tipDone") : t("menuAi.preview.tip")}
            </p>
          )}
        </section>
      </div>
    </ImportShell>
  );
}
