// Bulk text find & replace across the business's whole menu content:
// BACKEND_GAPS.md-adjacent (menu-admin "Bulk Editing" endpoints) — preview/
// execute were ready and wired nowhere, same as bulk-price-modal.tsx next to
// it. Business-wide, not per-menu — the API itself takes no menu/section
// scope for this one, unlike the price adjustment.
import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Checkbox, Input, Modal, Select } from "@ui/primitives";
import {
  ApiError,
  executeTextReplacement,
  previewTextReplacement,
  type TextReplacementPreviewResponse,
} from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { BulkHistory } from "./bulk-history";
import { useI18n } from "@/app/providers/i18n-provider";

const key = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

type Step = "form" | "preview" | "result";

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[13.5px] font-medium text-[var(--octo-text-primary)]">{children}</p>;
}

function PrimaryButton({
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
      className={`w-full rounded-[10px] bg-[#0D6EFD] py-3 text-[14.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
    >
      {label}
    </button>
  );
}

export function BulkTextModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { activeBusinessId } = useAuth();
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [term, setTerm] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [preview, setPreview] = useState<TextReplacementPreviewResponse | null>(null);
  const [resultCount, setResultCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep("form");
    setPreview(null);
    setError(null);
    setBusy(false);
  }

  function close() {
    reset();
    setTerm("");
    setReplacement("");
    setMatchCase(false);
    setWholeWord(false);
    onClose();
  }

  if (!open) return null;

  function describe(err: unknown): string {
    return err instanceof ApiError ? (err.problem?.detail ?? err.problem?.errorCode ?? err.message) : "Request failed";
  }

  const canPreview = Boolean(activeBusinessId && term.trim());

  async function runPreview() {
    if (!activeBusinessId || !canPreview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await previewTextReplacement(activeBusinessId, {
        businessId: activeBusinessId,
        language,
        term: term.trim(),
        replacement,
        matchCase,
        wholeWord,
      });
      setPreview(res);
      setStep("preview");
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!activeBusinessId || !preview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await executeTextReplacement(
        activeBusinessId,
        {
          businessId: activeBusinessId,
          language,
          term: term.trim(),
          replacement,
          matchCase,
          wholeWord,
          previewToken: preview.previewToken,
        },
        key()
      );
      setResultCount(res.changedFieldCount);
      setStep("result");
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={close} className="max-w-[520px]">
      <div className="flex items-center gap-2.5">
        <Search size={19} className="text-[var(--octo-text-secondary)]" />
        <h2 className="text-[18px] font-semibold text-[var(--octo-text-primary)]">{t("bulkText.title")}</h2>
      </div>
      <p className="mt-1 text-[13.5px] text-[var(--octo-text-secondary)]">{t("bulkText.subtitle")}</p>

      {error && (
        <p role="alert" className="mt-3 rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
          {error}
        </p>
      )}

      {step === "form" && (
        <div className="mt-4 space-y-4">
          <div>
            <FieldLabel>{t("bulkText.languageLabel")}</FieldLabel>
            <Select value={language} onChange={(e) => setLanguage(e.target.value as "en" | "ar")}>
              <option value="en">{t("bulkText.languageEn")}</option>
              <option value="ar">{t("bulkText.languageAr")}</option>
            </Select>
          </div>

          <div>
            <FieldLabel>{t("bulkText.termLabel")}</FieldLabel>
            <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={t("bulkText.termPlaceholder")} />
          </div>

          <div>
            <FieldLabel>{t("bulkText.replacementLabel")}</FieldLabel>
            <Input value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder={t("bulkText.replacementPlaceholder")} />
          </div>

          <Checkbox checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} label={t("bulkText.matchCase")} />
          <Checkbox checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} label={t("bulkText.wholeWord")} />

          <PrimaryButton label={busy ? t("bulkPrice.previewing") : t("bulkPrice.previewButton")} disabled={!canPreview || busy} onClick={() => void runPreview()} />
        </div>
      )}

      {step === "preview" && preview && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-[9px] bg-[#0D6EFD]/[0.06] py-3">
              <p className="text-[20px] font-bold text-[#0D6EFD]">{preview.totalMatchCount}</p>
              <p className="text-[11.5px] text-[var(--octo-text-secondary)]">{t("bulkText.matches")}</p>
            </div>
            <div className="rounded-[9px] bg-[var(--octo-track)] py-3">
              <p className="text-[20px] font-bold text-[var(--octo-text-secondary)]">{preview.changedFieldCount}</p>
              <p className="text-[11.5px] text-[var(--octo-text-secondary)]">{t("bulkText.fields")}</p>
            </div>
          </div>

          {preview.samples.length > 0 && (
            <div className="max-h-[220px] space-y-1.5 overflow-y-auto">
              {preview.samples.map((s, i) => (
                <div key={`${s.entityId}-${s.fieldName}-${i}`} className="flex items-center justify-between rounded-[8px] bg-[var(--octo-hover)] px-3 py-1.5 text-[12.5px]">
                  <span className="text-[var(--octo-text-primary)]">
                    {s.entityKind} · {s.fieldName}
                  </span>
                  <span className="font-semibold text-[var(--octo-text-secondary)]">
                    {t("bulkText.matchCount").replace("{n}", String(s.matchCount))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {preview.changedFieldCount === 0 ? (
            <p className="text-center text-[12.5px] text-[var(--octo-text-muted)]">{t("bulkText.nothingToChange")}</p>
          ) : (
            <PrimaryButton label={busy ? t("bulkPrice.applying") : t("bulkPrice.applyButton")} disabled={busy} onClick={() => void apply()} />
          )}
          <button type="button" onClick={reset} className="w-full text-center text-[12.5px] text-[var(--octo-text-secondary)] hover:underline">
            {t("bulkPrice.back")}
          </button>
        </div>
      )}

      {step === "result" && (
        <div className="mt-4 text-center">
          <p className="text-[15px] font-semibold text-[var(--octo-text-primary)]">
            {t("bulkText.resultTitle").replace("{n}", String(resultCount))}
          </p>
          <PrimaryButton label={t("orders.result.done")} onClick={close} className="mt-4" />
        </div>
      )}

      <BulkHistory kind="TextReplacement" reloadKey={step === "result" ? 1 : 0} />
    </Modal>
  );
}
