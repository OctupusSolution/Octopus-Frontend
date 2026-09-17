// apps/merchant/src/pages/customers/_shared/row-actions-menu.tsx
import { useEffect, useRef } from "react";
import { useI18n } from "@/app/providers/i18n-provider";
import type { CustomerRecord } from "./types";

export type RowActionId = "addNote" | "history" | "sendWhatsapp" | "sendEmail" | "addTag" | "toggleBlock" | "delete";

export function RowActionsMenu({
  anchor,
  customer,
  onAction,
  onClose,
}: {
  anchor: HTMLElement;
  customer: CustomerRecord;
  onAction: (action: RowActionId) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node) && !anchor.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [anchor, onClose]);

  const rect = anchor.getBoundingClientRect();
  const items: { id: RowActionId; label: string; danger?: boolean }[] = [
    { id: "addNote", label: t("customers.rowAction.addNote") },
    { id: "history", label: t("customers.rowAction.history") },
    { id: "sendWhatsapp", label: t("customers.rowAction.sendWhatsapp") },
    { id: "sendEmail", label: t("customers.rowAction.sendEmail") },
    { id: "addTag", label: t("customers.rowAction.addTag") },
    { id: "toggleBlock", label: t(customer.isBlocked ? "customers.rowAction.unblock" : "customers.rowAction.block") },
    { id: "delete", label: t("customers.rowAction.delete"), danger: true },
  ];

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 w-[200px] rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1.5 shadow-lg"
      style={{ top: rect.bottom + 6, left: rect.left }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          onClick={() => { onAction(item.id); onClose(); }}
          className={`flex w-full items-center rounded-[8px] px-2.5 py-1.5 text-start text-[12.5px] transition-colors hover:bg-[var(--octo-hover)] ${
            item.danger ? "text-[#EF4444]" : "text-[var(--octo-text-primary)]"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
