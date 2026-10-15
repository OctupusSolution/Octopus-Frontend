// A yes/no question before an action that a printed sticker cannot survive.
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import { TEXT_SECONDARY } from "../../_shared/theme";
import { BTN_MODAL_DANGER, BTN_MODAL_OUTLINE, BTN_MODAL_WARNING, TEXT_BLACK } from "./theme";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone,
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: "danger" | "warning";
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} className="max-w-[420px] !rounded-[24px] !p-0">
      <div className="flex flex-col gap-4 bg-white p-6 [[data-theme=dark]_&]:bg-[var(--octo-card)]">
        <h2 className={clsx("text-[20px] font-semibold leading-[1.2]", TEXT_BLACK)}>{title}</h2>
        <p className={clsx("text-[14px] leading-[1.5]", TEXT_SECONDARY)}>{body}</p>
        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={onCancel} disabled={pending} className={BTN_MODAL_OUTLINE}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={pending} className={tone === "danger" ? BTN_MODAL_DANGER : BTN_MODAL_WARNING}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
