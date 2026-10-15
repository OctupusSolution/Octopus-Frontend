"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/app/providers";
import { TableButton } from "@/shared/ui/table";

/** "code": unknown, revoked or replaced — the backend does not say which, and neither does the page. */
export type PlaceUnavailableReason = "code" | "place" | "menu" | "item" | "error";

/** A scanned code that cannot be ordered from right now, said plainly. */
export function PlaceUnavailableView({ reason, backHref }: { reason: PlaceUnavailableReason; backHref?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const canRetry = reason === "menu" || reason === "error";
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-[var(--octo-store-select)] text-[28px] font-bold text-[var(--octo-store-select-text)]">
        !
      </span>
      <h1 className="text-[20px] font-bold leading-[1.3] text-gray-900">{t(`store.place.unavailable.${reason}.title`)}</h1>
      <p className="text-[14px] font-medium leading-[1.5] text-gray-600">{t(`store.place.unavailable.${reason}.body`)}</p>
      {canRetry && (
        <div className="w-full max-w-[280px]">
          <TableButton onClick={() => router.refresh()}>{t("store.place.retry")}</TableButton>
        </div>
      )}
      {backHref && (
        <Link href={backHref} className="text-[14px] font-semibold text-[var(--octo-store-select-text)] underline">
          {t("store.place.backToMenu")}
        </Link>
      )}
    </div>
  );
}
