// Moving a printed code to the table it now sits on: pick that table on the
// plan. The server refuses a table that already holds a code of its own.
import { useRef, useState } from "react";
import clsx from "clsx";
import { relinkPlaceCode } from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import type { FloorPlanDoc, FloorTable } from "@/entities/floor-plan";
import { useI18n } from "@/app/providers/i18n-provider";
import { TEXT_SECONDARY } from "../../_shared/theme";
import { QrPlan } from "./qr-plan";
import { BTN_MODAL_OUTLINE, BTN_MODAL_PRIMARY, TEXT_BLACK } from "./theme";
import type { Notify, PlaceCodesState } from "./use-place-codes";

export function RelinkModal({
  doc,
  pc,
  codeId,
  revision,
  notify,
  onClose,
}: {
  doc: FloorPlanDoc;
  pc: PlaceCodesState;
  codeId: string;
  revision?: number;
  notify: Notify;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [picked, setPicked] = useState<FloorTable | null>(null);
  const [pending, setPending] = useState(false);
  const opId = useRef<{ target: string; id: string } | null>(null);

  async function confirm() {
    if (!picked || pending) return;
    const resourceId = pc.rows.get(picked.id)?.resourceId ?? picked.id;
    if (opId.current?.target !== resourceId) opId.current = { target: resourceId, id: crypto.randomUUID() };
    const id = opId.current.id;
    setPending(true);
    try {
      await pc.run((b) => relinkPlaceCode(b, codeId, id, resourceId, revision));
      notify(t("floorPlan.qr.relink.done").replace("{number}", picked.number));
      onClose();
    } catch {
      // run() toasted (a taken table says so) and refreshed.
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open onClose={onClose} className="max-w-[900px] !rounded-[32px] !p-0">
      <div className="flex max-h-[calc(100vh-2rem)] flex-col gap-4 bg-white p-6 [[data-theme=dark]_&]:bg-[var(--octo-card)]">
        <header className="flex flex-col gap-2">
          <h2 className={clsx("text-[24px] font-semibold leading-[24px]", TEXT_BLACK)}>{t("floorPlan.qr.relink.title")}</h2>
          <p className={clsx("text-[14px] leading-[1.4]", TEXT_SECONDARY)}>{t("floorPlan.qr.relink.hint")}</p>
        </header>
        <QrPlan
          doc={doc}
          statusOf={pc.statusOf}
          selectedIds={picked ? new Set([picked.id]) : undefined}
          onTable={setPicked}
          className="h-[420px]"
        />
        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={onClose} disabled={pending} className={BTN_MODAL_OUTLINE}>
            {t("floorPlan.common.cancel")}
          </button>
          <button type="button" onClick={() => void confirm()} disabled={!picked || pending} className={BTN_MODAL_PRIMARY}>
            {picked ? t("floorPlan.qr.relink.confirm").replace("{number}", picked.number) : t("floorPlan.qr.relink.pick")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
