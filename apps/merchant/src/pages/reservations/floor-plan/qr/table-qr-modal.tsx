// One table's code: status, the code itself, its details and activity, and
// what can be done with it (Figma 2012:190694).
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  disablePlaceCodes,
  enablePlaceCodes,
  getPlaceCode,
  regeneratePlaceCode,
  revokePlaceCode,
  type PlaceCodeDetail,
} from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import type { FloorPlanDoc, FloorTable } from "@/entities/floor-plan";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { useI18n } from "@/app/providers/i18n-provider";
import { BORDER_200, TEXT_SECONDARY } from "../../_shared/theme";
import { ActivityList } from "./activity-list";
import { ConfirmDialog } from "./confirm-dialog";
import { DetailBox, DetailRow, formatDate, ServerSymbol, tableMeta } from "./parts";
import { toQrStatus } from "./place-codes-model";
import type { QrDesign } from "./print";
import { exportCodes, printCodes } from "./print-codes";
import {
  BTN_MODAL_DANGER,
  BTN_MODAL_OUTLINE,
  BTN_MODAL_PRIMARY,
  BTN_MODAL_WARNING,
  QR_BANNER,
  QR_STATUS_TEXT,
  TEXT_BLACK,
} from "./theme";
import type { Notify, PlaceCodesState } from "./use-place-codes";

type Action = "disable" | "enable" | "regenerate" | "revoke";

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : null);

export function TableQrModal({
  doc,
  table,
  pc,
  design,
  notify,
  onClose,
  onGenerate,
  onRelink,
}: {
  doc: FloorPlanDoc;
  table: FloorTable | null;
  pc: PlaceCodesState;
  design: QrDesign;
  notify: Notify;
  onClose: () => void;
  onGenerate: () => void;
  /** Present once re-linking is available; opens the table picker for this code. */
  onRelink?: (codeId: string) => void;
}) {
  const { t, locale } = useI18n();
  const row = table ? pc.rows.get(table.id) : undefined;
  const codeId = row?.codeId ?? null;
  const status = row ? toQrStatus(row.status) : "notGenerated";
  const [detail, setDetail] = useState<PlaceCodeDetail | null>(null);
  const [tab, setTab] = useState<"details" | "activity">("details");
  const [ask, setAsk] = useState<null | "regenerate" | "revoke">(null);
  const [pending, setPending] = useState(false);
  // One operation id per confirmed action, reused if that action is retried.
  const opId = useRef<{ kind: Action; id: string } | null>(null);

  useEffect(() => {
    setTab("details");
  }, [table?.id]);

  useEffect(() => {
    setDetail(null);
    if (!codeId) return;
    let alive = true;
    getPlaceCode(pc.businessId, codeId)
      .then((d) => alive && setDetail(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [pc.businessId, codeId, row?.revision]);

  async function act(kind: Action) {
    if (!codeId || !table || pending) return;
    if (opId.current?.kind !== kind) opId.current = { kind, id: crypto.randomUUID() };
    const id = opId.current.id;
    const rev = row?.revision ?? undefined;
    setPending(true);
    try {
      const target = { codes: [{ codeId, expectedRevision: rev }] };
      if (kind === "disable") await pc.run((b) => disablePlaceCodes(b, id, target));
      if (kind === "enable") await pc.run((b) => enablePlaceCodes(b, id, target));
      if (kind === "regenerate") await pc.run((b) => regeneratePlaceCode(b, codeId, id, rev));
      if (kind === "revoke") await pc.run((b) => revokePlaceCode(b, codeId, id, rev));
      opId.current = null;
      setAsk(null);
      notify(t(`floorPlan.qr.done.${kind}`).replace("{number}", table.number), kind === "revoke" || kind === "disable" ? "info" : "success");
      if (kind === "revoke") onClose();
    } catch {
      // run() toasted and refreshed; the dialog stays for a retry.
    } finally {
      setPending(false);
    }
  }

  const printable = status === "active" || status === "reprint";

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
              {codeId ? (
                <ServerSymbol businessId={pc.businessId} codeId={codeId} version={row?.version} size={160} dimmed={status === "disabled"} />
              ) : (
                <span className={clsx("text-center text-[14px] font-medium", TEXT_SECONDARY)}>{t("floorPlan.qr.noCode")}</span>
              )}
            </div>
          </div>

          {codeId && (
            <div className={clsx("flex gap-1 self-start rounded-[10px] border p-1", BORDER_200)} role="tablist">
              {(["details", "activity"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={clsx(
                    "h-8 rounded-[8px] px-3 text-[14px] font-medium",
                    tab === id ? "bg-[#0d6efd] text-white" : clsx(TEXT_SECONDARY, "hover:bg-[#f5f9ff] [[data-theme=dark]_&]:hover:bg-[var(--octo-selected)]")
                  )}
                >
                  {t(`floorPlan.qr.tab.${id}`)}
                </button>
              ))}
            </div>
          )}

          {tab === "activity" && codeId ? (
            <ActivityList pc={pc} codeId={codeId} revision={row?.revision} />
          ) : (
          <DetailBox title={t("floorPlan.qr.details")}>
            <DetailRow label={t("floorPlan.qr.field.status")} valueClassName={QR_STATUS_TEXT[status]}>
              {t(`floorPlan.qr.status.${status}`)}
              {detail?.neverPrinted && (
                <span className="ms-2 rounded-full bg-[#fef3c7] px-2 py-0.5 text-[11px] text-[#92400e] [[data-theme=dark]_&]:bg-[#92400e]/30 [[data-theme=dark]_&]:text-[#fcd34d]">
                  {t("floorPlan.qr.neverPrinted")}
                </span>
              )}
            </DetailRow>
            <DetailRow label={t("floorPlan.qr.field.version")}>{detail?.version ?? row?.version ?? "—"}</DetailRow>
            <DetailRow label={t("floorPlan.qr.field.generatedAt")}>
              {formatDate(ms(detail?.generatedAtUtc ?? row?.generatedAtUtc), locale)}
              {detail?.generatedBy ? ` · ${detail.generatedBy}` : ""}
            </DetailRow>
            <DetailRow label={t("floorPlan.qr.field.printedCount")}>{detail?.printedCount ?? 0}</DetailRow>
            <DetailRow label={t("floorPlan.qr.field.lastPrinted")}>
              {formatDate(ms(detail?.lastPrintedAtUtc), locale, true)}
              {detail?.lastPrintedBy ? ` · ${detail.lastPrintedBy}` : ""}
            </DetailRow>
            {detail?.address && (
              <DetailRow label={t("floorPlan.qr.field.address")}>
                <span className="inline-flex max-w-[360px] items-center gap-2" dir="ltr">
                  <span className="truncate">{detail.address}</span>
                  <button
                    type="button"
                    className="shrink-0 text-[12px] font-semibold text-[#0d6efd] [[data-theme=dark]_&]:text-[var(--octo-accent)]"
                    onClick={() => {
                      void navigator.clipboard?.writeText(detail.address!).then(() => notify(t("floorPlan.qr.copied")));
                    }}
                  >
                    {t("floorPlan.qr.copy")}
                  </button>
                </span>
              </DetailRow>
            )}
          </DetailBox>
          )}

          <div className="flex flex-col gap-4">
            {!codeId ? (
              <button type="button" onClick={onGenerate} className={BTN_MODAL_PRIMARY}>
                {t("floorPlan.qr.generate")}
              </button>
            ) : (
              detail?.address && (
                <a href={detail.address} target="_blank" rel="noreferrer" className={BTN_MODAL_PRIMARY} aria-disabled={status === "disabled"}>
                  {t("floorPlan.qr.test")}
                </a>
              )
            )}
            <div className="grid grid-cols-2 gap-6">
              <button type="button" disabled={!printable} onClick={() => void printCodes(pc, doc, [table], design, t, notify)} className={BTN_MODAL_OUTLINE}>
                {t("floorPlan.qr.printThis")}
              </button>
              <button type="button" disabled={!codeId} onClick={() => void exportCodes(pc, [table], t, notify)} className={BTN_MODAL_OUTLINE}>
                {t("floorPlan.qr.download")}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <button
                type="button"
                disabled={!codeId || pending}
                onClick={() => void act(status === "disabled" ? "enable" : "disable")}
                className={BTN_MODAL_DANGER}
              >
                {t(status === "disabled" ? "floorPlan.qr.enable" : "floorPlan.qr.disable")}
              </button>
              <button type="button" disabled={!codeId || pending} onClick={() => setAsk("regenerate")} className={BTN_MODAL_WARNING}>
                {t("floorPlan.qr.regenerate")}
              </button>
            </div>
            {codeId && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                {onRelink ? (
                  <button type="button" disabled={pending} onClick={() => onRelink(codeId)} className="text-[14px] font-semibold text-[#0d6efd] disabled:opacity-50 [[data-theme=dark]_&]:text-[var(--octo-accent)]">
                    {t("floorPlan.qr.moveToTable")}
                  </button>
                ) : (
                  <span />
                )}
                <button type="button" disabled={pending} onClick={() => setAsk("revoke")} className="text-[14px] font-semibold text-[#d30202] disabled:opacity-50 [[data-theme=dark]_&]:text-[#f87171]">
                  {t("floorPlan.qr.revoke")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={ask !== null}
        title={ask ? t(`floorPlan.qr.confirm.${ask}.title`) : ""}
        body={ask ? t(`floorPlan.qr.confirm.${ask}.body`) : ""}
        confirmLabel={ask === "revoke" ? t("floorPlan.qr.revoke") : t("floorPlan.qr.regenerate")}
        cancelLabel={t("floorPlan.common.cancel")}
        tone={ask === "revoke" ? "danger" : "warning"}
        pending={pending}
        onConfirm={() => ask && void act(ask)}
        onCancel={() => {
          setAsk(null);
          opId.current = null;
        }}
      />
    </Modal>
  );
}
