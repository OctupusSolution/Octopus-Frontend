"use client";

import { Info, Wheat } from "lucide-react";
import type { AllergenId } from "@octopus/api-client";
import { useI18n } from "@/app/providers";

export interface AllergenPanelProps {
  allergens: AllergenId[];
}

export function AllergenPanel({ allergens }: AllergenPanelProps) {
  const { t } = useI18n();
  if (allergens.length === 0) return null;

  return (
    <section className="rounded-[20px] bg-[var(--octo-store-notice)] p-6">
      <h3 className="flex items-center gap-2 text-[17px] font-bold text-[#B45309]">
        <Info size={18} className="shrink-0 text-[#F59E0B]" aria-hidden="true" />
        {t("store.allergy.title")}
      </h3>

      <p className="mt-3 text-[12.5px] leading-[1.9] text-[var(--octo-text-secondary)]">
        {t("store.allergy.body")}
      </p>

      <p className="mt-4 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
        {t("store.allergy.contains")}
      </p>

      <ul className="mt-3 flex flex-wrap gap-5">
        {allergens.map((id) => (
          <li
            key={id}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#B45309]"
          >
            <Wheat size={15} className="shrink-0" aria-hidden="true" />
            {t(`store.allergen.${id}`)}
          </li>
        ))}
      </ul>
    </section>
  );
}
