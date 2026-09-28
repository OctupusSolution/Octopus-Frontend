"use client";

import { X } from "lucide-react";
import { useI18n } from "@/app/providers";
import type { EntryView } from "./menu-model";

export function ItemDetails({ entry, onClose }: { entry: EntryView | null; onClose: () => void }) {
  const { t } = useI18n();
  if (!entry) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-label={entry.name} onClick={onClose}>
      <div className="w-full max-w-[440px] overflow-hidden rounded-2xl bg-[var(--octo-card)]" onClick={(e) => e.stopPropagation()}>
        {entry.imageUrl && <img src={entry.imageUrl} alt="" className="h-[220px] w-full object-cover" />}
        <div className="flex flex-col gap-2 p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[18px] font-bold text-[var(--octo-text-primary)]">{entry.name}</h3>
            <button type="button" aria-label={t("store.menu.close")} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          {entry.kind === "item" && entry.description && <p className="text-[13.5px] leading-[1.8] text-[var(--octo-text-secondary)]">{entry.description}</p>}
          <p className="text-[16px] font-bold text-[var(--octo-store-price)]">{entry.price}</p>
          {!entry.available && <p className="text-[12px] font-semibold text-[var(--octo-text-muted)]">{t("store.menu.unavailable")}</p>}
        </div>
      </div>
    </div>
  );
}
