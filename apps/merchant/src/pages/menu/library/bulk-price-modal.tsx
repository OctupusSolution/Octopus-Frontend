// Bulk price adjustment for one menu: BACKEND_GAPS.md-adjacent (menu-admin
// "Bulk Editing" endpoints) — preview/execute were ready and wired nowhere.
// Scoped to BulkScopeKind.Menus (this one menu's catalog items) rather than
// the full All/Sections/Items/ModifierGroups/Offers surface the API
// supports — the common "raise everything on this menu by X%" case, not a
// general bulk-editing console.
//
// The API itself forces the safe two-step shape: preview() returns a token
// tied to the exact request, and execute() is refused without it — so
// there's no way to apply an adjustment the merchant hasn't previewed.
import { useState, type ReactNode } from "react";
import { Percent, TrendingDown, TrendingUp } from "lucide-react";
import { Checkbox, Input, Modal } from "@ui/primitives";
import {
  ApiError,
  executePriceAdjustment,
  previewPriceAdjustment,
  type PriceAdjustmentPreviewResponse,
} from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { BulkHistory } from "./bulk-history";
import { useI18n } from "@/app/providers/i18n-provider";
import type { Menu } from "@/entities/menu";

const key = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

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

type Kind = "Amount" | "Percent";
type Direction = "Increase" | "Decrease";
type Step = "form" | "preview" | "result";

export function BulkPriceModal({ menu, onClose }: { menu: Menu | null; onClose: () => void }) {
  const { t } = useI18n();
  const { activeBusinessId } = useAuth();
  const [kind, setKind] = useState<Kind>("Percent");
  const [direction, setDirection] = useState<Direction>("Increase");
  const [value, setValue] = useState("10");
  const [includeOfferPrices, setIncludeOfferPrices] = useState(true);
  const [confirmZeroPrices, setConfirmZeroPrices] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [preview, setPreview] = useState<PriceAdjustmentPreviewResponse | null>(null);
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
    setKind("Percent");
    setDirection("Increase");
    setValue("10");
    setIncludeOfferPrices(true);
    setConfirmZeroPrices(false);
    onClose();
  }

  if (!menu) return null;

  function describe(err: unknown): string {
    return err instanceof ApiError ? (err.problem?.detail ?? err.problem?.errorCode ?? err.message) : "Request failed";
  }

  const numericValue = Number(value);
  const canPreview = activeBusinessId && Number.isFinite(numericValue) && numericValue > 0 && (kind === "Amount" || numericValue <= 100);

  async function runPreview() {
    if (!activeBusinessId || !menu || !canPreview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await previewPriceAdjustment(activeBusinessId, {
        businessId: activeBusinessId,
        scope: { kind: "Menus", ids: [menu.id] },
        adjustmentKind: kind,
        direction,
        value: numericValue,
        includeOptionAmounts: true,
        includeOfferPrices,
        confirmZeroPrices,
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
    if (!activeBusinessId || !menu || !preview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await executePriceAdjustment(
        activeBusinessId,
        {
          businessId: activeBusinessId,
          scope: { kind: "Menus", ids: [menu.id] },
          adjustmentKind: kind,
          direction,
          value: numericValue,
          includeOptionAmounts: true,
          includeOfferPrices,
          confirmZeroPrices,
          previewToken: preview.previewToken,
        },
        key()
      );
      setResultCount(res.changedCount);
      setStep("result");
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={close} className="max-w-[520px]">
      <h2 className="text-[18px] font-semibold text-[var(--octo-text-primary)]">{t("bulkPrice.title")}</h2>
      <p className="mt-1 text-[13.5px] text-[var(--octo-text-secondary)]">{menu.name}</p>

      {error && (
        <p role="alert" className="mt-3 rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
          {error}
        </p>
      )}

      {step === "form" && (
        <div className="mt-4 space-y-4">
          <div>
            <FieldLabel>{t("bulkPrice.kindLabel")}</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {(["Percent", "Amount"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`flex items-center justify-center gap-1.5 rounded-[9px] border py-2 text-[13px] font-medium transition-colors ${
                    kind === k
                      ? "border-[#0D6EFD] bg-[#0D6EFD]/10 text-[#0D6EFD]"
                      : "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
                  }`}
                >
                  {k === "Percent" && <Percent size={13} />}
                  {t(k === "Percent" ? "bulkPrice.percent" : "bulkPrice.amount")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>{t("bulkPrice.directionLabel")}</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {(["Increase", "Decrease"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDirection(d)}
                  className={`flex items-center justify-center gap-1.5 rounded-[9px] border py-2 text-[13px] font-medium transition-colors ${
                    direction === d
                      ? "border-[#0D6EFD] bg-[#0D6EFD]/10 text-[#0D6EFD]"
                      : "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
                  }`}
                >
                  {d === "Increase" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {t(d === "Increase" ? "bulkPrice.increase" : "bulkPrice.decrease")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>{t(kind === "Percent" ? "bulkPrice.valuePercentLabel" : "bulkPrice.valueAmountLabel")}</FieldLabel>
            <Input type="number" min={0} max={kind === "Percent" ? 100 : undefined} step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>

          <Checkbox checked={includeOfferPrices} onChange={(e) => setIncludeOfferPrices(e.target.checked)} label={t("bulkPrice.includeOffers")} />
          <Checkbox checked={confirmZeroPrices} onChange={(e) => setConfirmZeroPrices(e.target.checked)} label={t("bulkPrice.confirmZero")} />

          <PrimaryButton label={busy ? t("bulkPrice.previewing") : t("bulkPrice.previewButton")} disabled={!canPreview || busy} onClick={() => void runPreview()} />
        </div>
      )}

      {step === "preview" && preview && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-[9px] bg-[#0D6EFD]/[0.06] py-3">
              <p className="text-[20px] font-bold text-[#0D6EFD]">{preview.changedCount}</p>
              <p className="text-[11.5px] text-[var(--octo-text-secondary)]">{t("bulkPrice.changed")}</p>
            </div>
            <div className="rounded-[9px] bg-warning/10 py-3">
              <p className="text-[20px] font-bold text-warning">{preview.zeroCount}</p>
              <p className="text-[11.5px] text-[var(--octo-text-secondary)]">{t("bulkPrice.zero")}</p>
            </div>
            <div className="rounded-[9px] bg-[var(--octo-track)] py-3">
              <p className="text-[20px] font-bold text-[var(--octo-text-secondary)]">{preview.skippedCount}</p>
              <p className="text-[11.5px] text-[var(--octo-text-secondary)]">{t("bulkPrice.skipped")}</p>
            </div>
          </div>

          {preview.samples.length > 0 && (
            <div className="max-h-[220px] space-y-1.5 overflow-y-auto">
              {preview.samples.map((s, i) => (
                <div key={`${s.entityId}-${i}`} className="flex items-center justify-between rounded-[8px] bg-[var(--octo-hover)] px-3 py-1.5 text-[12.5px]">
                  <span className="text-[var(--octo-text-muted)]">{s.currentAmount.toFixed(2)} {s.currency}</span>
                  <span className="font-semibold text-[var(--octo-text-primary)]">{s.newAmount.toFixed(2)} {s.currency}</span>
                </div>
              ))}
            </div>
          )}

          {preview.changedCount === 0 ? (
            <p className="text-center text-[12.5px] text-[var(--octo-text-muted)]">{t("bulkPrice.nothingToChange")}</p>
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
            {t("bulkPrice.resultTitle").replace("{n}", String(resultCount))}
          </p>
          <PrimaryButton label={t("orders.result.done")} onClick={close} className="mt-4" />
        </div>
      )}

      <BulkHistory kind="PriceAdjustment" reloadKey={step === "result" ? 1 : 0} />
    </Modal>
  );
}
