// apps/merchant/src/pages/customers/_shared/row-actions-menu.tsx
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useI18n } from "@/app/providers/i18n-provider";
import type { CustomerRecord } from "./types";

export type RowActionId = "addNote" | "history" | "sendWhatsapp" | "sendEmail" | "addTag" | "toggleBlock" | "delete";

const GAP = 6;
const ESTIMATED_ITEM_HEIGHT = 42;
const ITEM_COUNT = 7;

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
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node) && !anchor.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [anchor, onClose]);

  // `position: fixed` so the menu escapes any scrolling table/card container;
  // it anchors to the reading-direction "start" edge (never lets its 200px
  // width hang past a viewport edge) and flips above the trigger when there's
  // no room below. Mirrors staff/_shared/row-menu.tsx's positioning strategy.
  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect();
    const rtl = document.documentElement.dir === "rtl";
    const height = ITEM_COUNT * ESTIMATED_ITEM_HEIGHT + 16;
    const below = rect.bottom + GAP + height <= window.innerHeight;
    setStyle({
      position: "fixed",
      ...(below ? { top: rect.bottom + GAP } : { bottom: window.innerHeight - rect.top + GAP }),
      ...(rtl ? { left: rect.left } : { right: window.innerWidth - rect.right }),
    });
  }, [anchor]);

  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [onClose]);

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
      style={style}
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
