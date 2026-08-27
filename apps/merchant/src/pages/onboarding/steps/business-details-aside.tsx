// The panel beside step 4. Brand tone and menu categories come from the chosen
// business type; the identity preview is the merchant's own logo and colour,
// so it updates as they pick.
import { Sparkles } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { brandToneFor, serviceCategoriesFor } from "../_shared/ai-insights";
import { readableOn } from "../_shared/brand-catalog";
import type { StepProps } from "../_shared/steps";

export function BusinessDetailsAside({ draft }: StepProps) {
  const { t } = useI18n();
  const { brand } = draft;
  const tones = brandToneFor(draft.type);
  const categories = serviceCategoriesFor(draft.type);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-hover)] p-4">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0D6EFD]">
        <Sparkles size={12} />
        {t("onboarding.aside.assistant.title")}
      </h3>
      <p className="text-[13.5px] font-bold leading-snug text-[var(--octo-text-primary)]">
        {t("onboarding.aside.assistant.lead")}
      </p>

      <div className="rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3">
        <p className="text-[11px] font-semibold text-[var(--octo-text-primary)]">{t("onboarding.aside.brandTone")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tones.map((key) => (
            <span key={key} className="rounded-full bg-[var(--octo-selected)] px-2 py-0.5 text-[10.5px] text-[#0D6EFD]">
              {t(key)}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3">
        <p className="text-[11px] font-semibold text-[var(--octo-text-primary)]">{t("onboarding.aside.serviceCategories")}</p>
        <ul className="mt-2 flex flex-col gap-1">
          {categories.map((key) => (
            <li key={key} className="text-[10.5px] text-[var(--octo-text-muted)]">{t(key)}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3">
        <p className="text-[11px] font-semibold text-[var(--octo-text-primary)]">{t("onboarding.aside.publicIdentity")}</p>
        <div
          className="mt-2 grid h-20 place-items-center rounded-[8px]"
          style={{ background: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.secondary} 100%)` }}
        >
          {brand.logoDataUrl ? (
            <img src={brand.logoDataUrl} alt="" className="max-h-14 max-w-[70%] object-contain" />
          ) : (
            // The gradient runs primary -> secondary; the merchant may pick a
            // very light primary, so this label follows the same contrast rule
            // every other merchant-coloured surface uses instead of assuming
            // white reads.
            <span className="px-3 text-center text-[13px] font-bold" style={{ color: readableOn(brand.primary) }}>
              {brand.businessName || t("onboarding.businessName")}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
