"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { isValidPromoCode } from "@/shared/lib/pricing";
import { TableIcon } from "@/shared/ui/table";

const TONES = {
  idle: {
    field: "border-gray-300",
    button: "bg-gray-200 text-[var(--octo-store-select-label)]",
  },
  applied: {
    field: "border-[var(--octo-store-success)]",
    button: "bg-[var(--octo-store-success)] text-white",
  },
  failed: {
    field: "border-[var(--octo-store-danger)]",
    button: "bg-[var(--octo-store-danger)] text-white/80",
  },
} as const;

/** The discount code field on the payment summary, in its three drawn states:
 *  waiting for a code, applied, and refused. */
export function TablePromoField() {
  const { t } = useI18n();
  const { state, applyPromo } = useOrderingSession();
  const [code, setCode] = useState(state.promoCode ?? "");
  const [failed, setFailed] = useState(false);

  // The session is restored from storage after the first paint, so a code
  // applied before a reload arrives late — the field picks it up here.
  useEffect(() => {
    if (state.promoCode) setCode(state.promoCode);
  }, [state.promoCode]);

  const tone = failed ? "failed" : state.promoCode ? "applied" : "idle";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    if (!isValidPromoCode(trimmed)) {
      applyPromo(null);
      setFailed(true);
      return;
    }
    setFailed(false);
    applyPromo(trimmed.toUpperCase());
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
      <div className="flex h-12 w-full">
        <input
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setFailed(false);
            // An edited code is no longer the one the discount was granted for.
            if (state.promoCode) applyPromo(null);
          }}
          placeholder={t("store.cart.promoPlaceholder")}
          aria-label={t("store.cart.promoPlaceholder")}
          aria-invalid={failed}
          className={`min-w-0 flex-1 border bg-transparent px-4 text-[14px] leading-none text-gray-900 outline-none placeholder:text-[var(--octo-store-body)] ${TONES[tone].field}`}
        />
        <button
          type="submit"
          className={`w-[103px] shrink-0 rounded-e-[24px] text-[16px] font-bold leading-none ${TONES[tone].button}`}
        >
          {t(tone === "applied" ? "store.table.promoDone" : "store.cart.promoApply")}
        </button>
      </div>

      {tone !== "idle" && (
        <p
          aria-live="polite"
          className={`flex items-start gap-1 text-[12px] font-medium leading-[14px] ${
            tone === "applied" ? "text-[var(--octo-store-success)]" : "text-[var(--octo-store-danger)]"
          }`}
        >
          <TableIcon name={tone === "applied" ? "promo-ok" : "promo-error"} size={16} />
          {t(tone === "applied" ? "store.table.promoSuccess" : "store.table.promoExpired")}
        </p>
      )}
    </form>
  );
}
