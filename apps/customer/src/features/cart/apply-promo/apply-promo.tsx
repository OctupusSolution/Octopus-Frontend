"use client";

import { useState } from "react";
import { Button, Input } from "@ui/primitives";
import { useOrderingSession } from "@/entities/order";
import { isValidPromoCode } from "@/shared/lib/pricing";

export function ApplyPromo() {
  const { state, applyPromo } = useOrderingSession();
  const [code, setCode] = useState(state.promoCode ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleApply() {
    const trimmed = code.trim();
    if (!trimmed) {
      applyPromo(null);
      setError(null);
      return;
    }
    if (!isValidPromoCode(trimmed)) {
      setError("كود غير صالح أو منتهي الصلاحية");
      return;
    }
    setError(null);
    applyPromo(trimmed.toUpperCase());
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2">
        <Input
          label="كود الخصم"
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setError(null);
          }}
          className="flex-1"
        />
        <Button variant="secondary" onClick={handleApply}>
          تطبيق
        </Button>
      </div>
      {error && <p className="text-[11px] text-[#EF4444]">{error}</p>}
    </div>
  );
}
