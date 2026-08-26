"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/app/providers";

/** /orders had no page of its own — only /orders/[id] — so the nav's tracking
 *  link 404'd. This is the way in: an order number, then the existing
 *  tracking screen. */
export function TrackOrderForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [orderId, setOrderId] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = orderId.trim();
    if (trimmed) router.push(`/orders/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{t("store.track.prompt")}</p>

      <div className="flex overflow-hidden rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)]">
        <input
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
          placeholder={t("store.track.placeholder")}
          aria-label={t("store.track.placeholder")}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[12.5px] outline-none placeholder:text-[var(--octo-text-faint)]"
        />
        <button
          type="submit"
          disabled={orderId.trim() === ""}
          className="shrink-0 bg-[#0D6EFD] px-5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {t("store.track.submit")}
        </button>
      </div>
    </form>
  );
}
