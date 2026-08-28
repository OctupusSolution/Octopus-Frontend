"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { isValidPromoCode } from "@/shared/lib/pricing";

export function ApplyPromo() {
  const { t } = useI18n();
  const { state, applyPromo } = useOrderingSession();
  const [code, setCode] = useState(state.promoCode ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim();

    // An emptied field clears the applied code rather than complaining.
    if (!trimmed) {
      applyPromo(null);
      setError(null);
      return;
    }

    if (!isValidPromoCode(trimmed)) {
      setError(t("store.cart.promoInvalid"));
      return;
    }

    setError(null);
    applyPromo(trimmed.toUpperCase());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex overflow-hidden rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)]">
        <input
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setError(null);
          }}
          placeholder={t("store.cart.promoPlaceholder")}
          aria-label={t("store.cart.promoPlaceholder")}
          aria-invalid={error !== null}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[12px] text-[var(--octo-text-primary)] outline-none placeholder:text-[var(--octo-text-faint)]"
        />
        <button
          type="submit"
          className="shrink-0 bg-[var(--octo-track)] px-5 text-[12.5px] font-semibold text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
        >
          {t("store.cart.promoApply")}
        </button>
      </div>

      {error && <p className="text-[11px] text-[#EF4444]">{error}</p>}
    </form>
  );
}
