// Who printed or exported which codes, and when; each run's ZIP can be
// downloaded again (its file names come from the run's own snapshot).
import { useEffect, useState } from "react";
import clsx from "clsx";
import { getPlaceCodeBundle, listPlaceCodePrintRuns, type PlaceCodePrintRun } from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { BORDER_200, TEXT_PRIMARY, TEXT_SECONDARY } from "../../_shared/theme";
import { formatDate } from "./parts";
import { errorKey } from "./place-codes-model";
import { downloadBlob } from "./qr-store";
import { BTN_MODAL_OUTLINE, TEXT_BLACK } from "./theme";
import type { Notify, PlaceCodesState } from "./use-place-codes";

const PAGE_SIZE = 25;

export function PrintHistoryModal({ pc, notify, onClose }: { pc: PlaceCodesState; notify: Notify; onClose: () => void }) {
  const { t, locale } = useI18n();
  const [page, setPage] = useState(1);
  const [runs, setRuns] = useState<PlaceCodePrintRun[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setRuns(null);
    setFailed(false);
    listPlaceCodePrintRuns(pc.businessId, page)
      .then((res) => {
        if (!alive) return;
        setRuns(res.data ?? []);
        setTotal(res.metadata?.totalCount ?? null);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [pc.businessId, page]);

  async function download(run: PlaceCodePrintRun) {
    setDownloading(run.runId);
    try {
      const { blob, fileName } = await getPlaceCodeBundle(pc.businessId, run.runId);
      downloadBlob(fileName ?? `print-run-${run.runId.slice(0, 8)}.zip`, blob);
    } catch (e) {
      notify(t(errorKey(e)), "error");
    } finally {
      setDownloading(null);
    }
  }

  const hasNext = total !== null ? page * PAGE_SIZE < total : (runs?.length ?? 0) >= PAGE_SIZE;
  const cell = clsx("px-3 py-2 text-start text-[13px]", TEXT_PRIMARY);
  const head = clsx("px-3 py-2 text-start text-[12px] font-medium", TEXT_SECONDARY);
  const pager = clsx("grid h-9 w-9 place-items-center rounded-[8px] border text-[18px] disabled:opacity-40", BORDER_200, TEXT_PRIMARY);

  return (
    <Modal open onClose={onClose} className="max-w-[680px] !rounded-[32px] !p-0">
      <div className="flex max-h-[calc(100vh-2rem)] flex-col gap-4 bg-white p-6 [[data-theme=dark]_&]:bg-[var(--octo-card)]">
        <h2 className={clsx("text-[24px] font-semibold leading-[24px]", TEXT_BLACK)}>{t("floorPlan.qr.history.title")}</h2>
        {failed ? (
          <p className={clsx("text-[14px]", TEXT_SECONDARY)}>{t("floorPlan.qr.error.generic")}</p>
        ) : runs === null ? (
          <div className="h-32 animate-pulse rounded-[12px] bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[var(--octo-border-card)]" />
        ) : runs.length === 0 ? (
          <p className={clsx("py-8 text-center text-[14px]", TEXT_SECONDARY)}>{t("floorPlan.qr.history.empty")}</p>
        ) : (
          <div className={clsx("octo-scroll overflow-auto rounded-[8px] border", BORDER_200)}>
            <table className="w-full">
              <thead>
                <tr className={clsx("border-b", BORDER_200)}>
                  <th className={head}>{t("floorPlan.qr.history.when")}</th>
                  <th className={head}>{t("floorPlan.qr.history.by")}</th>
                  <th className={head}>{t("floorPlan.qr.history.count")}</th>
                  <th className={head}>{t("floorPlan.qr.history.format")}</th>
                  <th className={head} />
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.runId} className={clsx("border-b last:border-b-0", BORDER_200)}>
                    <td className={cell}>{formatDate(Date.parse(run.printedAtUtc), locale, true)}</td>
                    <td className={cell} dir="auto">{run.printedBy ?? "—"}</td>
                    <td className={cell}>{run.itemCount}</td>
                    <td className={cell}>{run.format.toUpperCase()}</td>
                    <td className="px-3 py-1 text-end">
                      <button
                        type="button"
                        disabled={downloading !== null}
                        onClick={() => void download(run)}
                        className={clsx(BTN_MODAL_OUTLINE, "h-8 text-[13px]")}
                      >
                        {t("floorPlan.qr.download")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(page > 1 || hasNext) && (
          <div className="flex items-center justify-center gap-3">
            <button type="button" className={pager} disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="‹">‹</button>
            <span className={clsx("text-[12px]", TEXT_PRIMARY)}>{page}</span>
            <button type="button" className={pager} disabled={!hasNext} onClick={() => setPage(page + 1)} aria-label="›">›</button>
          </div>
        )}
      </div>
    </Modal>
  );
}
