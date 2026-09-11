// The Offers section's inspector: five flat fields under one heading, no
// tabs and no numbered blocks — the simplest of the five hand-written panels.
import { Select } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { OffersSettings, SiteAction, SiteDraft } from "../../_shared/site-draft";
import { Switch } from "../../ui/switch";
import { FieldRow } from "./controls";

const DISPLAY_STYLE_OPTIONS = ["cardList", "grid", "carousel"] as const;
const SORT_ORDER_OPTIONS = ["dateEarliest", "dateLatest", "discount"] as const;
const CTA_BUTTON_OPTIONS = ["viewAllOffers", "claimNow", "none"] as const;
const VISIBILITY_OPTIONS = ["visibleHomepage", "hidden"] as const;

/** Module scope, so a keystroke elsewhere never remounts it. Opens on a real
 *  placeholder rather than a blank row. */
function OfferSelect({ value, options, onChange }: { value: string; options: readonly string[]; onChange: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>
        {t("publicLink.select.placeholder")}
      </option>
      {options.map((id) => (
        <option key={id} value={id}>
          {t(`publicLink.offers.${id}`)}
        </option>
      ))}
    </Select>
  );
}

export function OffersInspector({ draft, dispatch }: { draft: SiteDraft; dispatch: (action: SiteAction) => void }) {
  const { t } = useI18n();
  const settings = draft.sectionSettings.offers;

  function patch(patch: Partial<OffersSettings>) {
    dispatch({ type: "patchSection", section: "offers", patch });
  }

  return (
    <div className="flex flex-col gap-4">
      <FieldRow label={t("publicLink.offers.displayStyle")}>
        <OfferSelect value={settings.displayStyle} options={DISPLAY_STYLE_OPTIONS} onChange={(displayStyle) => patch({ displayStyle })} />
      </FieldRow>

      <FieldRow label={t("publicLink.offers.filterCategories")}>
        <div className="flex items-center justify-between rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2">
          <span className="text-[12.5px] text-[var(--octo-text-primary)]">
            {t(settings.filterCategories ? "publicLink.offers.on" : "publicLink.offers.off")}
          </span>
          <Switch
            checked={settings.filterCategories}
            onChange={() => patch({ filterCategories: !settings.filterCategories })}
            label={t("publicLink.offers.filterCategories")}
          />
        </div>
      </FieldRow>

      <FieldRow label={t("publicLink.offers.sortOrder")}>
        <OfferSelect value={settings.sortOrder} options={SORT_ORDER_OPTIONS} onChange={(sortOrder) => patch({ sortOrder })} />
      </FieldRow>

      <FieldRow label={t("publicLink.offers.ctaButton")}>
        <OfferSelect value={settings.ctaButton} options={CTA_BUTTON_OPTIONS} onChange={(ctaButton) => patch({ ctaButton })} />
      </FieldRow>

      <FieldRow label={t("publicLink.offers.visibility")}>
        <OfferSelect value={settings.visibility} options={VISIBILITY_OPTIONS} onChange={(visibility) => patch({ visibility })} />
      </FieldRow>
    </div>
  );
}
