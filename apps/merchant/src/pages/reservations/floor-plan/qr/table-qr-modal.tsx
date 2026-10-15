// One table's code: status, the code itself, its details and print history,
// and what can be done with it (Figma 2012:190694).
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import type { FloorPlanDoc, FloorTable } from "@/entities/floor-plan";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { useI18n } from "@/app/providers/i18n-provider";
import { QrCode } from "../../../public-link/ui/qr-code";
import { TEXT_SECONDARY } from "../../_shared/theme";
import { DetailBox, DetailRow, formatDate, tableMeta } from "./parts";
import { qrValue, statusOf, type TableQr } from "./qr-store";
import {
  BTN_MODAL_DANGER,
  BTN_MODAL_OUTLINE,
  BTN_MODAL_PRIMARY,
  BTN_MODAL_WARNING,
  QR_BANNER,
  QR_STATUS_TEXT,
  TEXT_BLACK,
} from "./theme";

export function TableQrModal({
  doc,
  table,
  qr,
  onClose,
  onGenerate,
  onPrint,
  onDownload,
  onToggleDisabled,
  onRegenerate,
}: {
  doc: FloorPlanDoc;
  table: FloorTable | null;
  qr: TableQr | undefined;
  onClose: () => void;
  onGenerate: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onToggleDisabled: () => void;
  onRegenerate: () => void;
}) {
  const { t, locale } = useI18n();
  const status = statusOf(qr);
  return (
    <Modal open={table !== null} onClose={onClose} className="max-w-[738px] !rounded-[32px] !p-0">
      {table && (
        <div className="octo-scroll flex max-h-[calc(100vh-2rem)] flex-col gap-4 overflow-y-auto bg-white p-6 [[data-theme=dark]_&]:bg-[var(--octo-card)]">
          <h2 className={clsx("text-[24px] font-semibold leading-[24px]", TEXT_BLACK)} dir="auto">
            {t("floorPlan.qr.tableTitle").replace("{number}", table.number)}
          </h2>
          <div className="flex flex-col items-center gap-2">
            <div className="flex w-full items-center gap-1 px-1">
              <ShellIcon name="fp-qr-table-round.svg" size={16} className={TEXT_SECONDARY} />
              <span className={clsx("text-[12px] font-medium leading-[12px]", TEXT_SECONDARY)}>{tableMeta(doc, table, t)}</span>
            </div>
            <div className={clsx("flex w-full items-center gap-1 rounded-[12px] px-3 py-2", QR_BANNER[status])}>
              <ShellIcon name="fp-qr-completed.svg" size={24} />
              <span className="text-[14px] font-medium leading-[1.3]">{t(`floorPlan.qr.banner.${status}`)}</span>
            </div>
            <div className="grid h-[179px] w-[160px] place-items-center">
              {qr ? (
                <div className={clsx(qr.disabled && "opacity-40")}>
                  <QrCode value={qrValue(qr.code)} size={160} />
                </div>
              ) : (
                <span className={clsx("text-center text-[14px] font-medium", TEXT_SECONDARY)}>{t("floorPlan.qr.noCode")}</span>
              )}
            </div>
          </div>

          <DetailBox title={t("floorPlan.qr.details")}>
            <DetailRow label={t("floorPlan.qr.field.status")} valueClassName={QR_STATUS_TEXT[status]}>
              {t(`floorPlan.qr.status.${status}`)}
            </DetailRow>
            <DetailRow label={t("floorPlan.qr.field.id")}>{qr?.code ?? "—"}</DetailRow>
            <DetailRow label={t("floorPlan.qr.field.lastPrinted")}>{formatDate(qr?.lastPrintedAt ?? null, locale, true)}</DetailRow>
          </DetailBox>
          <DetailBox title={t("floorPlan.qr.performance")}>
            <DetailRow label={t("floorPlan.qr.field.totalScan")}>{qr?.scans ?? 0}</DetailRow>
            <DetailRow label={t("floorPlan.qr.field.printedCount")}>{qr?.printedCount ?? 0}</DetailRow>
            <DetailRow label={t("floorPlan.qr.field.generatedAt")}>{formatDate(qr?.generatedAt ?? null, locale)}</DetailRow>
            <DetailRow label={t("floorPlan.qr.field.firstScan")}>{formatDate(qr?.firstScanAt ?? null, locale)}</DetailRow>
            <DetailRow label={t("floorPlan.qr.field.lastScan")}>{formatDate(qr?.lastScanAt ?? null, locale, true)}</DetailRow>
          </DetailBox>

          <div className="flex flex-col gap-4">
            {qr ? (
              <a href={qrValue(qr.code)} target="_blank" rel="noreferrer" className={BTN_MODAL_PRIMARY} aria-disabled={qr.disabled}>
                {t("floorPlan.qr.test")}
              </a>
            ) : (
              <button type="button" onClick={onGenerate} className={BTN_MODAL_PRIMARY}>
                {t("floorPlan.qr.generate")}
              </button>
            )}
            <div className="grid grid-cols-2 gap-6">
              <button type="button" disabled={!qr || qr.disabled} onClick={onPrint} className={BTN_MODAL_OUTLINE}>
                {t("floorPlan.qr.printThis")}
              </button>
              <button type="button" disabled={!qr} onClick={onDownload} className={BTN_MODAL_OUTLINE}>
                {t("floorPlan.qr.download")}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <button type="button" disabled={!qr} onClick={onToggleDisabled} className={BTN_MODAL_DANGER}>
                {t(qr?.disabled ? "floorPlan.qr.enable" : "floorPlan.qr.disable")}
              </button>
              <button type="button" disabled={!qr} onClick={onRegenerate} className={BTN_MODAL_WARNING}>
                {t("floorPlan.qr.regenerate")}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
